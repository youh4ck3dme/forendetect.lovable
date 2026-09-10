/**
 * Serverový klient pre xAI (POST https://api.x.ai/v1/chat/completions).
 * Kľúč `XAI_API_KEY` je serverové tajomstvo. Model: `XAI_MODEL` (default grok-4.6).
 */

import type { MistralMessage, MistralResult } from "./mistral.server";
import { REQUEST_TIMEOUT_MS } from "./mistral.server";

export const XAI_ENDPOINT = "https://api.x.ai/v1/chat/completions";
export const DEFAULT_XAI_MODEL = "grok-4.6";

export function xaiModel(): string {
  return process.env["XAI_MODEL"] || DEFAULT_XAI_MODEL;
}

export function xaiConfigured(): boolean {
  return Boolean(process.env["XAI_API_KEY"]);
}

type CallOptions = {
  messages: MistralMessage[];
  maxTokens?: number;
  fetchImpl?: typeof fetch;
};

export async function callXai(options: CallOptions): Promise<MistralResult> {
  const apiKey = process.env["XAI_API_KEY"];
  if (!apiKey) {
    return { status: "not_configured", message: "xAI nie je nakonfigurovaná." };
  }
  const model = xaiModel();
  const doFetch = options.fetchImpl ?? fetch;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await doFetch(XAI_ENDPOINT, {
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
        status: "rate_limited",
        message: "xAI je momentálne vyťažená. Skúste to o chvíľu.",
        retryAfterSeconds: Number.isFinite(after) ? Math.min(after, 10) : 2,
      };
    }
    if (!response.ok) {
      return {
        status: "failed",
        message: `xAI vrátila chybu ${response.status}.`,
      };
    }

    const body = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim() === "") {
      return { status: "failed", message: "Odpoveď xAI bola prázdna." };
    }
    return {
      status: "ok",
      content,
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
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        status: "timeout",
        message: "Volanie xAI prekročilo časový limit.",
      };
    }
    return { status: "failed", message: "Spojenie s xAI zlyhalo." };
  } finally {
    clearTimeout(timer);
  }
}

const VISION_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

/**
 * OCR fallback cez Grok vision. xAI berie len JPEG/PNG.
 */
export async function callXaiVisionOcr(
  fileBuffer: Buffer,
  fileName: string,
  fetchImpl?: typeof fetch,
): Promise<string> {
  const apiKey = process.env["XAI_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "XAI_API_KEY nie je nastavený. Pre OCR fallback je potrebný kľúč.",
    );
  }
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const mime = VISION_MIME[ext];
  if (!mime) {
    throw new Error("xAI OCR fallback podporuje len JPEG a PNG.");
  }

  const doFetch = fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await doFetch(XAI_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: xaiModel(),
        temperature: 0,
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mime};base64,${fileBuffer.toString("base64")}`,
                  detail: "high",
                },
              },
              {
                type: "text",
                text: "Extract ALL readable text from this document image. Return only the transcribed text, no commentary, no markdown fences.",
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `xAI vision OCR zlyhalo (${response.status}): ${errText}`,
      );
    }
    const body = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      throw new Error("xAI vision nerozpoznalo žiadny text v obrázku.");
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}
