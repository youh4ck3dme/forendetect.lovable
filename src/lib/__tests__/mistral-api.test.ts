import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const response = (status: number, body: unknown, retryAfter?: string) => new Response(JSON.stringify(body), {
  status,
  headers: retryAfter ? { "content-type": "application/json", "retry-after": retryAfter } : { "content-type": "application/json" },
});

describe("dual Mistral API", () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    vi.resetModules();
    process.env["MISTRAL_API_KEY_FAST"] = "fast-secret";
    process.env["MISTRAL_API_KEY_REASONING"] = "reasoning-secret";
    process.env["MISTRAL_MODEL_FAST"] = "mistral-small-latest";
    process.env["MISTRAL_MODEL_REASONING"] = "magistral-medium-latest";
  });
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("uses the fast key and model", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { choices: [{ message: { content: '{"summary":"ok"}' } }] }));
    const { callMistral } = await import("@/lib/ai/mistral.server");
    const result = await callMistral({ mode: "fast", messages: [{ role: "user", content: "json test" }], fetchImpl, skipModelVerification: true });
    expect(result.status).toBe("ok");
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer fast-secret");
    expect(JSON.parse(String(init.body)).model).toBe("mistral-small-latest");
  });

  it("uses the reasoning key and model", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { choices: [{ message: { content: '{"summary":"ok"}' } }] }));
    const { callMistral } = await import("@/lib/ai/mistral.server");
    const result = await callMistral({ mode: "reasoning", messages: [{ role: "user", content: "json test" }], fetchImpl, skipModelVerification: true });
    expect(result.status).toBe("ok");
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer reasoning-secret");
    expect(JSON.parse(String(init.body)).model).toBe("magistral-medium-latest");
  });

  it.each([400, 401, 402, 403])("does not retry or fallback terminal HTTP %s", async (status) => {
    const fetchImpl = vi.fn().mockResolvedValue(response(status, { message: "denied" }));
    const { callMistral } = await import("@/lib/ai/mistral.server");
    const result = await callMistral({ mode: "fast", messages: [{ role: "user", content: "json" }], fetchImpl, skipModelVerification: true });
    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe(`http_${status}`);
    expect(result.fallback).toBe(false);
    expect(result.message).not.toContain("denied");
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("honours Retry-After and retries 429 once", async () => {
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(429, {}, "3")).mockResolvedValueOnce(response(200, { choices: [{ message: { content: "{}" } }] }));
    const { callMistral } = await import("@/lib/ai/mistral.server");
    const result = await callMistral({ mode: "fast", messages: [{ role: "user", content: "json" }], fetchImpl, sleepImpl, skipModelVerification: true });
    expect(result.status).toBe("ok");
    expect(sleepImpl).toHaveBeenCalledWith(3000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("honours an HTTP-date Retry-After value", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T19:57:00.000Z"));
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    const retryAt = "Mon, 14 Sep 2026 19:57:04 GMT";
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(429, {}, retryAt))
      .mockResolvedValueOnce(response(200, { choices: [{ message: { content: "{}" } }] }));
    const { callMistral } = await import("@/lib/ai/mistral.server");
    const result = await callMistral({ mode: "fast", messages: [{ role: "user", content: "json" }], fetchImpl, sleepImpl, skipModelVerification: true });
    expect(result.status).toBe("ok");
    expect(sleepImpl).toHaveBeenCalledExactlyOnceWith(4000);
  });

  it("falls back after two 5xx attempts and keeps one request id", async () => {
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(503, {})).mockResolvedValueOnce(response(503, {})).mockResolvedValueOnce(response(200, { choices: [{ message: { content: "{}" } }] }));
    const { callMistral } = await import("@/lib/ai/mistral.server");
    const result = await callMistral({ mode: "fast", requestId: "7d9a767f-4c01-462f-a8a6-230984bf6c87", messages: [{ role: "user", content: "json" }], fetchImpl, sleepImpl, skipModelVerification: true });
    expect(result.status).toBe("ok");
    if (result.status === "ok") { expect(result.fallback).toBe(true); expect(result.mode).toBe("reasoning"); expect(result.requestId).toBe("7d9a767f-4c01-462f-a8a6-230984bf6c87"); }
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("uses exponential backoff for 5xx and only falls back after both primary attempts", async () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(response(500, {}))
      .mockResolvedValueOnce(response(503, {}))
      .mockResolvedValueOnce(response(200, { choices: [{ message: { content: "{}" } }] }));
    const { callMistral } = await import("@/lib/ai/mistral.server");
    const result = await callMistral({ mode: "reasoning", requestId: "trace-safe-id", messages: [{ role: "user", content: "json" }], fetchImpl, sleepImpl, skipModelVerification: true });
    expect(sleepImpl).toHaveBeenCalledTimes(1);
    expect(sleepImpl).toHaveBeenCalledWith(1000);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    const firstBody = JSON.parse(String((fetchImpl.mock.calls[0]?.[1] as RequestInit).body));
    const secondBody = JSON.parse(String((fetchImpl.mock.calls[1]?.[1] as RequestInit).body));
    const fallbackBody = JSON.parse(String((fetchImpl.mock.calls[2]?.[1] as RequestInit).body));
    expect(firstBody.model).toBe("magistral-medium-latest");
    expect(secondBody.model).toBe("magistral-medium-latest");
    expect(fallbackBody.model).toBe("mistral-small-latest");
    expect(result).toMatchObject({ status: "ok", mode: "fast", fallback: true, requestId: "trace-safe-id" });
    random.mockRestore();
  });

  it("stops after two 429 attempts when fallback is disabled", async () => {
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    const fetchImpl = vi.fn().mockResolvedValue(response(429, {}, "2"));
    const { callMistral } = await import("@/lib/ai/mistral.server");
    const result = await callMistral({ mode: "fast", allowFallback: false, messages: [{ role: "user", content: "json" }], fetchImpl, sleepImpl, skipModelVerification: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleepImpl).toHaveBeenCalledExactlyOnceWith(2000);
    expect(result).toMatchObject({ status: "rate_limited", retryAfterSeconds: 2, fallback: false });
  });

  it("never exposes credentials or the full prompt in terminal error results", async () => {
    const sensitivePrompt = "json PERSON_PRIVATE_ACCOUNT_123";
    const fetchImpl = vi.fn().mockResolvedValue(response(403, { message: "provider details" }));
    const { callMistral } = await import("@/lib/ai/mistral.server");
    const result = await callMistral({ mode: "reasoning", requestId: "audit-request-id", messages: [{ role: "user", content: sensitivePrompt }], fetchImpl, skipModelVerification: true });
    const serializedResult = JSON.stringify(result);
    expect(serializedResult).not.toContain("reasoning-secret");
    expect(serializedResult).not.toContain(sensitivePrompt);
    expect(result.requestId).toBe("audit-request-id");
  });

  it("does not fallback after an abort", async () => {
    const error = new Error("aborted"); error.name = "AbortError";
    const fetchImpl = vi.fn().mockRejectedValue(error);
    const { callMistral } = await import("@/lib/ai/mistral.server");
    const result = await callMistral({ mode: "fast", messages: [{ role: "user", content: "json" }], fetchImpl, skipModelVerification: true });
    expect(result.status).toBe("timeout");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});