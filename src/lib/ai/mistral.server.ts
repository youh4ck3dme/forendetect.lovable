/** Server-only Mistral client with explicit two-mode routing. */

export const MISTRAL_ENDPOINT = "https://api.mistral.ai/v1/chat/completions";
export const MISTRAL_MODELS_ENDPOINT = "https://api.mistral.ai/v1/models";
export const DEFAULT_FAST_MODEL = "mistral-small-latest";
export const DEFAULT_REASONING_MODEL = "magistral-medium-latest";

export type MistralMode = "fast" | "reasoning";
export type MistralMessage = { role: "system" | "user"; content: string };

export type MistralResult =
  | {
      status: "ok";
      content: string;
      usage: { prompt: number | null; completion: number | null };
      model: string;
      mode: MistralMode;
      fallback: boolean;
      requestId: string;
    }
  | {
      status: "not_configured" | "timeout" | "rate_limited" | "failed";
      message: string;
      retryAfterSeconds?: number;
      errorCode?: string;
      model?: string;
      mode?: MistralMode;
      fallback?: boolean;
      requestId?: string;
    };

const modelCache = new Map<string, { ids: Set<string>; expiresAt: number }>();

function modeKey(mode: MistralMode): string | undefined {
  return process.env[mode === "fast" ? "MISTRAL_API_KEY_FAST" : "MISTRAL_API_KEY_REASONING"];
}

export function mistralModel(mode: MistralMode = "fast"): string {
  if (mode === "fast") return process.env["MISTRAL_MODEL_FAST"] || DEFAULT_FAST_MODEL;
  return process.env["MISTRAL_MODEL_REASONING"] || DEFAULT_REASONING_MODEL;
}

export function mistralConfigured(mode?: MistralMode): boolean {
  if (mode) return Boolean(modeKey(mode));
  return Boolean(modeKey("fast") && modeKey("reasoning"));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelay(response: Response, attempt: number): number {
  const raw = response.headers.get("retry-after");
  const seconds = raw ? Number(raw) : Number.NaN;
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds, 30) * 1000;
  return Math.min(1000 * 2 ** attempt, 8000) + Math.floor(Math.random() * 250);
}

async function verifyModel(apiKey: string, model: string, fetchImpl: typeof fetch): Promise<MistralResult | null> {
  const cached = modelCache.get(apiKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.ids.has(model) ? null : { status: "failed", errorCode: "unsupported_model", message: `Model ${model} nie je pre tento Mistral účet dostupný.` };
  }
  const response = await fetchImpl(MISTRAL_MODELS_ENDPOINT, {
    headers: { authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { data?: Array<{ id?: string }> };
  const ids = new Set((body.data ?? []).flatMap((item) => item.id ? [item.id] : []));
  modelCache.set(apiKey, { ids, expiresAt: Date.now() + 15 * 60_000 });
  return ids.has(model) ? null : { status: "failed", errorCode: "unsupported_model", message: `Model ${model} nie je pre tento Mistral účet dostupný.` };
}

type CallOptions = {
  messages: MistralMessage[];
  mode?: MistralMode;
  maxTokens?: number;
  requestId?: string;
  allowFallback?: boolean;
  fetchImpl?: typeof fetch;
  sleepImpl?: (ms: number) => Promise<void>;
  skipModelVerification?: boolean;
};

async function callMode(options: CallOptions, mode: MistralMode, fallback: boolean): Promise<MistralResult> {
  const apiKey = modeKey(mode);
  const model = mistralModel(mode);
  const requestId = options.requestId ?? crypto.randomUUID();
  if (!apiKey) return { status: "not_configured", message: `Mistral režim ${mode} nie je nakonfigurovaný.`, mode, model, fallback, requestId };
  const doFetch = options.fetchImpl ?? fetch;
  if (!options.skipModelVerification) {
    const invalid = await verifyModel(apiKey, model, doFetch);
    if (invalid) return { ...invalid, mode, model, fallback, requestId };
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response;
    try {
      response = await doFetch(MISTRAL_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
          "x-client-request-id": requestId,
        },
        body: JSON.stringify({
          model,
          temperature: mode === "fast" ? 0.2 : 0.1,
          max_tokens: options.maxTokens ?? (mode === "fast" ? 900 : 4_000),
          response_format: { type: "json_object" },
          messages: options.messages,
        }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return { status: "timeout", errorCode: "aborted", message: "Volanie AI bolo prerušené.", mode, model, fallback, requestId };
      }
      return { status: "failed", errorCode: "network_error", message: "Spojenie s Mistral zlyhalo.", mode, model, fallback, requestId };
    }

    if (response.ok) {
      const body = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const content = body.choices?.[0]?.message?.content;
      if (!content?.trim()) return { status: "failed", errorCode: "empty_response", message: "Odpoveď AI bola prázdna.", mode, model, fallback, requestId };
      return {
        status: "ok", content, model, mode, fallback, requestId,
        usage: {
          prompt: typeof body.usage?.prompt_tokens === "number" ? body.usage.prompt_tokens : null,
          completion: typeof body.usage?.completion_tokens === "number" ? body.usage.completion_tokens : null,
        },
      };
    }

    if (response.status === 400 || response.status === 401 || response.status === 402 || response.status === 403) {
      const messages: Record<number, string> = {
        400: "Mistral odmietol neplatnú požiadavku.",
        401: "Mistral odmietol API kľúč.",
        402: "Mistral účet nemá dostupný kredit.",
        403: "Mistral kľúč nemá oprávnenie pre zvolený model.",
      };
      return { status: "failed", errorCode: `http_${response.status}`, message: messages[response.status] ?? `Mistral vrátil chybu ${response.status}.`, mode, model, fallback, requestId };
    }

    if (response.status === 429 || response.status >= 500) {
      const delay = retryDelay(response, attempt);
      if (attempt === 0) {
        await (options.sleepImpl ?? sleep)(delay);
        continue;
      }
      return {
        status: response.status === 429 ? "rate_limited" : "failed",
        errorCode: `http_${response.status}`,
        message: response.status === 429 ? "Mistral je dočasne vyťažený." : `Mistral vrátil prechodnú chybu ${response.status}.`,
        retryAfterSeconds: Math.ceil(delay / 1000), mode, model, fallback, requestId,
      };
    }
    return { status: "failed", errorCode: `http_${response.status}`, message: `Mistral vrátil chybu ${response.status}.`, mode, model, fallback, requestId };
  }
  return { status: "failed", errorCode: "unknown", message: "Mistral volanie zlyhalo.", mode, model, fallback, requestId };
}

export async function callMistral(options: CallOptions): Promise<MistralResult> {
  const mode = options.mode ?? "fast";
  const first = await callMode(options, mode, false);
  const transient = first.status !== "ok" && (first.status === "rate_limited" || first.errorCode?.startsWith("http_5"));
  if (!transient || options.allowFallback === false) return first;
  const other: MistralMode = mode === "fast" ? "reasoning" : "fast";
  if (!mistralConfigured(other)) return first;
  return callMode({ ...options, ...(first.requestId ? { requestId: first.requestId } : {}) }, other, true);
}

/** OCR compatibility remains on the existing dedicated Mistral secret. */
export async function callMistralOcr(fileBuffer: Buffer, fileName: string): Promise<string> {
  const apiKey = process.env["MISTRAL_API_KEY"];
  if (!apiKey) throw new Error("MISTRAL_API_KEY nie je nastavený. Pre OCR je potrebný API kľúč.");
  const mimeByExt: Record<string, string> = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", tif: "image/tiff", tiff: "image/tiff", bmp: "image/bmp" };
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(fileBuffer)], { type: mimeByExt[ext] ?? "application/octet-stream" }), fileName);
  formData.append("purpose", "ocr");
  const upload = await fetch("https://api.mistral.ai/v1/files", { method: "POST", headers: { authorization: `Bearer ${apiKey}` }, body: formData });
  if (!upload.ok) throw new Error(`Mistral File Upload zlyhal (${upload.status}).`);
  const fileId = ((await upload.json()) as { id?: string }).id;
  if (!fileId) throw new Error("Mistral File Upload nevrátil ID súboru.");
  try {
    const urlResponse = await fetch(`https://api.mistral.ai/v1/files/${fileId}/url`, { headers: { authorization: `Bearer ${apiKey}` } });
    if (!urlResponse.ok) throw new Error(`Získanie signed URL zlyhalo (${urlResponse.status}).`);
    const documentUrl = ((await urlResponse.json()) as { url: string }).url;
    const isImage = /\.(png|jpe?g|webp|tiff?|bmp)$/i.test(fileName);
    const ocr = await fetch("https://api.mistral.ai/v1/ocr", {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "mistral-ocr-latest", document: isImage ? { type: "image_url", image_url: documentUrl } : { type: "document_url", document_url: documentUrl } }),
    });
    if (!ocr.ok) throw new Error(`Mistral OCR API zlyhalo (${ocr.status}).`);
    const text = ((await ocr.json()) as { pages?: Array<{ markdown: string }> }).pages?.map((page) => page.markdown).join("\n\n") ?? "";
    if (!text.trim()) throw new Error("Mistral OCR nerozpoznalo žiadny text v nahranom dokumente.");
    return text;
  } finally {
    void fetch(`https://api.mistral.ai/v1/files/${fileId}`, { method: "DELETE", headers: { authorization: `Bearer ${apiKey}` } }).catch(() => undefined);
  }
}