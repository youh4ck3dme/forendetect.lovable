import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { extractSingleBufferText } from "../ai.functions";

describe("Bulk Media Sandbox & File Extraction", () => {
  it("extrahuje čistý text z TXT súboru", async () => {
    const textContent = "Zápisnica o výsluchu svedka Mareka Plcha.";
    const res = await extractSingleBufferText("vyslech.txt", undefined, textContent);
    expect(res.success).toBe(true);
    expect(res.text).toBe(textContent);
    expect(res.charCount).toBe(textContent.length);
  });

  it("extrahuje a očistí CSV a JSON súbory", async () => {
    const csvContent = "datum,suma,platitel,prijemca\n2025-01-22,32000,vklad,EB-EU";
    const resCsv = await extractSingleBufferText("transakcie.csv", undefined, csvContent);
    expect(resCsv.success).toBe(true);
    expect(resCsv.text).toContain("32000");

    const jsonContent = JSON.stringify({ kauza: "Tatragen", zbrane: 242 });
    const resJson = await extractSingleBufferText("data.json", undefined, jsonContent);
    expect(resJson.success).toBe(true);
    expect(resJson.text).toContain("Tatragen");
  });

  it("extrahuje a zbaví HTML značiek", async () => {
    const htmlContent =
      "<html><body><h1>Zápisnica</h1><p>Erik Babčan bol prítomný.</p></body></html>";
    const base64 = Buffer.from(htmlContent, "utf-8").toString("base64");
    const res = await extractSingleBufferText("zapisnica.html", base64);
    expect(res.success).toBe(true);
    expect(res.text).toContain("Zápisnica");
    expect(res.text).toContain("Erik Babčan bol prítomný.");
    expect(res.text).not.toContain("<html>");
    expect(res.text).not.toContain("<h1>");
  });

  it("extrahuje tabuľky z XLSX súboru", async () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ["ID", "Dátum", "Suma", "Typ"],
      ["SF-01", "2025-01-22", 32000, "Hotovosť"],
      ["SF-02", "2025-01-23", 31850, "Prevod"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Platby");
    const xlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const base64 = xlsxBuffer.toString("base64");

    const res = await extractSingleBufferText("transakcie.xlsx", base64);
    expect(res.success).toBe(true);
    expect(res.text).toContain("SF-01");
    expect(res.text).toContain("32000");
    expect(res.text).toContain("Platby");
  });

  it("odmietne nepodporovaný formát s jasným chybovým hlásením", async () => {
    const base64 = Buffer.from("fake exe content").toString("base64");
    await expect(extractSingleBufferText("malware.exe", base64)).rejects.toThrow(
      /Nepodporovaný formát/,
    );
  });
});
