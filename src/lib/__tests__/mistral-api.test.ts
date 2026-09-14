import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const response = (status: number, body: unknown, retryAfter?: string) => new Response(JSON.stringify(body), {
  status,
  headers: retryAfter ? { "content-type": "application/json", "retry-after": retryAfter } : { "content-type": "application/json" },
});

describe("dual Mistral API", () => {
  beforeEach(() => {
    process.env["MISTRAL_API_KEY_FAST"] = "fast-secret";
    process.env["MISTRAL_API_KEY_REASONING"] = "reasoning-secret";
    process.env["MISTRAL_MODEL_FAST"] = "mistral-small-latest";
    process.env["MISTRAL_MODEL_REASONING"] = "magistral-medium-latest";
  });
  afterEach(() => vi.restoreAllMocks());

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

  it("falls back after two 5xx attempts and keeps one request id", async () => {
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(503, {})).mockResolvedValueOnce(response(503, {})).mockResolvedValueOnce(response(200, { choices: [{ message: { content: "{}" } }] }));
    const { callMistral } = await import("@/lib/ai/mistral.server");
    const result = await callMistral({ mode: "fast", requestId: "7d9a767f-4c01-462f-a8a6-230984bf6c87", messages: [{ role: "user", content: "json" }], fetchImpl, sleepImpl, skipModelVerification: true });
    expect(result.status).toBe("ok");
    if (result.status === "ok") { expect(result.fallback).toBe(true); expect(result.mode).toBe("reasoning"); expect(result.requestId).toBe("7d9a767f-4c01-462f-a8a6-230984bf6c87"); }
    expect(fetchImpl).toHaveBeenCalledTimes(3);
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