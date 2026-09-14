import crypto from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  canonicalJsonStringify,
  isValidIco,
  normalizeCountry,
  normalizeIco,
  parseCompanyRegistryProfile,
} from "@/forensic";

/* Supabase tables without generated schema types are isolated to this module. */
/* eslint-disable @typescript-eslint/no-explicit-any */

const uuid = z.string().uuid();

function fail(
  error: { message?: string; code?: string } | null,
  fallback: string,
): never {
  if (error?.code === "42501")
    throw new Error("Nemáte oprávnenie na túto operáciu.");
  throw new Error(error?.message ? `${fallback} (${error.message})` : fallback);
}

/**
 * Vyhľadá skutočný profil firmy z ICO Atlas API (Laravel backend).
 * Overí IČO a krajinu voči požiadavke, odvodí serverový hash integrity,
 * a uloží nemenný snapshot do databázy viazaný na používateľa a prípad.
 * NIKDY nevytvára falošné mock dáta pri nedostupnosti.
 */
export interface RegistryLookupContext {
  supabase: any;
  userId: string;
  adminClient?: any;
  claims?: any;
}

export async function handleLookupCompanyRegistryByIco(
  data: { caseId: string; ico: string; country?: string },
  context: RegistryLookupContext,
  customFetch?: typeof fetch,
) {
  const { supabase, userId } = context;
  const fetchFn = customFetch || fetch;

  // 1. Overenie vlastníctva prípadu
  const { data: ownedCase, error: caseErr } = await supabase
    .from("cases")
    .select("id")
    .eq("id", data.caseId)
    .eq("user_id", userId)
    .maybeSingle();

  if (caseErr) fail(caseErr, "Nepodarilo sa overiť prípad.");
  if (!ownedCase) {
    throw new Error("Prípad sa nenašiel alebo naň nemáte oprávnenie.");
  }

  // 2. Normalizácia a prísna validácia IČO a krajiny
  const cleanIco = normalizeIco(data.ico);
  const cleanCountry = normalizeCountry(data.country || "SK");

  if (!cleanIco || !isValidIco(cleanIco)) {
    throw new Error(
      "Zadané IČO má neplatný formát. IČO musí obsahovať 6 až 10 číslic.",
    );
  }

  // 3. Iba serverová konfigurácia bez klientskych fallbackov
  const apiUrl = process.env["ICO_ATLAS_API_URL"];
  const apiKey = process.env["ICO_ATLAS_API_KEY"];

  if (!apiUrl || !apiKey) {
    throw new Error(
      "Konfigurácia ICO Atlas (ICO_ATLAS_API_URL / ICO_ATLAS_API_KEY) chýba na serveri. Služba nie je nakonfigurovaná.",
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s limit

  try {
    const url = `${apiUrl.replace(/\/+$/, "")}/api/v1/companies/${encodeURIComponent(cleanCountry)}/${encodeURIComponent(cleanIco)}`;

    let response: Response;
    try {
      response = await fetchFn(url, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      });
    } catch (netErr: any) {
      if (netErr.name === "AbortError") {
        throw new Error("Časový limit požiadavky na register vypršal (10s).");
      }
      throw new Error(
        `Služba ICO Atlas nie je dostupná na ${apiUrl} (${netErr.message || "spojenie odmietnuté"}). Skontrolujte, či beží Laravel backend. Falošné dáta sa negenerujú.`,
      );
    }

    if (response.status === 404) {
      throw new Error(
        `Subjekt s IČO ${cleanIco} sa v registri ${cleanCountry} nenašiel (ORSR / RÚZ).`,
      );
    }

    if (response.status === 422) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(
        (errJson as any)?.message ||
          `Neplatný formát identifikátora IČO ${cleanIco}.`,
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Chyba autentifikácie: Služba ICO Atlas odmietla prístup (401/403).",
      );
    }

    if (response.status === 429) {
      throw new Error(
        "Prekročený limit volaní registra (429 Too Many Requests). Skúste to prosím neskôr.",
      );
    }

    if (!response.ok) {
      throw new Error(
        `Služba registra vrátila chybu ${response.status}: ${response.statusText}`,
      );
    }

    const rawJson = await response.json();
    const profile = parseCompanyRegistryProfile(rawJson);

    // 4. Bezpečnostná kontrola: overenie, že vrátené IČO a krajina zodpovedajú požiadavke
    if (
      normalizeIco(profile.ico) !== cleanIco ||
      normalizeCountry(profile.country) !== cleanCountry
    ) {
      throw new Error(
        "Bezpečnostná chyba: Vrátené IČO alebo krajina nezodpovedá zadanej požiadavke.",
      );
    }

    // 5. Serverom odvodený nemenný hash (SHA-256) pomocou kanonickej serializácie
    const canonicalPayload = canonicalJsonStringify(rawJson);
    const canonicalHash =
      "sha256:" +
      crypto.createHash("sha256").update(canonicalPayload).digest("hex");

    profile.source.sourceHash = canonicalHash;
    profile.source.source = rawJson.source?.source || "orsr";
    // Zachovávame pravdivý čas získania zo zdroja bez prepisovania aktuálnym časom importu
    if (rawJson.source?.capturedAt) {
      profile.source.capturedAt = rawJson.source.capturedAt;
    }
    // Neodvodzujeme automatické confidence=100; zachovávame dôveryhodnosť poskytovateľa
    if (
      rawJson.source?.confidence !== undefined &&
      rawJson.source?.confidence !== null
    ) {
      profile.source.confidence = rawJson.source.confidence;
    }

    // 6. Uloženie nemenného snapshotu chráneného pred klientskym zápisom
    // Zápis do company_registry_profiles vykonáva výhradne serverový klient s oddelenými oprávneniami (service_role)
    const adminClient =
      (context as any).adminClient ??
      (process.env["SUPABASE_SERVICE_ROLE_KEY"]
        ? (await import("@/integrations/supabase/client.server")).supabaseAdmin
        : null);

    if (!adminClient) {
      throw new Error(
        "Konfiguračná chyba servera: Chýba SUPABASE_SERVICE_ROLE_KEY pre bezpečný serverový zápis registrového snapshotu.",
      );
    }

    const { data: existingSnapshot } = await (
      adminClient.from("company_registry_profiles" as any) as any
    )
      .select("id, entity_id")
      .eq("case_id", data.caseId)
      .eq("ico", cleanIco)
      .eq("source_hash", canonicalHash)
      .maybeSingle();

    let snapshotId: string;
    if (existingSnapshot?.id) {
      snapshotId = existingSnapshot.id;
    } else {
      const { data: insertedSnapshot, error: snapErr } = await (
        adminClient.from("company_registry_profiles" as any) as any
      )
        .insert({
          case_id: data.caseId,
          user_id: userId,
          ico: profile.ico,
          legal_name: profile.legalName,
          legal_form: profile.legalForm ?? null,
          registered_address: profile.registeredAddress ?? null,
          country: profile.country,
          status: profile.status ?? "active",
          incorporated_at: profile.incorporatedAt ?? null,
          dissolved_at: profile.dissolvedAt ?? null,
          statutory_persons: profile.statutoryPersons,
          business_activities: profile.businessActivities,
          address_history: profile.addressHistory ?? [],
          source: profile.source.source,
          source_url: profile.source.sourceUrl ?? null,
          source_hash: canonicalHash,
          captured_at: profile.source.capturedAt,
          raw_payload: rawJson,
        })
        .select("id")
        .single();

      if (snapErr) fail(snapErr, "Uloženie bezpečnostného snapshotu zlyhalo.");
      snapshotId = insertedSnapshot.id;
    }

    return {
      ok: true,
      snapshotId,
      profile,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export const lookupCompanyRegistryByIco = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        caseId: uuid,
        ico: z.string().min(1, "Zadajte IČO"),
        country: z.string().default("SK"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    return handleLookupCompanyRegistryByIco(data, context);
  });

/**
 * Potvrdenie importu registra:
 * Prijíma Iba caseId a snapshotId (klient nesmie posielať ani upravovať profil).
 * Zabezpečuje transakčné uloženie, deduplikáciu a ochranu pred podvrhnutím dát.
 */
export async function handleConfirmCompanyRegistryImport(
  data: {
    caseId: string;
    snapshotId: string;
    mode?: "auto" | "new" | "update" | undefined;
    existingEntityId?: string | undefined;
  },
  context: { supabase: any; userId: string },
) {
  const { supabase, userId } = context;

  // 1. Overenie vlastníctva prípadu
  const { data: owned, error: caseError } = await supabase
    .from("cases")
    .select("id")
    .eq("id", data.caseId)
    .eq("user_id", userId)
    .maybeSingle();

  if (caseError) fail(caseError, "Nepodarilo sa overiť prípad.");
  if (!owned)
    throw new Error("Prípad sa nenašiel alebo naň nemáte oprávnenie.");

  // 2. Načítanie dôveryhodného serverového snapshotu
  const { data: snapshot, error: snapErr } = await (
    supabase.from("company_registry_profiles" as any) as any
  )
    .select("*")
    .eq("id", data.snapshotId)
    .eq("case_id", data.caseId)
    .eq("user_id", userId)
    .maybeSingle();

  if (snapErr) fail(snapErr, "Nepodarilo sa overiť snapshot registra.");
  if (!snapshot) {
    throw new Error(
      "Snapshot registra sa nenašiel alebo k nemu nemáte oprávnenie.",
    );
  }

  if (!snapshot.source_hash || snapshot.source_hash.trim().length < 16) {
    throw new Error("Neplatný snapshot: chýba dôveryhodný serverový hash.");
  }

  // 3. Výhradne atomická SQL transakcia cez commit_company_registry_import RPC
  // Žiadny aplikačný fallback — chýbajúca procedúra alebo zlyhanie transakcie musí okamžite zlyhať bez čiastočného zápisu dát.
  const { data: rpcResult, error: rpcError } = await (supabase.rpc as any)(
    "commit_company_registry_import",
    {
      _case_id: data.caseId,
      _snapshot_id: data.snapshotId,
      _mode: data.mode ?? "auto",
      _existing_entity_id: data.existingEntityId ?? null,
    },
  );

  if (rpcError) {
    if (rpcError.code === "42501") {
      throw new Error(
        rpcError.message || "Nemáte oprávnenie na túto operáciu.",
      );
    }
    if (rpcError.code === "23505") {
      throw new Error(
        rpcError.message ||
          "Konflikt integrity: firma už v prípade existuje (režim new).",
      );
    }
    if (rpcError.code === "P0002") {
      throw new Error(
        rpcError.message ||
          "Cieľová firma pre aktualizáciu sa v prípade nenašla (režim update).",
      );
    }
    throw new Error(`Transakčný import zlyhal: ${rpcError.message}`);
  }

  if (!rpcResult) {
    throw new Error(
      "Transakčný import zlyhal: RPC procedúra nevrátila výsledok.",
    );
  }

  return {
    ok: true,
    snapshotId: data.snapshotId,
    companyEntityId: rpcResult.company_id,
    idempotent: Boolean(rpcResult.idempotent),
  };
}

export const confirmCompanyRegistryImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        caseId: uuid,
        snapshotId: uuid,
        mode: z.enum(["auto", "new", "update"]).default("auto"),
        existingEntityId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    return handleConfirmCompanyRegistryImport(data, context);
  });

/**
 * Kompatibilný adaptér pre staršie volania:
 * Prijíma výhradne overené snapshotId a deleguje na zabezpečené transakčné potvrdenie.
 * Klientsky profil ani obchádzanie snapshotov nie sú povolené.
 */
export const importCompanyRegistryProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        caseId: uuid,
        snapshotId: uuid,
        mode: z.enum(["auto", "new", "update"]).default("auto"),
        existingEntityId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    return handleConfirmCompanyRegistryImport(
      {
        caseId: data.caseId,
        snapshotId: data.snapshotId,
        mode: data.mode,
        existingEntityId: data.existingEntityId,
      },
      context,
    );
  });

/**
 * Zoznam profilov registra pre prípad.
 */
export const listCompanyRegistryProfiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ caseId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profiles, error } = await (
      supabase.from("company_registry_profiles" as any) as any
    )
      .select("*")
      .eq("case_id", data.caseId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) fail(error, "Načítanie profilov zlyhalo.");
    return { ok: true, profiles: profiles ?? [] };
  });
