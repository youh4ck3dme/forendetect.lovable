import { describe, expect, it } from "vitest";
import {
  buildCompanyEntity,
  buildRegistryRelations,
  findPersonByName,
  normalizeIco,
  parseCompanyRegistryProfile,
  type CompanyRegistryProfile,
  type Entity,
  type StatutoryPersonEntityMapping,
} from "@/forensic";

describe("ICO Atlas - Integrita a ochrana pred poškodením dát", () => {
  const sampleProfilePayload = {
    ico: "31322832",
    legalName: "SLOVNAFT, a.s.",
    legalForm: "akciová spoločnosť",
    registeredAddress: "Vlčie hrdlo 1, 824 12 Bratislava",
    country: "SK",
    status: "active",
    incorporatedAt: "1992-05-01",
    statutoryPersons: [
      {
        name: "Ing. Marek Senkovič",
        role: "predseda predstavenstva",
        validFrom: "2020-07-01",
      },
      {
        name: "Dr. Oszkár Világi",
        role: "člen predstavenstva",
        validFrom: "2010-04-15",
      },
    ],
    businessActivities: [
      "výroba a spracovanie ropných produktov",
      "veľkoobchod s pohonnými hmotami",
    ],
    source: {
      source: "orsr",
      sourceUrl: "https://www.orsr.sk/vypis.asp?ID=123",
      sourceVersion: "v4.1",
      capturedAt: "2026-09-14T10:00:00Z",
      sourceHash: "sha256:abc1234567890",
      confidence: 100,
    },
  };

  it("1. Správne normalizuje a validuje IČO", () => {
    expect(normalizeIco(" 31 322 832 ")).toBe("31322832");
    expect(normalizeIco("SK31322832")).toBe("31322832");
    expect(normalizeIco("abc")).toBe("");
  });

  it("2. Korektne parsuje platný profil a odmieta podvrh bez IČO alebo názvu", () => {
    const profile = parseCompanyRegistryProfile(sampleProfilePayload);
    expect(profile.ico).toBe("31322832");
    expect(profile.legalName).toBe("SLOVNAFT, a.s.");
    expect(profile.statutoryPersons.length).toBe(2);

    expect(() =>
      parseCompanyRegistryProfile({
        ...sampleProfilePayload,
        ico: "",
      }),
    ).toThrow();

    expect(() =>
      parseCompanyRegistryProfile({
        ...sampleProfilePayload,
        legalName: "",
      }),
    ).toThrow();
  });

  it("3. Oprava indexovej chyby: buildRegistryRelations priradí správnu rolu aj pri vynechaní/preskočení prvej osoby", () => {
    const profile = parseCompanyRegistryProfile(sampleProfilePayload);
    const companyId = "ent-company-slovnaft";

    // Simulujeme situáciu z analýzy:
    // Prvá osoba (Ing. Marek Senkovič - predseda) nebola vložená (alebo zlyhala),
    // a bola vložená len druhá osoba (Dr. Oszkár Világi - člen predstavenstva) s entityId "ent-vilagi".
    const mappings: StatutoryPersonEntityMapping[] = [
      {
        personName: "Dr. Oszkár Világi",
        entityId: "ent-vilagi",
      },
    ];

    const relations = buildRegistryRelations(profile, companyId, mappings);

    expect(relations.length).toBe(1);
    expect(relations[0]?.fromId).toBe("ent-vilagi");
    expect(relations[0]?.toId).toBe(companyId);
    // V starom kóde by Világi dostal index 0 ("predseda predstavenstva").
    // V novom kóde s explicitným mapovaním dostane správnu rolu ("člen predstavenstva").
    expect(relations[0]?.label).toBe("člen predstavenstva");
  });

  it("4. findPersonByName správne vyhľadá existujúcu osobu bez ohľadu na veľkosť písmen", () => {
    const existingEntities: Entity[] = [
      {
        id: "ent-p1",
        name: "Dr. Oszkár Világi",
        kind: "person",
        role: "člen predstavenstva",
        country: "SK",
        x: 0,
        y: 0,
      },
      {
        id: "ent-c1",
        name: "SLOVNAFT, a.s.",
        kind: "company",
        role: "akciová spoločnosť",
        country: "SK",
        x: 0,
        y: 0,
      },
    ];

    const found = findPersonByName(existingEntities, "dr. oszkár világi");
    expect(found).toBeDefined();
    expect(found?.id).toBe("ent-p1");

    const notFound = findPersonByName(existingEntities, "Neznáma Osoba");
    expect(notFound).toBeUndefined();
  });

  it("5. Zachováva spätnú kompatibilitu pre pôvodné testy s poľom ID stringov", () => {
    const profile = parseCompanyRegistryProfile(sampleProfilePayload);
    const company = buildCompanyEntity(profile, "case-1");
    const relations = buildRegistryRelations(profile, company.id, [
      "ent-1",
      "ent-2",
    ]);

    expect(relations.length).toBe(2);
    expect(relations[0]?.fromId).toBe("ent-1");
    expect(relations[0]?.label).toBe("predseda predstavenstva");
    expect(relations[1]?.fromId).toBe("ent-2");
    expect(relations[1]?.label).toBe("člen predstavenstva");
  });
});
