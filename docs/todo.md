# FORENDETECT — Forenzná diagnostika aplikácie & Akčný plán (Roadmap 2027)

> **Verzia:** 2.0 (Audit & Implementačná matica)  
> **Dátum diagnostiky:** 8. september 2026  
> **Auditovaný stav codebase:** `src/forensic/` (core, legal), `src/lib/ai.functions.ts`, `src/routes/_authenticated/`, `supabase/migrations/`  
> **Cieľ:** Transformácia z triážneho finančného nástroja na procesne nepriestrelný forenzný operačný systém (SK/CZ štandard).

---

## I. Forenzná diagnostika existujúcej aplikácie (Audit 8 osí)

Diagnostický rámec hodnotí pripravenosť systému na reálne trestné konanie a súdne dokazovanie pozdĺž 8 ortogonálnych osí (každá 0–3 body, max. 24 bodov).

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║ DIAGNOSTICKÝ PROFIL APLIKÁCIE: FORENDETECT (MALTE)                           ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ O1 Reťazec zabezpečenia (Chain of Custody) : 1/3  ┤Iba zbrane/tx, bez stôp├  ║
║ O2 Identifikácia stôp (Trace ID & ČRZ)     : 1/3  ┤Chýba taxonómia a ČRZ  ├  ║
║ O3 Analytické metódy (Metrológia/Normy)    : 1/3  ┤Iba softvér, bez ISO   ├  ║
║ O4 Identifikačná sila (Bayes / LR Engine)  : 1/3  ┤Iba váhy 0-100, bez LR ├  ║
║ O5 Časopriestor (Timeline & Alibi)         : 2/3  ┤Os je, chýbajú anomálie├  ║
║ O6 Alternatívne hypotézy (Devil's Advocate): 0/3  ┤KRITICKÝ GAP: Tunel.vid├  ║
║ O7 Inter-spisové prepojenie (M.O. / Link)  : 1/3  ┤Izolované tenanty      ├  ║
║ O8 Admissibility / Forme (Trestný poriadok): 2/3  ┤Silný základ TZ/TP     ├  ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ CELKOVÉ SKÓRE:  9 / 24 bodov                                                  ║
║ HLAVNÉ GAPY:    [O6, O1, O2, O4, O7, O3]                                     ║
║ TOP RIZIKO:     Confirmation bias (O6=0) — systém generuje len dôkazy viny,   ║
║                 obhajoba na súde ľahko rozbije obžalobu iným vysvetlením.     ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

### Detailný rozpad auditu osí

| Os | Názov | Aktuálny stav v kóde | Body | Čo presne chýba k dosiahnutiu 3/3 |
| :--- | :--- | :--- | :---: | :--- |
| **O1** | **Reťazec zabezpečenia** | Evidencia `case_weapons` a `case_transactions` s revíziami (`bump_revision`). | **1/3** | Fyzické a digitálne stopy ako samostatná entita (`case_traces`), protokol o zaistení, odovzdávacie protokoly, kryptografický hash reťazca (tamper-evident log). |
| **O2** | **Identifikácia stôp** | Evidencia sériových čísel zbraní a IČO firiem. | **1/3** | Taxonómia stôp: biologické, digitálne, balistické, účtovné doklady, pridelené ČRZ (Číslo registru zistení), fotodokumentácia. |
| **O3** | **Analytické metódy** | Algoritmické detektory v TypeScript (`shellCompany.ts`, `laundering.ts`), `rulesVersion`. | **1/3** | Evidencia externých znaleckých metód zo spisu (ISO 17025, spektrometria, mikroskopia), prístroje, kalibrácia, chybovosť. |
| **O4** | **Identifikačná sila** | Lineárne váhy pravidiel (`weight`), závažnosť `low/med/high/crit`, risk score 0–100. | **1/3** | Kvantitatívny Bayesovský aparát: Likelihood Ratio ($LR = \frac{P(E\|H_p)}{P(E\|H_d)}$), apriórna/aposteriórna pravdepodobnosť, senzitivita. |
| **O5** | **Časopriestor** | `case_events`, `temporal.ts` (nočné platby, zhlukovanie v čase, víkendy). | **2/3** | Automatická detekcia časových konfliktov a anomálií (alibi vs. úkon, stopa skôr ako čin), identifikácia dôkazových gapov na osi. |
| **O6** | **Alternatívne hypotézy** | Detekcia hľadá len podozrenia z trestnej činnosti. | **0/3** | **Kritický nedostatok:** Devil's Advocate modul, generovanie minimálne 2 konkurenčných nevinných verzií a návrh dôkazových testov na ich vylúčenie. |
| **O7** | **Inter-spisové linky** | Multi-case v Supabase, ale izolované cez RLS a `assert_case_owner`. Statický Europol. | **1/3** | Cross-case knowledge graph prepájajúci subjekty, biele kone, bankové účty a M.O. naprieč prípadmi s rešpektovaním oprávnení. |
| **O8** | **Admissibility (Zákonnosť)** | `src/forensic/legal/` (`laws.ts`, `context.ts` – TZ 300/2005, TP 301/2005), `FindingKind`. | **2/3** | Audit procesných vád posudku (poučenie znalca, prekročenie kompetencie), striktný `citation_trail` na konkrétnu stranu spisu. |

---

## II. Sada pripravených promptov pre Forendetect

Tieto prompty sú navrhnuté na priame nasadenie do `src/lib/ai.functions.ts` ako nové úlohy AI asistenta (`AiTask`).

### 1. Extrakčné prompty zo spisov (Základná extrakcia dát)

#### `P-EXTRACT-COC` — Extrakcia stôp a reťazca zabezpečenia (Os O1, O2)
```markdown
ROLE: Forenzný technik vyšetrovacieho tímu (SK/CZ trestný štandard).
VSTUP: <text spisu, zápisnica o obhliadke miesta činu alebo znalecký posudok>
ÚLOHA: Extrahuj všetky zaistené materiálne, biologické, digitálne a listinné stopy a ich reťazec opatery (chain of custody).

VÝSTUP (JSON pole objektov):
[
  {
    "stopa_id": "ČRZ alebo pridelené číslo stopy v spise",
    "druh": "zbraň | biologická | odtlačok | digitálna | listina | balistika | iné",
    "popis": "presný technický popis vrátane sériových čísel a stavu",
    "zaistené_kedy_kde": "ISO dátum / presná lokalizácia",
    "zaistil": "meno a funkcia / orgán",
    "pohyb_stopy": [
      {"od": "osoba/útvar", "do": "laboratórium/sklad", "kedy": "ISO dátum", "protokol": "č. záznamu"}
    ],
    "aktualne_ulozena": "súčasné miesto uloženia",
    "zlom_v_retazci": false,
    "riziko_zlomu": "popis pochybnosti o integrite alebo NEUVEDENÉ"
  }
]
OBMEDZENIA: Nevymýšľať chýbajúce údaje. Ak záznam o presune chýba, zlom_v_retazci = true.
```

#### `P-EXTRACT-LR` — Extrakcia metód a konverzia na Likelihood Ratio (Os O3, O4)
```markdown
ROLE: Forenzný biostatistik a súdny znalec (metodika ENFSI / ISO 17025).
VSTUP: <znalecký posudok alebo odborné vyjadrenie>
ÚLOHA: Pre každú analyzovanú stopu extrahuj použitú metódu, prístrojové vybavenie a preveď kvalitatívny záver o zhode na Likelihood Ratio (LR).

VÝSTUP (Markdown tabuľka):
| Stopa ID | Druh stopy | Použitá metóda | Prístroj & Kalibrácia | Formulácia v posudku | P(E\|Hp) | P(E\|Hd) | Odhad LR | Slovná interpretácia ENFSI |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |

DOPLŇUJÚCE HODNOTENIE:
1. Senzitivita LR pri zmene referenčnej populácie (±10%).
2. Bol záver formulovaný ako "stotožnenie" bez uvedenia chybovosti? Ak áno, označ: "KVALITATÍVNY DEFICIT".
OBMEDZENIA: Explicitne označiť, či ide o empirické LR z databázy alebo kvalifikovaný expertný odhad.
```

#### `P-SPATIOTEMPORAL` — Časopriestorový audit a detekcia anomálií (Os O5)
```markdown
ROLE: Kriminalistický analytik časopriestorových dát.
VSTUP: <časová os udalostí + výpovede svedkov/obvinených + telekomunikačné a bankové dáta>
ÚLOHA: Vybuduj chronologický model prípadu, porovnaj deklarované alibi s digitálnou stopou a identifikuj konflikty a nepokryté časové úseky.

VÝSTUP:
1. CHRONOLÓGIA (ISO časový rad): [Čas] [Subjekt] [Udalosť] [Dôkaz v spise / strana]
2. ČASOPRIESTOROVÉ ANOMÁLIE:
   - Konflikty: (napr. osoba deklaruje pobyt v zahraničí, ale v danom čase prebehla autentifikácia z domácej IP)
   - Nemenné fakty vs. sporné tvrdenia.
3. DÔKAZOVÉ MEDZERY (Gaps):
   - Časové okná trvajúce viac ako X hodín bez akéhokoľvek overiteľného záznamu.
```

---

### 2. Samoopravné Prompty (Generované na základe GAPov)

#### `P-ALT-DEVIL` — Red-Team a alternatívne vyšetrovacie verzie (Riešenie Gapu O6=0)
```markdown
ROLE: Forenzný oponent ("Devil's Advocate") a nezávislý audítor vyšetrovania.
VSTUP: <hlavná vyšetrovacia verzia + zoznam zistených skutočností a dôkazov>
ÚLOHA: Rozbi tunelové videnie. Vygeneruj minimálne 2 plnohodnotné alternatívne (konkurenčné) hypotézy, ktoré rovnako vysvetľujú zaistené stopy bez predpokladu trestnej činnosti obvineného.

VÝSTUP (Pre každú hypotézu H1, H2):
- Názov a scenár alternatívnej hypotézy.
- Ktoré sporné stopy a transakcie táto hypotéza legitímne vysvetľuje.
- Prediktívne dôsledky: Aké stopy by v spise MUSÍLI existovať, ak by bola táto hypotéza pravdivá?
- Kontrola v spise: Obsahuje spis tieto stopy? (Áno / Nie / Neoverované vyšetrovateľom).
- Návrh vyvracacieho testu: Aký konkrétny procesný úkon alebo dopyt (napr. cezhraničné dožiadanie) definitívne potvrdí alebo vyvráti túto verziu.
```

#### `P-ADMISS-AUDIT` — Audit procesnej prípustnosti podľa Trestného poriadku (Riešenie Gapu O8)
```markdown
ROLE: Procesný audítor trestného konania (Trestný poriadok SR č. 301/2005 Z. z.).
VSTUP: <znalecký posudok, príkaz na prehliadku, zápisnica o výsluchu>
ÚLOHA: Skontroluj zákonnosť a procesnú použiteľnosť dôkazu pred súdom (§ 119 TP a nasl.).

KONTROLNÉ BODY:
1. Oprávnenosť orgánu / znalca (zápis v zozname MS SR, zloženie sľubu, nezaujatosť).
2. Jasné vymedzenie zadávacích otázok (či znalec neodpovedal na právne otázky vyhradené súdu).
3. Zákonnosť zaistenia podkladov (reťazec, príkazy sudcu pre prípravné konanie).
4. Opora skutkových záverov v overiteľných faktoch (odlíšenie faktov od domnienok).

VÝSTUP:
- ZOZNAM ZÁVAD:
  * Kritická vada (spôsobuje absolútnu neprípustnosť dôkazu na súde).
  * Odstrániteľná vada (možno napraviť výsluchom znalca alebo dodatkom).
  * Formálna vada.
- NÁVRH NÁPRAVNÝCH OTÁZOK PRE VÝSLUCH ZNALCA NA POJEDNÁVANÍ.
```

---

## III. Akčný implementačný plán & Stav implementácie

### Fáza 1: Forenzný Autopilot & Produkčný kód (DOKONČENÉ ✅)
- [x] **1.1 Dátový model a typy v `src/lib/types.ts`:**
  - Vytvorené typy: `ForensicDossier`, `TimelineEvent`, `TraceItem`, `DefenseAttack`, `EvidenceRow`, `ParagraphStatus`, `JudgeReadyText`.
- [x] **1.2 Rozšírený systémový prompt v `src/lib/ai-prompt.ts`:**
  - Plný právny rámec: § 95–96 TP (domové prehliadky), § 98 TP (zabezpečenie vecí), § 99–100 TP (znalecké posudky), § 119–120 TP (zákonnosť a neprípustnosť dôkazov), § 150–155 TP (príprava na pojednávanie), § 168 TP (rozsudkový formát).
  - Metodika identifikačnej sily (DNA, balistika, otisky, dokumenty) + Bias audit (6 kognitívnych skreslení).
- [x] **1.3 Serverové endpointy v `src/lib/ai.functions.ts`:**
  - `runForensicAutopilot`: volanie Mistral API v JSON mode (temp 0.1, max 8000 tokens), ukladanie do Supabase JSONB.
  - `extractFileText`: server-side extrakcia textu pre PDF, DOCX, TXT, MD, CSV.
  - `getForensicDossier`: načítanie uloženého dossieru zo Supabase.
- [x] **1.4 UI Forenzného Autopilota v `src/routes/_authenticated/asistent.tsx`:**
  - 1 Drop (drag & drop súborov) → dvojstupňový proces s progressom → 3 Karty (Fakty, Útok obhajoby, Súdna sila) + Index obhájiteľnosti (0–100).
  - Tlačidlo okamžitého načítania autentického vyšetrovacieho spisu Tatragen (PPZ-51/UBOK-PZ-ST-2025).
- [x] **1.5 Exportér do PDF v `src/lib/export-pdf.ts`:**
  - Tlačový formát rozsudku podľa § 168 TP (I. Skutkový stav, II. Vyporiadanie sa s obhajobou, III. Vedecké zhodnotenie, IV. Právne paragrafy).
- [x] **1.6 Databázová migrácia v `supabase/migrations/20260908040000_forensic_dossier.sql`:**
  - Zero-migration prístup: JSONB stĺpec `forensic_dossier` a `forensic_dossier_updated_at` s GIN indexom v tabuľke `cases`.

### Fáza 2: Produkčné doladenie (Nasledujúce kroky)
- [ ] **2.1 Doplniť `MISTRAL_API_KEY` do prostredia / Lovable secrets.**
- [ ] **2.2 Spustiť SQL migráciu `20260908040000_forensic_dossier.sql` v Supabase SQL editore.**
- [ ] **2.3 Integrovať `caseId` z dynamických route params.**
- [x] **2.4 Mistral OCR API (`mistral-ocr-latest`) fallback pre skenované PDF a obrázky:**
  - V `src/lib/ai/mistral.server.ts` implementovaný `callMistralOcr` cez Mistral Files API a signed URLs.
  - V `src/lib/ai.functions.ts` hybridná extrakcia: lokálne `pdf-parse` pre textové PDF, automatický prechod na Mistral OCR pri skenoch (< 50 znakov) a priamych obrázkoch (.png, .jpg, .jpeg).
  - V `src/routes/_authenticated/asistent.tsx` rozšírená podpora súborov v DropZone a toast indikátor `usedOcr`.

### Fáza 4: Forenzná integrita & Súdny export (Týždne 7–8)
- [ ] **4.1 Kryptografický Ledger v Supabase:**
  - Automatický výpočet `sha256(prev_hash + trace_payload)` pri každej zmene v stope.
- [ ] **4.2 Generovanie súdneho PDF reportu:**
  - Export celkovej analýzy s diagnostickým skóre, metodikou ENFSI, citation trailom a doložkou podľa Trestného poriadku.

---

## IV. Overovací cyklus na referenčných dátach (`docs/forenz/`)

Referenčný testovací spis: **Kauza zbrane / Tatragen / Erik Babčan / Dimitri Cohen**

```
KROK 1: Vstupný spis (výsluchy Dimitri Cohen, Erik Babčan, Marek Plch)
        ↓
KROK 2: Spustenie diagnostiky O1-O8 → Zistené skóre: 10/24.
        GAP: O6 (0/3 - neexistuje alternatívna verzia k nelegálnemu vývozu zbraní)
        GAP: O4 (1/3 - chýba LR pre balistické stopy)
        ↓
KROK 3: Spustenie P-ALT-DEVIL (Generovanie hypotézy: legitímny tranzit a zlyhanie zahraničného colného úradu)
        ↓
KROK 4: Doplnenie testovateľných bodov do spisu
        ↓
KROK 5: Re-diagnostika → Skóre stúpa na 16/24 (O6 stúpa z 0 na 3).
        VÝSLEDOK: Spis je pripravený obstáť pred súdom.
```
