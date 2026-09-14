/**
 * LLM router: predvolený model je Grok (xAI). Ak nie je nakonfigurovaný alebo
 * zlyhá, použije sa Mistral ako záloha. Timeout sa NEfallbackuje — požiadavka
 * už mohla byť u poskytovateľa účtovaná.
 *
 * Poradie sa dá prepnúť serverovou premennou `AI_PRIMARY` = "xai" | "mistral".
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

const providerLabel: Record<LlmProvider, string> = {
  xai: "Grok (xAI)",
  mistral: "Mistral",
};

export function llmConfigured(): boolean {
  return mistralConfigured() || xaiConfigured();
}

/** Predvolený poskytovateľ — Grok, pokiaľ nie je prepnutý cez `AI_PRIMARY`. */
export function primaryProvider(): LlmProvider {
  const wanted = (process.env["AI_PRIMARY"] || "xai").toLowerCase();
  return wanted === "mistral" ? "mistral" : "xai";
}

/** Poskytovateľ, ktorý sa reálne použije podľa dostupných kľúčov. */
export function activeProvider(): LlmProvider | null {
  const primary = primaryProvider();
  const ok = (p: LlmProvider) =>
    p === "xai" ? xaiConfigured() : mistralConfigured();
  if (ok(primary)) return primary;
  const other: LlmProvider = primary === "xai" ? "mistral" : "xai";
  return ok(other) ? other : null;
}

export function preferredLlmModel(): string {
  const active = activeProvider();
  if (active === "mistral") return mistralModel();
  return xaiModel();
}

export function providerDisplayName(provider: LlmProvider): string {
  return providerLabel[provider];
}

export async function callLlm(options: {
  messages: MistralMessage[];
  maxTokens?: number;
  fetchImpl?: typeof fetch;
}): Promise<LlmResult> {
  const primary = primaryProvider();
  const fallback: LlmProvider = primary === "xai" ? "mistral" : "xai";
  const call = (p: LlmProvider) =>
    p === "xai" ? callXai(options) : callMistral(options);
  const configured = (p: LlmProvider) =>
    p === "xai" ? xaiConfigured() : mistralConfigured();

  if (!configured(primary) && !configured(fallback)) {
    return { status: "not_configured", message: "AI nie je nakonfigurovaná." };
  }

  if (configured(primary)) {
    const first = await call(primary);
    if (first.status === "ok") return { ...first, provider: primary };
    if (first.status === "timeout") return first;

    if (configured(fallback)) {
      console.warn(
        `[llm] ${primary} zlyhal (${first.status}: ${first.message}). Fallback na ${fallback}.`,
      );
      const second = await call(fallback);
      if (second.status === "ok") return { ...second, provider: fallback };
      return {
        ...second,
        message: `${providerLabel[primary]}: ${first.message} ${providerLabel[fallback]}: ${second.message}`,
      };
    }
    return first;
  }

  const only = await call(fallback);
  return only.status === "ok" ? { ...only, provider: fallback } : only;
}

const XAI_VISION_EXT = /\.(png|jpe?g)$/i;

/**
 * OCR: PDF zvláda len Mistral OCR, obrázky vie aj xAI vision.
 * Poradie sleduje predvoleného poskytovateľa.
 */
export async function extractWithOcrFallback(
  fileBuffer: Buffer,
  fileName: string,
): Promise<string> {
  let lastError: Error | null = null;
  const xaiUsable = xaiConfigured() && XAI_VISION_EXT.test(fileName);

  if (primaryProvider() === "xai" && xaiUsable) {
    try {
      return await callXaiVisionOcr(fileBuffer, fileName);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        "[llm] xAI vision OCR zlyhalo, skúšam Mistral OCR:",
        lastError.message,
      );
    }
  }

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

  if (xaiUsable && primaryProvider() !== "xai") {
    return callXaiVisionOcr(fileBuffer, fileName);
  }

  if (lastError) throw lastError;
  if (!mistralConfigured() && !xaiConfigured()) {
    throw new Error(
      "OCR nie je nakonfigurované (chýba XAI_API_KEY aj MISTRAL_API_KEY).",
    );
  }
  throw new Error(
    "OCR zlyhalo. Pre PDF je potrebný Mistral OCR; Grok vision funguje len na JPEG/PNG.",
  );
}
