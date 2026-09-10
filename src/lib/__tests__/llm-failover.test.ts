import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

describe("LLM failover Mistral → xAI", () => {
  const originalMistral = process.env["MISTRAL_API_KEY"];
  const originalXai = process.env["XAI_API_KEY"];

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalMistral) process.env["MISTRAL_API_KEY"] = originalMistral;
    else delete process.env["MISTRAL_API_KEY"];
    if (originalXai) process.env["XAI_API_KEY"] = originalXai;
    else delete process.env["XAI_API_KEY"];
  });

  it("nie je nakonfigurované, keď chýbajú oba kľúče", async () => {
    delete process.env["MISTRAL_API_KEY"];
    delete process.env["XAI_API_KEY"];
    const { llmConfigured, callLlm } = await import("@/lib/ai/llm.server");
    expect(llmConfigured()).toBe(false);
    const result = await callLlm({
      messages: [{ role: "user", content: "hi" }],
    });
    expect(result.status).toBe("not_configured");
  });

  it("pri úspešnom Mistral nevolá xAI", async () => {
    process.env["MISTRAL_API_KEY"] = "mistral-key";
    process.env["XAI_API_KEY"] = "xai-key";
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        choices: [{ message: { content: '{"ok":true}' } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }),
    );
    const { callLlm } = await import("@/lib/ai/llm.server");
    const result = await callLlm({
      messages: [{ role: "user", content: "hi" }],
      fetchImpl,
    });
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.provider).toBe("mistral");
      expect(result.content).toBe('{"ok":true}');
    }
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("mistral.ai");
  });

  it("keď Mistral vráti 500, prejde na xAI", async () => {
    process.env["MISTRAL_API_KEY"] = "mistral-key";
    process.env["XAI_API_KEY"] = "xai-key";
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(500, { error: "down" }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          choices: [{ message: { content: '{"fallback":true}' } }],
        }),
      );
    const { callLlm } = await import("@/lib/ai/llm.server");
    const result = await callLlm({
      messages: [{ role: "user", content: "hi" }],
      fetchImpl,
    });
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.provider).toBe("xai");
      expect(result.content).toBe('{"fallback":true}');
      expect(result.model).toBe("grok-4.6");
    }
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("mistral.ai");
    expect(String(fetchImpl.mock.calls[1]?.[0])).toContain("api.x.ai");
  });

  it("pri Mistral timeout nevolá xAI (požiadavka už mohla byť účtovaná)", async () => {
    process.env["MISTRAL_API_KEY"] = "mistral-key";
    process.env["XAI_API_KEY"] = "xai-key";
    const fetchImpl = vi.fn().mockImplementation(() => {
      const err = new Error("aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    });
    const { callLlm } = await import("@/lib/ai/llm.server");
    const result = await callLlm({
      messages: [{ role: "user", content: "hi" }],
      fetchImpl,
    });
    expect(result.status).toBe("timeout");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("mistral.ai");
  });

  it("keď chýba Mistral kľúč, ide priamo na xAI", async () => {
    delete process.env["MISTRAL_API_KEY"];
    process.env["XAI_API_KEY"] = "xai-key";
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        choices: [{ message: { content: '{"direct":true}' } }],
      }),
    );
    const { callLlm, preferredLlmModel } = await import("@/lib/ai/llm.server");
    expect(preferredLlmModel()).toBe("grok-4.6");
    const result = await callLlm({
      messages: [{ role: "user", content: "hi" }],
      fetchImpl,
    });
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.provider).toBe("xai");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("api.x.ai");
  });
});
