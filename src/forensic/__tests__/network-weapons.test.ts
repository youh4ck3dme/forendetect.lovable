import { describe, expect, it } from "vitest";
import {
  analyzeWeapon,
  detectChains,
  detectIsolatedCompanies,
  detectSerialBatches,
  detectVolumeSurge,
  type ForensicCase,
  type Relation,
  type Weapon,
} from "@/forensic";

const baseCase: ForensicCase = {
  id: "case-1",
  name: "Testovací prípad",
  subtitle: "",
  referenceDate: "2026-01-01",
  baseCurrency: "EUR",
  entities: [],
  transactions: [],
  weapons: [],
  relations: [],
  events: [],
  europolSerials: [],
  validLicences: ["LIC-1"],
  orsrAddresses: {},
};

function weapon(overrides: Partial<Weapon> = {}): Weapon {
  return {
    id: "weapon-1",
    brand: "Test",
    model: "Model",
    serial: "ABC-001",
    holderId: "holder-1",
    supplierId: "supplier-1",
    acquiredAt: "2026-01-01",
    licence: "LIC-1",
    ...overrides,
  };
}

describe("network and weapons forensic rules", () => {
  it("detects supplier-to-shell-to-buyer chains and severity", () => {
    const relations: Relation[] = [
      { fromId: "supplier-1", toId: "shell-1", label: "dodáva" },
      { fromId: "supplier-2", toId: "shell-1", label: "dodáva" },
      { fromId: "shell-1", toId: "buyer-1", label: "ovláda" },
      { fromId: "shell-1", toId: "buyer-2", label: "ovláda" },
    ];

    const [chain] = detectChains(relations, [], ["shell-1"]);
    expect(chain).toMatchObject({
      shellId: "shell-1",
      supplierIds: ["supplier-1", "supplier-2"],
      buyerIds: ["buyer-1", "buyer-2"],
      severity: "critical",
    });
  });

  it("ignores shell candidates without both incoming and outgoing edges", () => {
    const relations: Relation[] = [
      { fromId: "supplier-1", toId: "shell-1", label: "dodáva" },
    ];
    expect(detectChains(relations, [], ["shell-1"])).toEqual([]);
  });

  it("marks companies with at most two network relations as isolated", () => {
    const relations: Relation[] = [
      { fromId: "a", toId: "b", label: "1" },
      { fromId: "a", toId: "c", label: "2" },
      { fromId: "a", toId: "d", label: "3" },
    ];
    expect(detectIsolatedCompanies(relations, ["a", "b", "x"])).toEqual([
      "b",
      "x",
    ]);
  });

  it("flags a tracked serial and an invalid licence", () => {
    const result = analyzeWeapon(
      weapon({ serial: "ABC-001", licence: "UNKNOWN" }),
      { ...baseCase, europolSerials: ["ABC001"] },
    );
    expect(result.europolMatch).toBe(true);
    expect(result.invalidLicence).toBe(true);
    expect(result.flags.map((flag) => flag.code)).toEqual([
      "EUROPOL_MATCH",
      "INVALID_LICENSE",
    ]);
  });

  it("detects serial batches shared by multiple holders", () => {
    const weapons = [
      weapon({ id: "1", serial: "ABC-001", holderId: "h1" }),
      weapon({ id: "2", serial: "ABC-002", holderId: "h2" }),
      weapon({ id: "3", serial: "ABC-003", holderId: "h2" }),
      weapon({ id: "4", serial: "XYZ-001", holderId: "h3" }),
    ];
    expect(detectSerialBatches(weapons)).toEqual([
      {
        prefix: "ABC",
        serials: ["ABC-001", "ABC-002", "ABC-003"],
        holderIds: ["h1", "h2"],
      },
    ]);
  });

  it("detects a volume surge only inside the eight-month window", () => {
    const weapons = [
      weapon({ id: "1", acquiredAt: "2026-01-01" }),
      weapon({ id: "2", acquiredAt: "2026-02-01" }),
      weapon({ id: "3", acquiredAt: "2026-03-01" }),
    ];
    expect(detectVolumeSurge(weapons, "holder-1")?.code).toBe("VOLUME_SURGE");
    expect(
      detectVolumeSurge(
        [...weapons, weapon({ id: "4", acquiredAt: "2027-01-01" })],
        "holder-1",
      ),
    ).toBeNull();
  });
});
