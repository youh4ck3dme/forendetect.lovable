/** Textové AI úlohy používajú výhradne dvojmodelové Mistral smerovanie. */
import { callMistral, callMistralOcr, mistralConfigured, mistralModel, type MistralMessage, type MistralMode } from "./mistral.server";

export type LlmProvider = "mistral";
export type LlmResult = {
  status: "ok";
  content: string;
  usage: { prompt: number | null; completion: number | null };
  model: string;
  provider?: LlmProvider;
  mode?: MistralMode;
  fallback?: boolean;
  requestId?: string;
} | {
  status: "not_configured" | "timeout" | "rate_limited" | "failed";
  message: string;
  retryAfterSeconds?: number;
  errorCode?: string;
  model?: string;
  mode?: MistralMode;
  fallback?: boolean;
  requestId?: string;
};

export function llmConfigured(): boolean { return mistralConfigured(); }
export function activeProvider(): LlmProvider | null { return mistralConfigured() ? "mistral" : null; }
export function preferredLlmModel(mode?: MistralMode): string { return mistralModel(mode ?? "fast"); }
export function providerDisplayName(_provider: LlmProvider = "mistral"): string { return "Mistral"; }

export async function callLlm(options: { messages: MistralMessage[]; mode?: MistralMode; maxTokens?: number; requestId?: string; fetchImpl?: typeof fetch }): Promise<LlmResult> {
  const result = await callMistral(options);
  return result.status === "ok" ? { ...result, provider: "mistral" } : result;
}

export async function extractWithOcrFallback(fileBuffer: Buffer, fileName: string): Promise<string> {
  if (!process.env["MISTRAL_API_KEY"]) throw new Error("OCR nie je nakonfigurované.");
  return callMistralOcr(fileBuffer, fileName);
}
