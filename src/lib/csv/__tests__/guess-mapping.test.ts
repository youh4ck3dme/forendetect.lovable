import { describe, expect, it } from "vitest";
import {
  EMPTY_MAPPING,
  guessMapping,
  mergeMappingSuggestion,
} from "@/lib/csv/mapping";

describe("guessMapping", () => {
  it("rozpozná slovenské názvy stĺpcov", () => {
    const m = guessMapping([
      "Dátum",
      "Suma",
      "Mena",
      "Odosielateľ",
      "Príjemca",
      "Popis",
      "Spôsob platby",
    ]);
    expect(m.date).toBe(0);
    expect(m.amount).toBe(1);
    expect(m.currency).toBe(2);
    expect(m.counterpartyFrom).toBe(3);
    expect(m.counterpartyTo).toBe(4);
    expect(m.description).toBe(5);
    expect(m.method).toBe(6);
  });

  it("rozpozná anglické názvy a nepriradí jeden stĺpec dvakrát", () => {
    const m = guessMapping(["Date", "Amount", "Sender", "Beneficiary"]);
    expect(m.date).toBe(0);
    expect(m.amount).toBe(1);
    expect(m.counterpartyFrom).toBe(2);
    expect(m.counterpartyTo).toBe(3);
    const used = Object.values(m).filter((i) => i >= 0);
    expect(new Set(used).size).toBe(used.length);
  });

  it("neznáme hlavičky nechá nepriradené", () => {
    expect(guessMapping(["a", "b"])).toEqual(EMPTY_MAPPING);
  });
});

describe("mergeMappingSuggestion", () => {
  const base = { ...EMPTY_MAPPING, date: 0 };

  it("doplní iba chýbajúce polia a neprepíše rozpoznané", () => {
    const merged = mergeMappingSuggestion(base, { date: 3, amount: 1 }, 4);
    expect(merged.date).toBe(0);
    expect(merged.amount).toBe(1);
  });

  it("odmietne neplatné, mimo rozsahu a duplicitné indexy", () => {
    const merged = mergeMappingSuggestion(
      base,
      { amount: 9, currency: -2, counterpartyFrom: 0, counterpartyTo: 1.5 },
      4,
    );
    expect(merged.amount).toBe(-1);
    expect(merged.currency).toBe(-1);
    expect(merged.counterpartyFrom).toBe(-1);
    expect(merged.counterpartyTo).toBe(-1);
  });
});
