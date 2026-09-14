-- ==============================================================================
-- TRANSAKČNÝ IMPORT A AUDIT REGISTRA ICO ATLAS
-- ==============================================================================
-- Zabezpečuje atomické uloženie profilu, firmy, osôb a relácií v jednej PostgreSQL transakcii.
-- Zabraňuje čiastočným zápisom, zaisťuje idempotenciu pri súbehu, chráni pred podvrhnutím dát
-- a oddeľuje oprávnenia pre zápis snapshotov (len server) a potvrdenie importu (authenticated).

-- 1. Zabezpečenie prístupových práv a RLS pre company_registry_profiles:
-- authenticated a anon používatelia NESMÚ priamo vytvárať (INSERT) ani upravovať (UPDATE, DELETE)
-- snapshoty cez klientske SDK. Snapshoty smie zavádzať výhradne server (service_role).
REVOKE INSERT, UPDATE, DELETE ON public.company_registry_profiles FROM authenticated, anon, PUBLIC;
GRANT SELECT ON public.company_registry_profiles TO authenticated;
GRANT ALL ON public.company_registry_profiles TO service_role;

DROP POLICY IF EXISTS "Users manage own company registry profiles" ON public.company_registry_profiles;
DROP POLICY IF EXISTS "Users can read own company registry profiles" ON public.company_registry_profiles;

CREATE POLICY "Users can read own company registry profiles"
  ON public.company_registry_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Diagnostika existujúcich historických duplicít pred sprísnením unikátnych obmedzení
-- (Duplicity sa automaticky nemažú bez manuálneho rozhodnutia správcu):
DO $$
DECLARE
  _dup_count INT := 0;
BEGIN
  SELECT count(*) INTO _dup_count FROM (
    SELECT case_id, ico, source_hash
    FROM public.company_registry_profiles
    WHERE source_hash IS NOT NULL AND length(trim(source_hash)) >= 16
    GROUP BY case_id, ico, source_hash
    HAVING count(*) > 1
  ) dups;

  IF _dup_count > 0 THEN
    RAISE NOTICE 'Diagnostika: Nájdených % skupín duplicitných snapshotov pre rovnaké IČO a hash.', _dup_count;
  END IF;
END $$;

-- 3. Zabezpečenie integrity stĺpca source_hash
-- Registrové snapshoty musia mať neprázdny serverový hash integrity (minimálne 16 znakov).
ALTER TABLE public.company_registry_profiles
  DROP CONSTRAINT IF EXISTS chk_company_registry_profiles_source_hash;

ALTER TABLE public.company_registry_profiles
  ADD CONSTRAINT chk_company_registry_profiles_source_hash
  CHECK (source_hash IS NULL OR length(trim(source_hash)) >= 16);

-- 4. Unikátny index pre snapshoty (iba platné neprázdne hashe)
DROP INDEX IF EXISTS public.company_registry_profiles_unique_hash_idx;

CREATE UNIQUE INDEX company_registry_profiles_unique_hash_idx
  ON public.company_registry_profiles (case_id, ico, source_hash)
  WHERE source_hash IS NOT NULL AND length(trim(source_hash)) >= 16;

-- 4b. Štruktúrovaná väzba štatutárnych osôb bez spoliehania sa na editovateľnú poznámku (note)
ALTER TABLE public.case_entities
  ADD COLUMN IF NOT EXISTS source_provider TEXT,
  ADD COLUMN IF NOT EXISTS source_person_id TEXT;

CREATE INDEX IF NOT EXISTS case_entities_source_person_idx
  ON public.case_entities (case_id, source_provider, source_person_id)
  WHERE source_person_id IS NOT NULL;

-- 5. Uložená procedúra pre atomické transakčné potvrdenie importu registra
CREATE OR REPLACE FUNCTION public.commit_company_registry_import(
  _case_id UUID,
  _snapshot_id UUID,
  _mode TEXT DEFAULT 'auto',
  _existing_entity_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _snapshot public.company_registry_profiles;
  _target_entity public.case_entities;
  _company_id UUID;
  _existing_comp_id UUID;
  _person_id UUID;
  _person_record JSONB;
  _person_name TEXT;
  _person_role TEXT;
  _person_valid_from TEXT;
  _person_valid_to TEXT;
  _raw_person_id TEXT;
  _provider_person_id TEXT;
  _relation_label TEXT;
  _rel_id UUID;
  _person_ids UUID[] := ARRAY[]::UUID[];
  _relation_ids UUID[] := ARRAY[]::UUID[];
  _is_idempotent BOOLEAN := FALSE;
BEGIN
  -- 1. Explicitná kontrola autentifikácie
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING errcode = '42501', message = 'Autentifikácia je povinná.';
  END IF;

  -- 2. Kontrola existencie a vlastníctva prípadu
  IF NOT EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = _case_id AND c.user_id IS NOT DISTINCT FROM auth.uid()
  ) THEN
    RAISE EXCEPTION USING errcode = '42501', message = 'Prípad sa nenašiel alebo naň nemáte oprávnenie.';
  END IF;

  -- 3. Zámok riadku a načítanie overeného snapshotu
  SELECT * INTO _snapshot
  FROM public.company_registry_profiles
  WHERE id = _snapshot_id
  FOR UPDATE;

  IF _snapshot.id IS NULL THEN
    RAISE EXCEPTION USING errcode = '42501', message = 'Snapshot registra sa nenašiel.';
  END IF;

  -- 4. NULL-safe kontrola vlastníctva snapshotu a príslušnosti k prípadu
  IF _snapshot.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION USING errcode = '42501', message = 'Nemáte oprávnenie na tento snapshot.';
  END IF;

  IF _snapshot.case_id IS DISTINCT FROM _case_id THEN
    RAISE EXCEPTION USING errcode = '42501', message = 'Snapshot nepatrí k zadanému prípadu.';
  END IF;

  -- 5. Overenie integrity snapshotu (musí obsahovať platný serverový hash)
  IF _snapshot.source_hash IS NULL OR length(trim(_snapshot.source_hash)) < 16 THEN
    RAISE EXCEPTION USING errcode = '22000', message = 'Neplatný snapshot: chýba dôveryhodný serverový hash.';
  END IF;

  -- 6. Transakčný advisory zámok pre (case_id, ico):
  -- Serializuje akékoľvek súbežné importy rovnakej firmy v rámci prípadu,
  -- bez ohľadu na to, či ide o rovnaký snapshot alebo dva rôzne snapshoty tej istej firmy.
  PERFORM pg_advisory_xact_lock(hashtext(_case_id::text), hashtext(_snapshot.ico));

  -- 7. Idempotencia: Ak už bol tento konkrétny snapshot commitnutý k existujúcej entite, vrátime výsledok
  IF _snapshot.entity_id IS NOT NULL THEN
    SELECT id INTO _existing_comp_id
    FROM public.case_entities
    WHERE id = _snapshot.entity_id AND case_id = _case_id;

    IF _existing_comp_id IS NOT NULL THEN
      _company_id := _existing_comp_id;
      _is_idempotent := TRUE;

      SELECT array_agg(DISTINCT ce.id), array_agg(DISTINCT cr.id)
      INTO _person_ids, _relation_ids
      FROM public.case_relations cr
      JOIN public.case_entities ce ON ce.id = cr.from_id
      WHERE cr.to_id = _company_id AND cr.case_id = _case_id;

      RETURN jsonb_build_object(
        'ok', true,
        'company_id', _company_id,
        'person_ids', coalesce(_person_ids, ARRAY[]::UUID[]),
        'relation_ids', coalesce(_relation_ids, ARRAY[]::UUID[]),
        'idempotent', true
      );
    END IF;
  END IF;

  -- 8. Určenie entity firmy podľa režimu a validácia cieľovej entity
  IF _existing_entity_id IS NOT NULL THEN
    SELECT * INTO _target_entity
    FROM public.case_entities
    WHERE id = _existing_entity_id;

    IF _target_entity.id IS NULL THEN
      RAISE EXCEPTION USING errcode = 'P0002', message = 'Určená cieľová firma sa nenašla.';
    END IF;

    IF _target_entity.user_id IS DISTINCT FROM auth.uid() OR _target_entity.case_id IS DISTINCT FROM _case_id THEN
      RAISE EXCEPTION USING errcode = '42501', message = 'Nemáte oprávnenie na určenú cieľovú entitu.';
    END IF;

    IF _target_entity.kind IS DISTINCT FROM 'company' THEN
      RAISE EXCEPTION USING errcode = '22000', message = 'Cieľová entita nie je firma (kind musí byť company).';
    END IF;

    IF _target_entity.ico IS DISTINCT FROM _snapshot.ico THEN
      RAISE EXCEPTION USING errcode = '22000', message = format('IČO cieľovej firmy (%s) sa nezhoduje s profilom registra (%s).', _target_entity.ico, _snapshot.ico);
    END IF;

    IF _target_entity.country IS NOT NULL AND _snapshot.country IS NOT NULL AND _target_entity.country IS DISTINCT FROM _snapshot.country THEN
      RAISE EXCEPTION USING errcode = '22000', message = 'Krajina cieľovej firmy sa nezhoduje s profilom registra.';
    END IF;

    IF _mode = 'new' THEN
      RAISE EXCEPTION USING errcode = '23505', message = format('Firma s IČO %s už v prípade existuje (režim new zakazuje duplicitu).', _snapshot.ico);
    END IF;

    _company_id := _target_entity.id;
    UPDATE public.case_entities
    SET
      name = _snapshot.legal_name,
      address = coalesce(_snapshot.registered_address, address),
      registered_address = _snapshot.registered_address,
      country = _snapshot.country,
      source_provider = _snapshot.source,
      incorporated_at = coalesce(_snapshot.incorporated_at, incorporated_at),
      updated_at = now()
    WHERE id = _company_id;
  ELSE
    -- Hľadáme existujúcu firmu s rovnakým IČO v danom prípade
    SELECT id INTO _existing_comp_id
    FROM public.case_entities
    WHERE case_id = _case_id
      AND user_id = auth.uid()
      AND ico = _snapshot.ico
      AND kind = 'company'
    LIMIT 1;

    IF _mode = 'new' AND _existing_comp_id IS NOT NULL THEN
      RAISE EXCEPTION USING errcode = '23505', message = format('Firma s IČO %s už v prípade existuje (režim new zakazuje duplicitu).', _snapshot.ico);
    END IF;

    IF _mode = 'update' AND _existing_comp_id IS NULL THEN
      RAISE EXCEPTION USING errcode = 'P0002', message = format('Cieľová firma pre aktualizáciu sa v prípade nenašla (režim update vyžaduje existujúcu firmu).', _snapshot.ico);
    END IF;

    IF _existing_comp_id IS NOT NULL THEN
      _company_id := _existing_comp_id;
      UPDATE public.case_entities
      SET
        name = _snapshot.legal_name,
        address = coalesce(_snapshot.registered_address, address),
        registered_address = _snapshot.registered_address,
        country = _snapshot.country,
        source_provider = _snapshot.source,
        incorporated_at = coalesce(_snapshot.incorporated_at, incorporated_at),
        updated_at = now()
      WHERE id = _company_id;
    ELSE
      INSERT INTO public.case_entities (
        case_id,
        user_id,
        name,
        kind,
        role,
        ico,
        address,
        registered_address,
        country,
        incorporated_at,
        responsive,
        source_provider,
        note
      ) VALUES (
        _case_id,
        _snapshot.user_id,
        _snapshot.legal_name,
        'company',
        coalesce(_snapshot.legal_form, 'spoločnosť'),
        _snapshot.ico,
        _snapshot.registered_address,
        _snapshot.registered_address,
        _snapshot.country,
        _snapshot.incorporated_at,
        (_snapshot.status = 'active'),
        _snapshot.source,
        'Zdroj: ' || _snapshot.source || ' (Hash: ' || substr(_snapshot.source_hash, 1, 16) || '...)'
      ) RETURNING id INTO _company_id;
    END IF;
  END IF;

  -- 9. Spracovanie štatutárnych osôb a relácií
  IF _snapshot.statutory_persons IS NOT NULL AND jsonb_array_length(_snapshot.statutory_persons) > 0 THEN
    FOR _person_record IN SELECT * FROM jsonb_array_elements(_snapshot.statutory_persons)
    LOOP
      _person_name := trim(_person_record->>'name');
      IF length(_person_name) = 0 THEN
        CONTINUE;
      END IF;

      _person_role := coalesce(nullif(trim(_person_record->>'role'), ''), 'štatutárny orgán');
      _person_valid_from := nullif(trim(_person_record->>'validFrom'), '');
      _person_valid_to := nullif(trim(_person_record->>'validTo'), '');
      _raw_person_id := nullif(trim(_person_record->>'sourcePersonId'), '');
      _provider_person_id := NULL;
      _person_id := NULL;

      -- Označenie relácie uchováva rolu a obe dátumové obmedzenia platnosti:
      _relation_label := _person_role ||
        CASE
          WHEN _person_valid_from IS NOT NULL AND _person_valid_to IS NOT NULL
            THEN ' (od ' || _person_valid_from || ' do ' || _person_valid_to || ')'
          WHEN _person_valid_from IS NOT NULL
            THEN ' (od ' || _person_valid_from || ')'
          WHEN _person_valid_to IS NOT NULL
            THEN ' (do ' || _person_valid_to || ')'
          ELSE ''
        END;

      -- Ak poskytovateľ dodal sourcePersonId, hľadáme existujúcu osobu spojenú s touto firmou cez štruktúrované polia:
      IF _raw_person_id IS NOT NULL THEN
        SELECT ce.id INTO _person_id
        FROM public.case_entities ce
        JOIN public.case_relations cr ON cr.from_id = ce.id AND cr.to_id = _company_id
        WHERE ce.case_id = _case_id
          AND ce.user_id = auth.uid()
          AND ce.kind = 'person'
          AND ce.source_provider = _snapshot.source
          AND ce.source_person_id = _raw_person_id
        LIMIT 1;
      END IF;

      -- Ak identifikátor chýba alebo osoba nebola nájdená:
      -- Zhodné meno NESMIE zlúčiť rôznych ľudí ani v jednej firme. Nevymýšľame globálnu identitu človeka.
      IF _person_id IS NULL THEN
        INSERT INTO public.case_entities (
          case_id,
          user_id,
          name,
          kind,
          role,
          country,
          source_provider,
          source_person_id,
          note
        ) VALUES (
          _case_id,
          _snapshot.user_id,
          _person_name,
          'person',
          _person_role,
          _snapshot.country,
          CASE WHEN _raw_person_id IS NOT NULL THEN _snapshot.source ELSE NULL END,
          _raw_person_id,
          'Štatutár spoločnosti ' || _snapshot.legal_name || ' (IČO: ' || _snapshot.ico || ')'
        ) RETURNING id INTO _person_id;
      END IF;

      _person_ids := array_append(_person_ids, _person_id);

      -- Relácia medzi osobou a firmou (uchováva viacnásobné roly aj rôzne obdobia platnosti):
      IF NOT EXISTS (
        SELECT 1 FROM public.case_relations
        WHERE case_id = _case_id
          AND from_id = _person_id
          AND to_id = _company_id
          AND label = _relation_label
      ) THEN
        INSERT INTO public.case_relations (
          case_id,
          user_id,
          from_id,
          to_id,
          label
        ) VALUES (
          _case_id,
          _snapshot.user_id,
          _person_id,
          _company_id,
          _relation_label
        ) RETURNING id INTO _rel_id;
        _relation_ids := array_append(_relation_ids, _rel_id);
      END IF;
    END LOOP;
  END IF;

  -- 10. Nemenný obsah oddeľujeme od stavu importu:
  -- Len táto bezpečná procedúra po úspešnom importe prepojí snapshot na vytvorenú entitu.
  UPDATE public.company_registry_profiles
  SET
    entity_id = _company_id,
    updated_at = now()
  WHERE id = _snapshot_id;

  RETURN jsonb_build_object(
    'ok', true,
    'company_id', _company_id,
    'person_ids', _person_ids,
    'relation_ids', _relation_ids,
    'idempotent', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.commit_company_registry_import(UUID, UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commit_company_registry_import(UUID, UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_company_registry_import(UUID, UUID, TEXT, UUID) TO service_role;
