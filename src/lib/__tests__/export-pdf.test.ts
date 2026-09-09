import { describe, expect, it } from "vitest";
import { buildReportHTML } from "@/lib/export-pdf";
import type { ForensicDossier } from "@/lib/types";

const mockDossier: ForensicDossier = {
  caseId: "PPZ-51/UBOK-PZ-ST-2025",
  caseTitle: "Kauza Tatragen & Babčan",
  defendabilityIndex: 42,
  generatedAt: "2026-09-08T04:00:00.000Z",
  facts: {
    timeline: [
      {
        time: "2025-03-12 10:30",
        event: "Zaistenie vozidla BMW s pečiatkami",
        source: "Zápisnica č. 1",
        chainBreak: false,
        severity: "info",
        paragraph: "§ 98 TP",
      },
    ],
    traces: [
      {
        id: "TR-01",
        type: "balistická",
        description: "Glock 19 Gen 5",
        light: "green",
        chainComplete: true,
        lr: "> 1 000 000",
        paragraph: "§ 119 TP",
      },
    ],
  },
  defenseAttack: {
    overallRisk: "VYSOKÉ",
    attacks: [
      {
        id: "DA-1",
        defenseClaim: "Zbrane som v živote neprevzal",
        risk: "KRITICKÉ",
        counterStrike: "Svedok 3x overil totožnosť z OP",
        evidenceGap: "Chýba grafologický posudok podpisu",
        paragraph: "§ 125 TP",
      },
    ],
  },
  evidenceStrength: {
    traces: [
      {
        id: "TR-01",
        name: "Glock 19 Gen 5",
        lr: "> 1 000 000",
        strength: "Nepriestrelné",
        light: "green",
        paragraph: "§ 119 ods. 2 TP",
      },
    ],
    paragraphs: [
      {
        para: "§ 294 TZ",
        title: "Nedovolené ozbrojovanie",
        status: "OK",
        note: "Znaky naplnené",
      },
    ],
  },
  judgeReadyText: {
    skutkovyStav: "Obvinený Babčan zabezpečil financovanie nákupu zbraní.",
    vyporiadanie: "Tvrdenie obhajoby o nevedomosti je vyvrátené svedeckými výpoveďami.",
    vedecke: "Balistická expertíza KEU PZ preukázala zhodu s LR prevyšujúcim 1 000 000.",
  },
};

describe("export-pdf (§ 168 TP Rozsudkový formát)", () => {
  it("generuje kompletný HTML dokument s hlavičkou spisu a CSS tlačou", () => {
    const html = buildReportHTML(mockDossier);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("FORENZNÝ REPORT — Kauza Tatragen & Babčan");
    expect(html).toContain("PPZ-51/UBOK-PZ-ST-2025");
    expect(html).toContain("@page { margin: 2cm; }");
    expect(html).toContain("42/100");
  });

  it("obsahuje všetky tri zákonom požadované oddiely podľa § 168 TP", () => {
    const html = buildReportHTML(mockDossier);

    expect(html).toContain("I. Zistený skutkový stav");
    expect(html).toContain("Obvinený Babčan zabezpečil financovanie nákupu zbraní.");

    expect(html).toContain("II. Vyporiadanie sa s obhajobou obvineného (§ 168 TP)");
    expect(html).toContain("Tvrdenie obhajoby o nevedomosti je vyvrátené");
    expect(html).toContain("Zbrane som v živote neprevzal");
    expect(html).toContain("Svedok 3x overil totožnosť z OP");

    expect(html).toContain("III. Vedecké zhodnotenie stôp");
    expect(html).toContain("Balistická expertíza KEU PZ preukázala zhodu");
    expect(html).toContain("> 1 000 000");
  });
});
