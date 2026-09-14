/** Textové AI úlohy používajú výhradne dvojmodelové Mistral smerovanie. */
import { callMistral, callMistralOcr, mistralConfigured, mistralModel, type MistralMessage, type MistralMode, type MistralResult } from "./mistral.server";
import { callXaiVisionOcr, xaiConfigured } from "./xai.server";

export type LlmProvider = "mistral";
export type LlmResult = MistralResult & { provider?: LlmProvider };

export function llmConfigured(): boolean { return mistralConfigured(); }
export function activeProvider(): LlmProvider | null { return llmConfigured() ? "mistral" : null; }
export function preferredLlmModel(mode: MistralMode = "fast"): string { return mistralModel(mode); }
export function providerDisplayName(): string { return "Mistral"; }

export async function callLlm(options: { messages: MistralMessage[]; mode?: MistralMode; maxTokens?: number; requestId?: string; fetchImpl?: typeof fetch }): Promise<LlmResult> {
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