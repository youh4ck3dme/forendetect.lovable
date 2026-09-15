import { describe, expect, it } from "vitest";
import { generateLeads } from "@/lib/agent/leads";
import {
  MAX_WEIGHT,
  MIN_WEIGHT,
  nextWeight,
  rankedScore,
  sortByLearnedScore,
} from "@/lib/agent/scoring";
import type { ForensicCase } from "@/forensic";

function baseCase(partial: Partial<ForensicCase> = {}): ForensicCase {
  return {
    id: "c1",
    name: "Test",
    subtitle: "",
    referenceDate: "2026-01-01",
    baseCurrency: "EUR",
    entities: [],
    transactions: [],
    weapons: [],
    relations: [],
    events: [],
    europolSerials: [],
    validLicences: [],
    orsrAddresses: {},
    ...partial,
  };
}

const person = (id: string, name: string) => ({
  id,
  name,
  kind: "person" as const,
  role: "",
  country: "SK",
  x: 0,
  y: 0,
});

const tx = (id: string, date: string, amount: number, fromId: string, toId: string) => ({
  id,
  date,
  amount,
  currency: "EUR",
  method: "transfer" as const,
  fromId,
  toId,
  originCountry: "SK",
  destinationCountry: "SK",
  description: "",
});

describe("generateLeads", () => {
  it("prázdny prípad nevygeneruje žiadne stopy", () => {
    expect(generateLeads({ forensicCase: baseCase() })).toEqual([]);
  });

  it("odhalí neuzavretý tok cez medzičlánok", () => {
    const leads = generateLeads({
      forensicCase: baseCase({
        entities: [person("a", "A"), person("b", "B"), person("c", "C")],
        transactions: [
          tx("t1", "2026-01-01", 10000, "a", "b"),
          tx("t2", "2026-01-04", 9800, "b", "c"),
        ],
        relations: [
          { fromId: "a", toId: "b", label: "obchod" },
          { fromId: "b", toId: "c", label: "obchod" },
        ],
      }),
    });
    expect(leads.some((l) => l.leadType === "unclosed_flow")).toBe(true);
  });

  it("odhalí chýbajúci vzťah pri opakovaných tokoch", () => {
    const leads = generateLeads({
      forensicCase: baseCase({
        entities: [person("a", "A"), person("b", "B")],
        transactions: [
          tx("t1", "2026-01-01", 100, "a", "b"),
          tx("t2", "2026-01-02", 200, "a", "b"),
        ],
      }),
    });
    expect(leads.some((l) => l.leadType === "missing_link")).toBe(true);
  });

  it("odhalí osamotenú entitu a medzeru v dátach", () => {
    const leads = generateLeads({
      forensicCase: baseCase({
        entities: [person("a", "A"), person("b", "B"), person("z", "Z")],
        transactions: [
          tx("t1", "2026-01-01", 100, "a", "b"),
          tx("t2", "2026-06-01", 100, "a", "b"),
        ],
      }),
    });
    expect(leads.some((l) => l.leadType === "isolated_entity")).toBe(true);
    expect(leads.some((l) => l.leadType === "data_gap")).toBe(true);
  });

  it("je deterministické — rovnaké dáta, rovnaké fingerprinty", () => {
    const input = {
      forensicCase: baseCase({
        entities: [person("a", "A"), person("b", "B")],
        transactions: [
          tx("t1", "2026-01-01", 500, "a", "b"),
          tx("t2", "2026-01-02", 500, "a", "b"),
          tx("t3", "2026-01-03", 500, "a", "b"),
        ],
      }),
    };
    const first = generateLeads(input).map((l) => l.fingerprint);
    const second = generateLeads(input).map((l) => l.fingerprint);
    expect(first).toEqual(second);
    expect(first.some((f) => f.startsWith("amount_pattern:"))).toBe(true);
  });

  it("nepokrytý rizikový nález sa stane stopou", () => {
    const leads = generateLeads({
      forensicCase: baseCase(),
      highRiskFindings: [{ id: "f1", label: "Vysoké riziko" }],
    });
    expect(leads[0]?.leadType).toBe("uncovered_finding");
  });
});

describe("učenie z rozhodnutí", () => {
  it("sledovanie zvyšuje a odmietnutie znižuje váhu v hraniciach", () => {
    expect(nextWeight(1, "follow")).toBeGreaterThan(1);
    expect(nextWeight(1, "dismiss")).toBeLessThan(1);
    expect(nextWeight(MAX_WEIGHT, "follow")).toBe(MAX_WEIGHT);
    expect(nextWeight(MIN_WEIGHT, "dismiss")).toBe(MIN_WEIGHT);
    expect(nextWeight(1, "new")).toBe(1);
  });

  it("naučená váha mení poradie stôp", () => {
    const leads = [
      { fingerprint: "a", leadType: "data_gap" as const, baseScore: 0.6 },
      { fingerprint: "b", leadType: "missing_link" as const, baseScore: 0.5 },
    ];
    const sorted = sortByLearnedScore(leads, { missing_link: 1.8, data_gap: 0.4 });
    expect(sorted[0]?.fingerprint).toBe("b");
    expect(rankedScore(0.5, "missing_link", { missing_link: 2 })).toBe(1);
  });
});
