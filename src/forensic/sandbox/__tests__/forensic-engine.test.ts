import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  dissectFile,
  scanFinancialEntities,
} from "@/forensic/sandbox/forensic-engine";

describe("forensic sandbox engine", () => {
  it("extracts and deduplicates financial and AML entities", () => {
    const result = scanFinancialEntities(
      "IBAN SK3111000000002948112001, IBAN SK3111000000002948112001, " +
        "ICO: 48192011, DIC: SK2024192011, 450 000 EUR, offshore, schránková",
    );

    expect(result.ibans).toEqual(["SK3111000000002948112001"]);
    expect(result.icos).toEqual(["48192011"]);
    expect(result.dics).toEqual(["SK2024192011"]);
    expect(result.amounts).toEqual(["450 000 EUR"]);
    expect(result.suspiciousKeywords).toEqual(
      expect.arrayContaining(["offshore", "schránková"]),
    );
  });

  it("detects PDF incremental revisions, scripts, metadata and text", async () => {
    const file = new File(
      [
        `%PDF-1.7
<< /Creator (ERP) /Producer (Adobe Photoshop) >>
<< /JavaScript /JS >>
BT
(IBAN SK3111000000002948112001 Suma 10 000 EUR offshore) Tj
ET
%%EOF
%%EOF`,
      ],
      "invoice.pdf",
      { type: "application/pdf" },
    );

    const result = await dissectFile(file);

    expect(result.magicMatch).toBe(true);
    expect(result.metadata["Producer"]).toBe("Adobe Photoshop");
    expect(result.extractedContentText).toContain("IBAN");
    expect(result.anomalies.map((item) => item.id)).toEqual(
      expect.arrayContaining(["ANOM-PDF-01", "ANOM-PDF-02", "ANOM-PDF-03"]),
    );
    expect(result.riskScore).toBeGreaterThan(50);
  });

  it("flags an extension and magic-byte mismatch", async () => {
    const result = await dissectFile(
      new File(["not a pdf"], "evidence.pdf", { type: "application/pdf" }),
    );

    expect(result.magicMatch).toBe(false);
    expect(result.anomalies[0]?.id).toBe("ANOM-MGC-01");
    expect(result.riskLevel).toMatch(/high|critical/);
  });

  it("recursively inspects ZIP entries and extracts nested text", async () => {
    const nested = new JSZip();
    nested.file("notes.txt", "offshore IBAN SK3111000000002948112001");
    const nestedBuffer = await nested.generateAsync({ type: "arraybuffer" });

    const archive = new JSZip();
    archive.file("nested.zip", nestedBuffer);
    archive.file("run.ps1", "Write-Host suspicious");
    const buffer = await archive.generateAsync({ type: "arraybuffer" });

    const result = await dissectFile(
      new File([buffer], "evidence.zip", { type: "application/zip" }),
    );

    expect(result.structureTree[0]?.children?.[0]?.children).toBeDefined();
    expect(result.extractedContentText).toContain("offshore");
    expect(result.anomalies.some((item) => item.id === "ANOM-ZIP-01")).toBe(
      true,
    );
  });

  it("does not reject a valid PNG header when EXIF is absent", async () => {
    const pngHeader = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const result = await dissectFile(
      new File([pngHeader], "scan.png", { type: "image/png" }),
    );

    expect(result.magicMatch).toBe(true);
    expect(result.structureTree[0]?.name).toContain("PNG");
    expect(result.hexSample[0]?.hex).toContain("89 50 4E 47");
  });
});
