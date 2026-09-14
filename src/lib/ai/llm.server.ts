/** Textové AI úlohy používajú výhradne dvojmodelové Mistral smerovanie. */
import { callMistral, callMistralOcr, mistralConfigured, mistralModel, type MistralMessage, type MistralMode, type MistralResult } from "./mistral.server";
import { callXai, callXaiVisionOcr, xaiConfigured, xaiModel } from "./xai.server";

export type LlmProvider = "mistral" | "xai";
export type LlmResult = MistralResult | ({
  status: "ok";
  content: string;
  usage: { prompt: number | null; completion: number | null };
  model: string;
  provider: "xai";
} | {
  status: "not_configured" | "timeout" | "rate_limited" | "failed";
  message: string;
  retryAfterSeconds?: number;
});

export function llmConfigured(): boolean { return mistralConfigured() || xaiConfigured(); }
export function activeProvider(): LlmProvider | null { return xaiConfigured() ? "xai" : mistralConfigured() ? "mistral" : null; }
export function preferredLlmModel(mode?: MistralMode): string { return mode ? mistralModel(mode) : xaiConfigured() ? xaiModel() : mistralModel("fast"); }
export function providerDisplayName(provider: LlmProvider = activeProvider() ?? "mistral"): string { return provider === "xai" ? "Grok / xAI" : "Mistral"; }

export async function callLlm(options: { messages: MistralMessage[]; mode?: MistralMode; maxTokens?: number; requestId?: string; fetchImpl?: typeof fetch }): Promise<LlmResult> {
  if (!options.mode && xaiConfigured()) {
    const result = await callXai({ messages: options.messages, ...(options.maxTokens ? { maxTokens: options.maxTokens } : {}), ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}) });
    return result.status === "ok" ? { ...result, provider: "xai" } : result;
  }
  const result = await callMistral(options);
  return result.status === "ok" ? { ...result, provider: "mistral" } : result;
}

const XAI_VISION_EXT = /\.(png|jpe?g)$/i;
export async function extractWithOcrFallback(fileBuffer: Buffer, fileName: string): Promise<string> {
  const hasMistralOcr = Boolean(process.env["MISTRAL_API_KEY"]);
  if (!hasMistralOcr && !xaiConfigured()) throw new Error("OCR nie je nakonfigurované.");
  if (!hasMistralOcr && xaiConfigured() && !XAI_VISION_EXT.test(fileName)) {
    throw new Error("Záložné xAI OCR podporuje iba JPEG/PNG obrázky.");
  }
  let mistralError: unknown;
  try { return await callMistralOcr(fileBuffer, fileName); } catch (error) { mistralError = error; }
  if (xaiConfigured() && XAI_VISION_EXT.test(fileName)) return callXaiVisionOcr(fileBuffer, fileName);
  throw mistralError instanceof Error ? mistralError : new Error("OCR nie je nakonfigurované.");
}