import { describe, expect, it } from "vitest";
import { maskCsvCell, suggestCsvMapping } from "@/lib/ai.functions";

describe("AI návrh mapovania CSV", () => {
  it("maskuje dlhé čísla účtov a e-maily vo vzorke", () => {
    expect(maskCsvCell("SK1234567890123456")).not.toContain("1234567890");
    expect(maskCsvCell("jan.novak@firma.sk")).toBe("osoba@example");
  });

  it("orezáva bunky na bezpečnú dĺžku", () => {
    expect(maskCsvCell("x".repeat(200)).length).toBe(40);
  });

  it("serverová funkcia je definovaná", () => {
    expect(typeof suggestCsvMapping).toBe("function");
  });
});
