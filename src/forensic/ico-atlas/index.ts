import { z } from "zod";
import type { Entity, Flag, Relation, SourceRecord } from "../types";
import {
  deduplicateStrings,
  normalizeAddress,
  normalizeCompanyName,
  normalizeCountry,
  normalizeIco,
} from "../normalization";

export type StatutoryPerson = {
  name: string;
  role?: string;
  validFrom?: string;
  validTo?: string;
};

export type AddressHistoryItem = {
  address: string;
  validFrom?: string;
  validTo?: string;
};

export type CompanyRegistryProfile = {
  ico: string;
  legalName: string;
  legalForm?: string;
  registeredAddress?: string;
  country: string;
  status?: string;
  incorporatedAt?: string;
  dissolvedAt?: string;
  statutoryPersons: StatutoryPerson[];
  businessActivities: string[];
  addressHistory?: AddressHistoryItem[];
  source: SourceRecord;
};

const SourceRecordSchema = z.object({
  id: z.string().default(() => `src-${Date.now()}`),
  source: z.enum([
    "manual",
    "csv-import",
    "document",
    "ico-atlas",
    "orsr",
    "dimitri-checker",
    "ai",
  ]),
  sourceVersion: z.string().optional(),
  sourceUrl: z.string().optional(),
  capturedAt: z.string().min(1, "Chýba čas získania (capturedAt)"),
  sourceHash: z.string().optional(),
  confidence: z
    .number()
    .min(0, "Confidence musí byť minimálne 0")
    .max(100, "Confidence musí byť maximálne 100")
    .optional(),
  rawReference: z.string().optional(),
});

const StatutoryPersonSchema = z.object({
  name: z.string().min(1, "Meno štatutára je povinné"),
  role: z.string().optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
});

const AddressHistorySchema = z.object({
  address: z.string().min(1, "Adresa v histórii nesmie byť prázdna"),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
});

export const CompanyRegistryProfileSchema = z.object({
  ico: z.string().min(1, "Chýba IČO"),
  legalName: z.string().min(1, "Chýba názov firmy (legalName)"),
  legalForm: z.string().optional(),
  registeredAddress: z.string().optional(),
  country: z.string().default("SK"),
  status: z.string().optional(),
  incorporatedAt: z.string().optional(),
  dissolvedAt: z.string().optional(),
  statutoryPersons: z.array(StatutoryPersonSchema).default([]),
  businessActivities: z.array(z.string()).default([]),
  addressHistory: z.array(AddressHistorySchema).optional(),
  source: SourceRecordSchema,
});

/**
 * Validuje a parseruje profil z ICO Atlas.
 */
export function parseCompanyRegistryProfile(
  input: unknown,
): CompanyRegistryProfile {
  const parsed = CompanyRegistryProfileSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.join(".");
    throw new Error(
      `Neplatné dáta profilu ICO Atlas: ${field ? `${field} — ` : ""}${issue?.message || "neznáma chyba"}`,
    );
  }

  const raw = parsed.data;
  const normalizedIco = normalizeIco(raw.ico);
  if (!normalizedIco) {
    throw new Error("IČO po normalizácii je neplatné.");
  }

  const normalizedLegalName = normalizeCompanyName(raw.legalName);
  if (!normalizedLegalName) {
    throw new Error("Názov firmy je povinný.");
  }

  // Deduplikácia štatutárov
  const personSeen = new Set<string>();
  const statutoryPersons: StatutoryPerson[] = [];
  for (const person of raw.statutoryPersons) {
    const key = `${person.name.trim().toLowerCase()}|${(person.role || "").trim().toLowerCase()}`;
    if (!personSeen.has(key)) {
      personSeen.add(key);
      statutoryPersons.push({
        ...person,
        name: person.name.trim(),
        role: person.role ? person.role.trim() : undefined,
      });
    }
  }

  // Deduplikácia činností
  const businessActivities = deduplicateStrings(raw.businessActivities);

  return {
    ...raw,
    ico: normalizedIco,
    legalName: normalizedLegalName,
    country: normalizeCountry(raw.country),
    registeredAddress: raw.registeredAddress
      ? normalizeAddress(raw.registeredAddress)
      : undefined,
    statutoryPersons,
    businessActivities,
  };
}

/**
 * Vyhľadá existujúcu entitu firmy podľa normalizovaného IČO.
 */
export function findEntityByIco(
  entities: Entity[],
  ico: string,
): Entity | undefined {
  if (!ico || !entities) return undefined;
  const target = normalizeIco(ico);
  return entities.find(
    (e) => e.kind === "company" && e.ico && normalizeIco(e.ico) === target,
  );
}

/**
 * Vytvorí objekt Entity pre firmu z profilu ICO Atlas.
 */
export function buildCompanyEntity(
  profile: CompanyRegistryProfile,
  caseId: string,
  existingEntityId?: string,
): Entity {
  const id =
    existingEntityId ||
    `ent-company-${profile.ico.toLowerCase()}-${Date.now()}`;
  return {
    id,
    name: profile.legalName,
    kind: "company",
    role: profile.legalForm || "spoločnosť",
    ico: profile.ico,
    address: profile.registeredAddress,
    registeredAddress: profile.registeredAddress,
    country: profile.country,
    incorporatedAt: profile.incorporatedAt,
    responsive: profile.status?.toLowerCase() === "active",
    x: 100,
    y: 100,
    note: `Zdroj: ICO Atlas (${profile.source.capturedAt})`,
  };
}

/**
 * Vytvorí objekty Entity pre štatutárov z profilu ICO Atlas.
 */
export function buildStatutoryPersonEntities(
  profile: CompanyRegistryProfile,
  companyEntityId: string,
): Entity[] {
  return profile.statutoryPersons.map((person, index) => {
    const slug = person.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");
    const id = `ent-person-${slug}-${index + 1}-${Date.now().toString(36)}`;
    return {
      id,
      name: person.name,
      kind: "person",
      role: person.role || "štatutárny orgán",
      country: profile.country,
      x: 50 + index * 30,
      y: 150 + index * 20,
      note: `Štatutár spoločnosti ${profile.legalName} (IČO: ${profile.ico})`,
    };
  });
}

/**
 * Vytvorí relácie medzi štatutármi a firmou.
 */
export function buildRegistryRelations(
  profile: CompanyRegistryProfile,
  companyEntityId: string,
  personEntityIds: string[],
): Relation[] {
  return personEntityIds.map((personId, index) => {
    const person = profile.statutoryPersons[index];
    const label = person?.role || "štatutárny orgán";
    return {
      fromId: personId,
      toId: companyEntityId,
      label,
    };
  });
}

/**
 * Vytvorí heuristické indikátory (Flagy) z profilu registra.
 * POZNÁMKA: Vždy používa neutrálne formulácie ("Indikátor vyžadujúci preverenie").
 */
export function buildRegistryFindings(
  profile: CompanyRegistryProfile,
  existingEntity?: Entity,
): Flag[] {
  const flags: Flag[] = [];
  const evidenceRef = { type: "company-profile" as const, id: profile.ico };

  // 1. Rozdiel medzi manuálne evidovanou a registrovanou adresou
  if (
    existingEntity?.address &&
    profile.registeredAddress &&
    normalizeAddress(existingEntity.address).toLowerCase() !==
      normalizeAddress(profile.registeredAddress).toLowerCase()
  ) {
    flags.push({
      code: "ADDRESS_MISMATCH",
      label: "Rozdiel v adrese subjektu",
      detail: `Indikátor vyžadujúci preverenie: Evidovaná adresa ("${existingEntity.address}") sa nezhoduje s registrovanou adresou ("${profile.registeredAddress}").`,
      weight: 15,
      severity: "medium",
      kind: "heuristika",
      evidence: [evidenceRef],
      values: {
        manualAddress: existingEntity.address,
        registeredAddress: profile.registeredAddress,
      },
    });
  }

  // 2. Neaktívny status firmy
  if (profile.status && profile.status.toLowerCase() !== "active") {
    flags.push({
      code: "INACTIVE_COMPANY_STATUS",
      label: "Neaktívny status v registri",
      detail: `Indikátor vyžadujúci preverenie: Spoločnosť má v registri evidovaný status "${profile.status}".`,
      weight: 25,
      severity: "high",
      kind: "heuristika",
      evidence: [evidenceRef],
      values: {
        status: profile.status,
      },
    });
  }

  // 3. Firma bez evidovaných činností
  if (!profile.businessActivities || profile.businessActivities.length === 0) {
    flags.push({
      code: "NO_BUSINESS_ACTIVITIES",
      label: "Absencia predpisov činnosti",
      detail:
        "Indikátor vyžadujúci preverenie: Subjekt nemá v registri evidované žiadne predmety podnikateľskej činnosti.",
      weight: 10,
      severity: "medium",
      kind: "heuristika",
      evidence: [evidenceRef],
    });
  }

  // 4. Zmena adresy v histórii
  if (profile.addressHistory && profile.addressHistory.length > 1) {
    flags.push({
      code: "ADDRESS_HISTORY_CHANGES",
      label: "História zmien adresy",
      detail: `Indikátor vyžadujúci preverenie: Spoločnosť má evidované ${profile.addressHistory.length} zmeny sídla v histórii.`,
      weight: 10,
      severity: "low",
      kind: "heuristika",
      evidence: [evidenceRef],
      values: {
        historyCount: profile.addressHistory.length,
      },
    });
  }

  return flags;
}
