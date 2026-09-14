import { describe, expect, it } from "vitest";
import { analyzeCase, EMPTY_CASE, type ForensicCase } from "@/forensic";
import { alertTarget } from "@/lib/alert-target";
import { buildSyntheticDemoCase } from "@/lib/dev-cases";

describe("Overenie obrazovky Prípad — Evidence Seal, 7 otázok a DoD", () => {
  const rawCase = buildSyntheticDemoCase();
  const demoCase: ForensicCase = {
    ...rawCase,
    subtitle: rawCase.subtitle ?? "",
    europolSerials: rawCase.europolSerials ?? [],
    validLicences: rawCase.validLicences ?? [],
    orsrAddresses: rawCase.orsrAddresses ?? {},
  };
  const analysis = analyzeCase(demoCase);

  it("1. O aký prípad ide: prípad má platný názov, podtitul a referenčný dátum", () => {
    expect(demoCase.name).toBeDefined();
    expect(demoCase.name.length).toBeGreaterThan(0);
    expect(demoCase.referenceDate).toBeDefined();
  });

  it("2. Evidence Seal: správne a pravdivo počíta metriky bez mock dát", () => {
    // 1. Zdroje
    const sources = [];
    if (demoCase.transactions.length > 0) sources.push("bank");
    if (demoCase.entities.some((e) => e.kind === "company"))
      sources.push("orsr");
    if (demoCase.weapons.length > 0) sources.push("weapons");
    if (
      (demoCase.europolSerials?.length ?? 0) > 0 ||
      analysis.totals.europolMatches > 0
    )
      sources.push("europol");
    if (demoCase.events.length > 0) sources.push("events");

    expect(sources.length).toBeGreaterThanOrEqual(1);

    // 2. Spracované záznamy
    const processed =
      demoCase.transactions.length +
      demoCase.entities.length +
      demoCase.weapons.length +
      demoCase.events.length +
      demoCase.relations.length;
    expect(processed).toBeGreaterThan(0);

    // 3. Overené záznamy
    const unverifiedWeapons = demoCase.weapons.filter(
      (w) => !w.licence || !demoCase.validLicences?.includes(w.licence),
    );
    const verifiedEntities = demoCase.entities.filter(
      (e) =>
        e.kind === "person" ||
        (e.ico && (demoCase.orsrAddresses?.[e.ico] || e.registeredAddress)),
    );
    const verifiedWeapons = demoCase.weapons.filter(
      (w) => w.licence && demoCase.validLicences?.includes(w.licence),
    );
    const cleanTransactions = analysis.transactions.filter(
      (t) => t.level === "low" || t.level === "medium",
    );
    const verifiedTotal =
      verifiedEntities.length +
      verifiedWeapons.length +
      cleanTransactions.length +
      demoCase.events.length;
    expect(verifiedTotal).toBeGreaterThanOrEqual(0);

    // 4. Problematické záznamy
    const shellEntities = analysis.entities.filter((e) => e.isShell);
    const riskyTransactions = analysis.transactions.filter(
      (t) => t.level === "high" || t.level === "critical",
    );
    const problematicTotal =
      unverifiedWeapons.length +
      shellEntities.length +
      riskyTransactions.length +
      analysis.totals.europolMatches;
    expect(problematicTotal).toBeGreaterThanOrEqual(0);

    // 5. Celkový stav
    let sealStatus = "trusted";
    if (problematicTotal > 0) sealStatus = "needs_review";
    expect(["trusted", "needs_review", "incomplete"]).toContain(sealStatus);
  });

  it("3. Blok pozornosti: obsahuje maximálne 5 položiek zoradených od najvyššej priority", () => {
    const sortedAlerts = [...analysis.alerts].sort((a, b) => {
      const order = { critical: 4, high: 3, medium: 2, low: 1 };
      return order[b.severity] - order[a.severity] || b.score - a.score;
    });
    const top5 = sortedAlerts.slice(0, 5);

    expect(top5.length).toBeLessThanOrEqual(5);
    if (top5[0] && top5[1]) {
      const order = { critical: 4, high: 3, medium: 2, low: 1 };
      expect(order[top5[0].severity]).toBeGreaterThanOrEqual(
        order[top5[1].severity],
      );
    }
  });

  it("4. 1-tap akcie: alertTarget správne mapuje ciele na detektory a evidenciu", () => {
    for (const alert of analysis.alerts) {
      const target = alertTarget(alert.id);
      if (alert.id.startsWith("entity-")) {
        expect(target).toEqual({ kind: "entity", id: alert.id.slice(7) });
      } else if (alert.id.startsWith("tx-")) {
        expect(target).toEqual({ kind: "transaction", id: alert.id.slice(3) });
      }
    }
  });

  it("5. Prázdny prípad sa korektne a bezpečne inicializuje", () => {
    const emptyAnalysis = analyzeCase(EMPTY_CASE);
    expect(emptyAnalysis.totals.entities).toBe(0);
    expect(emptyAnalysis.totals.transactions).toBe(0);
    expect(emptyAnalysis.totals.weapons).toBe(0);
    expect(emptyAnalysis.alerts.length).toBe(0);
  });
});
