import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("OCR (výhradne Mistral)", () => {
  const originalMistral = process.env["MISTRAL_API_KEY"];

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalMistral) process.env["MISTRAL_API_KEY"] = originalMistral;
    else delete process.env["MISTRAL_API_KEY"];
  });

  it("bez Mistral kľúča vyhodí jasnú chybu", async () => {
    delete process.env["MISTRAL_API_KEY"];
    const { extractWithOcrFallback } = await import("@/lib/ai/llm.server");
    await expect(
      extractWithOcrFallback(Buffer.from("x"), "scan.png"),
    ).rejects.toThrow(/OCR nie je nakonfigurované/);
  });

  it("PDF bez Mistral kľúča neprejde na iného poskytovateľa", async () => {
    delete process.env["MISTRAL_API_KEY"];
    const { extractWithOcrFallback } = await import("@/lib/ai/llm.server");
    await expect(
      extractWithOcrFallback(Buffer.from("%PDF"), "spis.pdf"),
    ).rejects.toThrow(/OCR nie je nakonfigurované/);
  });

  it("hlási Mistral ako jediného poskytovateľa", async () => {
    process.env["MISTRAL_API_KEY"] = "test-key";
    const { providerDisplayName, activeProvider } = await import("@/lib/ai/llm.server");
    expect(providerDisplayName()).toBe("Mistral");
    expect(activeProvider()).toBe("mistral");
  });
});
