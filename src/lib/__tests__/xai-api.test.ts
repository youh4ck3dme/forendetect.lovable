import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("xAI API client", () => {
  const original = process.env["XAI_API_KEY"];
  const originalModel = process.env["XAI_MODEL"];

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (original) process.env["XAI_API_KEY"] = original;
    else delete process.env["XAI_API_KEY"];
    if (originalModel) process.env["XAI_MODEL"] = originalModel;
    else delete process.env["XAI_MODEL"];
  });

  it("not_configured bez kľúča", async () => {
    delete process.env["XAI_API_KEY"];
    const { callXai, xaiConfigured } = await import("@/lib/ai/xai.server");
    expect(xaiConfigured()).toBe(false);
    const result = await callXai({
      messages: [{ role: "user", content: "hi" }],
    });
    expect(result.status).toBe("not_configured");
  });

  it("volá chat/completions s grok-4.6 a json_object", async () => {
    process.env["XAI_API_KEY"] = "xai-key";
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: '{"a":1}' } }],
          usage: { prompt_tokens: 3, completion_tokens: 2 },
        }),
    });
    const { callXai, XAI_ENDPOINT } = await import("@/lib/ai/xai.server");
    const result = await callXai({
      messages: [{ role: "user", content: "hi" }],
      fetchImpl,
    });
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.model).toBe("grok-4.6");
      expect(result.content).toBe('{"a":1}');
    }
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(XAI_ENDPOINT);
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.model).toBe("grok-4.6");
  });
});
