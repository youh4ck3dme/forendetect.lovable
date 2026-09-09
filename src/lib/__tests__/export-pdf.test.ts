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
    vyporiadanie:
      "Tvrdenie obhajoby o nevedomosti je vyvrátené svedeckými výpoveďami.",
    vedecke:
      "Balistická expertíza KEU PZ preukázala zhodu s LR prevyšujúcim 1 000 000.",
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
    expect(html).toContain(
      "Obvinený Babčan zabezpečil financovanie nákupu zbraní.",
    );

    expect(html).toContain(
      "II. Vyporiadanie sa s obhajobou obvineného (§ 168 TP)",
    );
    expect(html).toContain("Tvrdenie obhajoby o nevedomosti je vyvrátené");
    expect(html).toContain("Zbrane som v živote neprevzal");
    expect(html).toContain("Svedok 3x overil totožnosť z OP");

    expect(html).toContain("III. Vedecké zhodnotenie stôp");
    expect(html).toContain("Balistická expertíza KEU PZ preukázala zhodu");
    expect(html).toContain("> 1 000 000");
  });

  it("vypočíta platný a overiteľný kryptografický SHA-256 hash dossieru", async () => {
    const { computeDossierSha256, sha256Hex } =
      await import("@/lib/export-pdf");
    const nodeCrypto = await import("node:crypto");

    // 1. Overenie štandardu NIST FIPS 180-4
    expect(sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );

    // 2. Overenie voči natívnemu Node crypto
    const sampleText =
      "Kauza Tatragen PPZ-51/UBOK-PZ-ST-2025 s diakritikou Žilina a Erik Babčan";
    const expectedHash = nodeCrypto
      .createHash("sha256")
      .update(sampleText, "utf8")
      .digest("hex");
    expect(sha256Hex(sampleText)).toBe(expectedHash);

    // 3. Výpočet hashu pre mockDossier
    const dossierHash = computeDossierSha256(mockDossier);
    expect(dossierHash).toMatch(/^[0-9a-f]{64}$/);

    // 4. Overenie detekcie manipulácie (tamper-evidence)
    const modifiedDossier = {
      ...mockDossier,
      defendabilityIndex: 43,
    };
    const modifiedHash = computeDossierSha256(modifiedDossier);
    expect(modifiedHash).not.toBe(dossierHash);

    // 5. Overenie prítomnosti a zhody hashu vo vygenerovanom HTML posudku
    const html = buildReportHTML(mockDossier);
    expect(html).toContain(dossierHash);
    expect(html).toContain(
      `Kryptografický odtlačok spisu (SHA-256): <code>${dossierHash}</code>`,
    );
    expect(html).toContain(
      "V. Doložka integrity a nemennosti elektronického spisu (§ 119 ods. 2 TP)",
    );
  });

  it("správne naformátuje tabuľky rozporov podľa § 125 TP a finančné toky podľa § 119 TP", () => {
    const fullDossier: ForensicDossier = {
      ...mockDossier,
      investigativeAnswers: {
        q1_buyer_seller: {
          questionNumber: 1,
          question: "Kto nakupoval zbrane a kto ich odovzdával?",
          answer: "Erik Babčan a Marek Plch nakupovali v Tatragene.",
          identifiedPersons: ["Erik Babčan", "Marek Plch"],
          directEvidence: ["Kniha zbraní", "Zálohové faktúry"],
          unverifiedHypotheses: [],
          missingEvidence: ["Originál licencie"],
          confidenceLevel: 95,
        },
        q2_planner_coordinator: {
          questionNumber: 2,
          question: "Kto plán vymyslel a koordinoval?",
          answer: "Dimitri Cohen a osoba Ľubo.",
          identifiedPersons: ["Dimitri Cohen", "Ľubo"],
          directEvidence: ["Výsluch Marjov", "Nájdené pečiatky"],
          unverifiedHypotheses: [],
          missingEvidence: [],
          confidenceLevel: 90,
        },
        q3_financier: {
          questionNumber: 3,
          question: "Kto plán financoval?",
          answer: "Hotovostné vklady v Tatrabanke a pôžičky.",
          identifiedPersons: ["Ľubo", "Erik Babčan"],
          directEvidence: ["Výpisy z účtu Tatrabanka"],
          unverifiedHypotheses: [],
          missingEvidence: [],
          confidenceLevel: 85,
        },
      },
      testimonyContradictions: [
        {
          id: "TC-01",
          topic: "Osobné prevzatie 242 zbraní v TATRAGEN s.r.o.",
          personA: {
            name: "Erik Babčan",
            status: "obvinený",
            claim: "V TATRAGENe som v živote nebol a Plcha nepoznám.",
          },
          factualRecord:
            "Svedok Plch potvrdil 3 osobné stretnutia, predloženie OP a podpisy v knihe.",
          deceitPercentage: 95,
          contradictionSeverity: "critical",
          proceduralResolution:
            "Nariadiť konfrontáciu podľa § 125 TP medzi Babčanom a Plchom.",
        },
      ],
      financialAnalysis: {
        totalVolume: 128400,
        cashVolume: 96000,
        transferVolume: 32400,
        cashRatioPercent: 74.8,
        financingConclusion:
          "Vysoký podiel hotovostných vkladov pred nákupom zbraní.",
        suspiciousFlows: [
          {
            id: "SF-01",
            date: "2025-01-23",
            payer: "Hotovosť (Ľubo)",
            recipient: "EB-EU s.r.o.",
            amount: 25000,
            method: "cash_deposit",
            purpose: "Vklad konateľa na nákup tovaru",
            redFlag: "Vklad tesne pred nákupom zbraní bez preukázania pôvodu",
          },
        ],
      },
    };

    const html = buildReportHTML(fullDossier);

    // Overenie tabuľky rozporov (§ 125 TP)
    expect(html).toContain(
      "Rozpory vo výpovediach & Matica pravdovravnosti (§ 125 TP — Konfrontácia)",
    );
    expect(html).toContain("Osobné prevzatie 242 zbraní v TATRAGEN s.r.o.");
    expect(html).toContain("V TATRAGENe som v živote nebol a Plcha nepoznám.");
    expect(html).toContain("Svedok Plch potvrdil 3 osobné stretnutia");
    expect(html).toContain("95 %");
    expect(html).toContain(
      "Nariadiť konfrontáciu podľa § 125 TP medzi Babčanom a Plchom.",
    );

    // Overenie finančných tokov (§ 119 ods. 1 písm. f) TP)
    expect(html).toContain(
      "Forenzná analýza transakcií a tokov financií (§ 119 ods. 1 písm. f) TP)",
    );
    expect(html).toContain("128 400 €");
    expect(html).toContain("74.8 %");
    expect(html).toContain("Hotovosť (Ľubo) ➔ EB-EU s.r.o.");

    // Overenie dôkazovej matice stôp (ENFSI & § 119 ods. 2 TP)
    expect(html).toContain(
      "Dôkazová matica stôp (§ 119 ods. 2 TP & ENFSI metodika)",
    );

    // Overenie znaleckého osvedčenia a podpisovej doložky
    expect(html).toContain("Znalcovo a procesné osvedčenie:");
    expect(html).toContain("Dozorujúci prokurátor / Predseda senátu");
  });
});
