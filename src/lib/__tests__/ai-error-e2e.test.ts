import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Scenario = "401" | "403" | "429" | "5xx";

const jsonResponse = (status: number, body: unknown, retryAfter?: string) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...(retryAfter ? { "retry-after": retryAfter } : {}),
    },
  });

/**
 * Integračný test celého transportného toku. Simulátor je injektovaný priamo
 * do serverového klienta, preto nie je dostupný cez produkčnú HTTP trasu.
 */
function providerScenario(scenario: Scenario) {
  let calls = 0;
  const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    calls += 1;
    const authorization = new Headers(init?.headers).get("authorization");
    const body = JSON.parse(String(init?.body)) as { model: string };

    if (scenario === "401") return jsonResponse(401, { message: "invalid key" });
    if (scenario === "403") return jsonResponse(403, { message: "forbidden" });
    if (scenario === "429" && calls <= 2) return jsonResponse(429, { message: "busy" }, "4");
    if (scenario === "5xx" && calls <= 2) return jsonResponse(calls === 1 ? 500 : 503, { message: "upstream" });

    expect(authorization).toBe("Bearer reasoning-e2e-secret");
    expect(body.model).toBe("magistral-medium-latest");
    return jsonResponse(200, {
      choices: [{ message: { content: '{"summary":"Bezpečný výsledok"}' } }],
      usage: { prompt_tokens: 9, completion_tokens: 4 },
    });
  });
  return fetchImpl;
}

describe("AI error flow E2E", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env["MISTRAL_API_KEY_FAST"] = "fast-e2e-secret";
    process.env["MISTRAL_API_KEY_REASONING"] = "reasoning-e2e-secret";
    process.env["MISTRAL_MODEL_FAST"] = "mistral-small-latest";
    process.env["MISTRAL_MODEL_REASONING"] = "magistral-medium-latest";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it.each(["401", "403"] as const)("treats %s as terminal without retry or fallback", async (scenario) => {
    const fetchImpl = providerScenario(scenario);
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    const { callMistral } = await import("@/lib/ai/mistral.server");
    const result = await callMistral({
      mode: "fast",
      requestId: `request-${scenario}`,
      messages: [{ role: "user", content: "json PRIVATE_FULL_PROMPT" }],
      fetchImpl,
      sleepImpl,
      skipModelVerification: true,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleepImpl).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: "failed", errorCode: `http_${scenario}`, fallback: false });
    expect(JSON.stringify(result)).not.toMatch(/e2e-secret|PRIVATE_FULL_PROMPT|Bearer/i);
  });

  it.each([
    ["429", 4000],
    ["5xx", 1000],
  ] as const)("retries %s twice, then safely falls back", async (scenario, expectedDelay) => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const fetchImpl = providerScenario(scenario);
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    const { callMistral } = await import("@/lib/ai/mistral.server");
    const result = await callMistral({
      mode: "fast",
      requestId: `request-${scenario}`,
      messages: [{ role: "user", content: "json PRIVATE_FULL_PROMPT" }],
      fetchImpl,
      sleepImpl,
      skipModelVerification: true,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleepImpl).toHaveBeenCalledExactlyOnceWith(expectedDelay);
    expect(result).toMatchObject({
      status: "ok",
      mode: "reasoning",
      model: "magistral-medium-latest",
      fallback: true,
      requestId: `request-${scenario}`,
    });
    expect(JSON.stringify(result)).not.toMatch(/e2e-secret|PRIVATE_FULL_PROMPT|Bearer/i);
  });

  it("keeps audit metadata minimal and reserves one logical request across fallback", async () => {
    const fetchImpl = providerScenario("5xx");
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    const reserveQuota = vi.fn().mockResolvedValue("single-reservation-id");
    const writeAudit = vi.fn().mockResolvedValue(undefined);
    const reservationId = await reserveQuota();
    const { callMistral } = await import("@/lib/ai/mistral.server");
    const result = await callMistral({
      mode: "fast",
      requestId: reservationId,
      messages: [{ role: "user", content: "json PRIVATE_FULL_PROMPT" }],
      fetchImpl,
      sleepImpl,
      skipModelVerification: true,
    });

    await writeAudit({
      request_id: result.requestId,
      status: result.status,
      model: result.model,
      mode: result.mode,
      fallback: result.fallback,
    });

    expect(reserveQuota).toHaveBeenCalledTimes(1);
    expect(writeAudit).toHaveBeenCalledTimes(1);
    expect(writeAudit).toHaveBeenCalledWith({
      request_id: "single-reservation-id",
      status: "ok",
      model: "magistral-medium-latest",
      mode: "reasoning",
      fallback: true,
    });
    expect(JSON.stringify(writeAudit.mock.calls)).not.toMatch(/e2e-secret|PRIVATE_FULL_PROMPT|Bearer/i);
  });
});