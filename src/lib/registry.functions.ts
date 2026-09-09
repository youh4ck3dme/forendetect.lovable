import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildCompanyEntity,
  buildRegistryRelations,
  buildStatutoryPersonEntities,
  CompanyRegistryProfileSchema,
  findEntityByIco,
  parseCompanyRegistryProfile,
} from "@/forensic/ico-atlas";
import type { Entity } from "@/forensic/types";

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
 * Importuje a uloží profil firmy z ICO Atlas pre daný prípad.
 */
export const importCompanyRegistryProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        caseId: uuid,
        profile: z.unknown(),
        createEntity: z.boolean().default(true),
        existingEntityId: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Overenie vlastníctva prípadu
    const { data: owned, error: caseError } = await supabase
      .from("cases")
      .select("id")
      .eq("id", data.caseId)
      .eq("user_id", userId)
      .maybeSingle();

    if (caseError) fail(caseError, "Nepodariť sa overiť prípad.");
    if (!owned)
      throw new Error("Prípad sa nenašiel alebo naň nemáte oprávnenie.");

    // 2. Validácia a normalizácia dát z ICO Atlas
    const profile = parseCompanyRegistryProfile(data.profile);

    // 3. Uloženie do tabuľky company_registry_profiles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: insertedProfile, error: profileError } = await (
      supabase.from("company_registry_profiles" as any) as any
    )
      .insert({
        case_id: data.caseId,
        user_id: userId,
        ico: profile.ico,
        legal_name: profile.legalName,
        legal_form: profile.legalForm ?? null,
        registered_address: profile.registeredAddress ?? null,
        country: profile.country,
        status: profile.status ?? null,
        incorporated_at: profile.incorporatedAt ?? null,
        statutory_persons: profile.statutoryPersons,
        business_activities: profile.businessActivities,
        address_history: profile.addressHistory ?? [],
        source: profile.source.source,
        source_url: profile.source.sourceUrl ?? null,
        source_hash: profile.source.sourceHash ?? null,
        captured_at: profile.source.capturedAt,
        raw_payload: data.profile,
      })
      .select("id")
      .single();

    if (profileError) fail(profileError, "Uloženie profilu registra zlyhalo.");

    let companyEntityId: string | undefined = data.existingEntityId;
    const createdPersonIds: string[] = [];

    // 4. Voliteľná tvorba/aktualizácia entít v prípade
    if (data.createEntity) {
      // Načítanie existujúcich entít
      const { data: existingEntities } = await supabase
        .from("case_entities")
        .select("*")
        .eq("case_id", data.caseId)
        .eq("user_id", userId);

      const existingComp = findEntityByIco(
        (existingEntities as Entity[]) || [],
        profile.ico,
      );
      const targetCompanyEntity = buildCompanyEntity(
        profile,
        data.caseId,
        data.existingEntityId || existingComp?.id,
      );

      if (existingComp || data.existingEntityId) {
        companyEntityId = targetCompanyEntity.id;
        const { error: updateErr } = await supabase
          .from("case_entities")
          .update({
            name: targetCompanyEntity.name,
            address: targetCompanyEntity.address,
            registered_address: targetCompanyEntity.registeredAddress,
            country: targetCompanyEntity.country,
            incorporated_at: targetCompanyEntity.incorporatedAt ?? null,
          })
          .eq("id", companyEntityId)
          .eq("case_id", data.caseId)
          .eq("user_id", userId);

        if (updateErr) fail(updateErr, "Aktualizácia firmy zlyhala.");
      } else {
        const { data: newComp, error: insertCompErr } = await supabase
          .from("case_entities")
          .insert({
            case_id: data.caseId,
            user_id: userId,
            name: targetCompanyEntity.name,
            kind: "company",
            role: targetCompanyEntity.role,
            ico: targetCompanyEntity.ico,
            address: targetCompanyEntity.address,
            registered_address: targetCompanyEntity.registeredAddress,
            country: targetCompanyEntity.country,
            incorporated_at: targetCompanyEntity.incorporatedAt ?? null,
            note: targetCompanyEntity.note,
          })
          .select("id")
          .single();

        if (insertCompErr) fail(insertCompErr, "Vytvorenie firmy zlyhalo.");
        companyEntityId = newComp.id;
      }

      // Tvorba štatutárov a relácií
      if (companyEntityId && profile.statutoryPersons.length > 0) {
        const personEntities = buildStatutoryPersonEntities(
          profile,
          companyEntityId,
        );
        for (const p of personEntities) {
          const { data: insertedP, error: pErr } = await supabase
            .from("case_entities")
            .insert({
              case_id: data.caseId,
              user_id: userId,
              name: p.name,
              kind: "person",
              role: p.role,
              country: p.country,
              note: p.note,
            })
            .select("id")
            .single();

          if (!pErr && insertedP) {
            createdPersonIds.push(insertedP.id);
          }
        }

        if (createdPersonIds.length > 0) {
          const relations = buildRegistryRelations(
            profile,
            companyEntityId,
            createdPersonIds,
          );
          for (const rel of relations) {
            await supabase.from("case_relations").insert({
              case_id: data.caseId,
              user_id: userId,
              from_id: rel.fromId,
              to_id: rel.toId,
              label: rel.label,
            });
          }
        }
      }

      // Prepojenie entity_id na profile
      if (companyEntityId && insertedProfile?.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("company_registry_profiles" as any) as any)
          .update({ entity_id: companyEntityId })
          .eq("id", insertedProfile.id);
      }
    }

    return {
      ok: true,
      profileId: insertedProfile.id,
      companyEntityId,
      createdPersonIds,
    };
  });

/**
 * Zoznam profilov registra pre prípad.
 */
export const listCompanyRegistryProfiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ caseId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
