/**
 * Serverový klient pre Mistral API (POST https://api.mistral.ai/v1/chat/completions).
 * Kľúč `MISTRAL_API_KEY` je serverové tajomstvo — nikdy sa nedostane do klientského balíka.
 * Model sa nastavuje serverovou premennou `MISTRAL_MODEL`.
 */

export const MISTRAL_ENDPOINT = "https://api.mistral.ai/v1/chat/completions";
export const DEFAULT_MODEL = "mistral-large-latest";
export const REQUEST_TIMEOUT_MS = 30_000;

export type MistralMessage = { role: "system" | "user"; content: string };

export type MistralResult =
  | {
      status: "ok";
      content: string;
      usage: { prompt: number | null; completion: number | null };
      model: string;
    }
  | {
      status: "not_configured" | "timeout" | "rate_limited" | "failed";
      message: string;
      retryAfterSeconds?: number;
    };

export function mistralModel(): string {
  return process.env["MISTRAL_MODEL"] || DEFAULT_MODEL;
}

export function mistralConfigured(): boolean {
  return Boolean(process.env["MISTRAL_API_KEY"]);
}

type CallOptions = {
  messages: MistralMessage[];
  maxTokens?: number;
  /** Injektovateľné len v testoch. */
  fetchImpl?: typeof fetch;
};

/**
 * Jedno volanie s časovým limitom. Opakuje sa NAJVIAC raz a len pri jednoznačne
 * prechodnej chybe (429 alebo 503) s rešpektovaním hlavičky Retry-After.
 * Po nejednoznačnom zlyhaní (timeout, prerušené spojenie) sa neopakuje —
 * požiadavka už mohla byť u poskytovateľa spracovaná a účtovaná.
 */
export async function callMistral(
  options: CallOptions,
): Promise<MistralResult> {
  const apiKey = process.env["MISTRAL_API_KEY"];
  if (!apiKey) {
    return { status: "not_configured", message: "AI nie je nakonfigurovaná." };
  }
  const model = mistralModel();
  const doFetch = options.fetchImpl ?? fetch;

  const attempt = async (): Promise<
    | { kind: "ok"; body: unknown }
    | { kind: "retry"; after: number }
    | MistralResult
  > => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await doFetch(MISTRAL_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: options.maxTokens ?? 900,
          response_format: { type: "json_object" },
          messages: options.messages,
        }),
        signal: controller.signal,
      });

      if (response.status === 429 || response.status === 503) {
        const header = response.headers.get("retry-after");
        const after = header ? Number(header) : 2;
        return {
          kind: "retry",
          after: Number.isFinite(after) ? Math.min(after, 10) : 2,
        };
      }
      if (!response.ok) {
        return {
          status: "failed",
          message: `Poskytovateľ vrátil chybu ${response.status}.`,
        };
      }
      return { kind: "ok", body: await response.json() };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          status: "timeout",
          message: "Volanie AI prekročilo časový limit.",
        };
      }
      return {
        status: "failed",
        message: "Spojenie s poskytovateľom zlyhalo.",
      };
    } finally {
      clearTimeout(timer);
    }
  };

  let result = await attempt();
  if ("kind" in result && result.kind === "retry") {
    const wait = result.after;
    await new Promise((r) => setTimeout(r, Math.min(wait, 5) * 1000));
    const second = await attempt();
    if ("kind" in second && second.kind === "retry") {
      return {
        status: "rate_limited",
        message: "Poskytovateľ je momentálne vyťažený. Skúste to o chvíľu.",
        retryAfterSeconds: second.after,
      };
    }
    result = second;
  }
  if (!("kind" in result)) return result;

  const body = result.body as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    return { status: "failed", message: "Odpoveď AI bola prázdna." };
  }
  return {
    status: "ok",
    content,
    // Chýbajúcu spotrebu neuvádzame ako nulu — ostáva neznáma.
    usage: {
      prompt:
        typeof body.usage?.prompt_tokens === "number"
          ? body.usage.prompt_tokens
          : null,
      completion:
        typeof body.usage?.completion_tokens === "number"
          ? body.usage.completion_tokens
          : null,
    },
    model,
  };
}

/**
 * Mistral OCR API (POST https://api.mistral.ai/v1/ocr).
 * Slúži ako fallback pre skenované PDF (bez textovej vrstvy) a obrázky listín.
 * 1. Upload dočasného súboru cez /v1/files (purpose: "ocr")
 * 2. Získanie podpísanej URL cez /v1/files/:id/url
 * 3. Spustenie mistral-ocr-latest
 * 4. Asynchrónne zmazanie dočasného súboru
 */
export async function callMistralOcr(
  fileBuffer: Buffer,
  fileName: string,
): Promise<string> {
  const apiKey = process.env["MISTRAL_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "MISTRAL_API_KEY nie je nastavený. Pre OCR je potrebný API kľúč.",
    );
  }

  const mimeByExt: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    tif: "image/tiff",
    tiff: "image/tiff",
    bmp: "image/bmp",
  };
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const mime = mimeByExt[ext] ?? "application/octet-stream";

  // 1. Upload do /v1/files
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(fileBuffer)], { type: mime });
  formData.append("file", blob, fileName);
  formData.append("purpose", "ocr");

  const uploadRes = await fetch("https://api.mistral.ai/v1/files", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(
      `Mistral File Upload zlyhal (${uploadRes.status}): ${errText}`,
    );
  }

  const uploadData = (await uploadRes.json()) as { id?: string };
  const fileId = uploadData.id;
  if (!fileId) {
    throw new Error("Mistral File Upload nevrátil ID súboru.");
  }

  try {
    // 2. Získaj signed URL
    const signedUrlRes = await fetch(
      `https://api.mistral.ai/v1/files/${fileId}/url`,
      {
        headers: {
          authorization: `Bearer ${apiKey}`,
        },
      },
    );

    if (!signedUrlRes.ok) {
      const errText = await signedUrlRes.text();
      throw new Error(
        `Získanie signed URL zlyhalo (${signedUrlRes.status}): ${errText}`,
      );
    }

    const signedUrlData = (await signedUrlRes.json()) as { url: string };
    const documentUrl = signedUrlData.url;

    // 3. Spusť OCR
    const isImage = /\.(png|jpe?g|webp|tiff?|bmp)$/i.test(fileName);
    const docPayload = isImage
      ? { type: "image_url", image_url: documentUrl }
      : { type: "document_url", document_url: documentUrl };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000); // 60s timeout pre OCR

    try {
      const ocrRes = await fetch("https://api.mistral.ai/v1/ocr", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "mistral-ocr-latest",
          document: docPayload,
        }),
        signal: controller.signal,
      });

      if (!ocrRes.ok) {
        const errText = await ocrRes.text();
        throw new Error(
          `Mistral OCR API zlyhalo (${ocrRes.status}): ${errText}`,
        );
      }

      const ocrData = (await ocrRes.json()) as {
        pages?: Array<{ index: number; markdown: string }>;
      };

      const extracted =
        ocrData.pages?.map((p) => p.markdown).join("\n\n") || "";
      if (!extracted.trim()) {
        throw new Error(
          "Mistral OCR nerozpoznalo žiadny text v nahranom dokumente.",
        );
      }
      return extracted;
    } finally {
      clearTimeout(timer);
    }
  } finally {
    // 4. Cleanup: zmaž súbor z Mistral storage na pozadí
    Promise.resolve(
      fetch(`https://api.mistral.ai/v1/files/${fileId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${apiKey}` },
      }),
    ).catch((err) => {
      console.warn(
        "Nepodarilo sa vymazať dočasný súbor z Mistral storage:",
        err,
      );
    });
  }
}
