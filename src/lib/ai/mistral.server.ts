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
export async function callMistral(options: CallOptions): Promise<MistralResult> {
  const apiKey = process.env["MISTRAL_API_KEY"];
  if (!apiKey) {
    return { status: "not_configured", message: "AI nie je nakonfigurovaná." };
  }
  const model = mistralModel();
  const doFetch = options.fetchImpl ?? fetch;

  const attempt = async (): Promise<
    { kind: "ok"; body: unknown } | { kind: "retry"; after: number } | MistralResult
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
        return { kind: "retry", after: Number.isFinite(after) ? Math.min(after, 10) : 2 };
      }
      if (!response.ok) {
        return { status: "failed", message: `Poskytovateľ vrátil chybu ${response.status}.` };
      }
      return { kind: "ok", body: await response.json() };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return { status: "timeout", message: "Volanie AI prekročilo časový limit." };
      }
      return { status: "failed", message: "Spojenie s poskytovateľom zlyhalo." };
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
      prompt: typeof body.usage?.prompt_tokens === "number" ? body.usage.prompt_tokens : null,
      completion:
        typeof body.usage?.completion_tokens === "number" ? body.usage.completion_tokens : null,
    },
    model,
  };
}
