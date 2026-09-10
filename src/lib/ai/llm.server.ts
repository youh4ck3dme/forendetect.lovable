/**
 * LLM router: Mistral je primárny. Pri chybe/429/prázdnej odpovedi skúsi xAI.
 * Timeout sa NEfallbackuje — požiadavka už mohla byť u Mistral účtovaná.
 */

import {
  callMistral,
  callMistralOcr,
  mistralConfigured,
  mistralModel,
  type MistralMessage,
  type MistralResult,
} from "./mistral.server";
import {
  callXai,
  callXaiVisionOcr,
  xaiConfigured,
  xaiModel,
} from "./xai.server";

export type LlmProvider = "mistral" | "xai";

export type LlmResult = MistralResult & { provider?: LlmProvider };

export function llmConfigured(): boolean {
  return mistralConfigured() || xaiConfigured();
}

export function preferredLlmModel(): string {
  if (mistralConfigured()) return mistralModel();
  return xaiModel();
}

export async function callLlm(options: {
  messages: MistralMessage[];
  maxTokens?: number;
  fetchImpl?: typeof fetch;
}): Promise<LlmResult> {
  const mistralOn = mistralConfigured();
  const xaiOn = xaiConfigured();

  if (!mistralOn && !xaiOn) {
    return { status: "not_configured", message: "AI nie je nakonfigurovaná." };
  }

  if (mistralOn) {
    const primary = await callMistral(options);
    if (primary.status === "ok") {
      return { ...primary, provider: "mistral" };
    }
    if (primary.status === "timeout") {
      return primary;
    }
    if (xaiOn) {
      console.warn(
        `[llm] Mistral zlyhal (${primary.status}: ${primary.message}). Fallback na xAI.`,
      );
      const fallback = await callXai(options);
      if (fallback.status === "ok") {
        return { ...fallback, provider: "xai" };
      }
      return {
        ...fallback,
        message: `Mistral: ${primary.message} xAI: ${fallback.message}`,
      };
    }
    return primary;
  }

  const onlyXai = await callXai(options);
  return onlyXai.status === "ok" ? { ...onlyXai, provider: "xai" } : onlyXai;
}

const XAI_VISION_EXT = /\.(png|jpe?g)$/i;

/**
 * OCR: najprv Mistral OCR, pri zlyhaní xAI vision (JPEG/PNG).
 */
export async function extractWithOcrFallback(
  fileBuffer: Buffer,
  fileName: string,
): Promise<string> {
  let lastError: Error | null = null;

  if (mistralConfigured()) {
    try {
      return await callMistralOcr(fileBuffer, fileName);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        "[llm] Mistral OCR zlyhalo, skúšam xAI vision:",
        lastError.message,
      );
    }
  }

  if (xaiConfigured() && XAI_VISION_EXT.test(fileName)) {
    return callXaiVisionOcr(fileBuffer, fileName);
  }

  if (lastError) throw lastError;
  if (!mistralConfigured() && !xaiConfigured()) {
    throw new Error(
      "OCR nie je nakonfigurované (chýba MISTRAL_API_KEY aj XAI_API_KEY).",
    );
  }
  throw new Error(
    "OCR zlyhalo. Pre PDF je potrebný Mistral OCR; xAI fallback funguje len na JPEG/PNG.",
  );
}
