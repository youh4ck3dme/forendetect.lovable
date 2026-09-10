import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("OCR fallback (Mistral → xAI vision)", () => {
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

  it("bez kľúčov vyhodí jasnú chybu", async () => {
    delete process.env["MISTRAL_API_KEY"];
    delete process.env["XAI_API_KEY"];
    const { extractWithOcrFallback } = await import("@/lib/ai/llm.server");
    await expect(
      extractWithOcrFallback(Buffer.from("x"), "scan.png"),
    ).rejects.toThrow(/OCR nie je nakonfigurované/);
  });

  it("PDF bez Mistral OCR nespadne ticho na xAI vision", async () => {
    delete process.env["MISTRAL_API_KEY"];
    process.env["XAI_API_KEY"] = "xai-key";
    const { extractWithOcrFallback } = await import("@/lib/ai/llm.server");
    await expect(
      extractWithOcrFallback(Buffer.from("%PDF"), "spis.pdf"),
    ).rejects.toThrow(/JPEG\/PNG/);
  });

  it("JPEG ide na xAI vision, keď Mistral kľúč chýba", async () => {
    delete process.env["MISTRAL_API_KEY"];
    process.env["XAI_API_KEY"] = "xai-key";
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "Zápisnica o výsluchu" } }],
        }),
    });
    const { callXaiVisionOcr } = await import("@/lib/ai/xai.server");
    const text = await callXaiVisionOcr(
      Buffer.from("fake-jpeg"),
      "scan.jpg",
      fetchImpl,
    );
    expect(text).toBe("Zápisnica o výsluchu");
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("api.x.ai");
  });

  it("xAI vision odmietne TIFF", async () => {
    process.env["XAI_API_KEY"] = "xai-key";
    const { callXaiVisionOcr } = await import("@/lib/ai/xai.server");
    await expect(
      callXaiVisionOcr(Buffer.from("x"), "scan.tiff"),
    ).rejects.toThrow(/JPEG a PNG/);
  });
});
