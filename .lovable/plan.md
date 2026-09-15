# Autonómny vyšetrovací agent

Agent sám prejde dáta prípadu, navrhne línie vyšetrovania, upozorní na skryté súvislosti a pripraví návrhy ďalších krokov. Analytika nenahrádza — každý návrh schvaľuje alebo odmieta človek a agent sa z týchto rozhodnutí učí.

## Ako to bude fungovať

1. Na stránke prípadu používateľ spustí **Prebehnúť prípad**.
2. Deterministická časť (bez AI) prejde transakcie, osoby, vzťahy, zbrane a existujúce nálezy a vytvorí kandidátov na „stopy“ (leads) — každý s odkazom na konkrétne záznamy.
3. Hĺbkový AI režim ku každej stope doplní vysvetlenie a 1–3 navrhované ďalšie kroky. Všetko označené ako „AI hypotéza“ / „AI vysvetlenie“.
4. Používateľ pri každej stope zvolí **Sledovať**, **Odložiť** alebo **Nerelevantné**, prípadne pridá poznámku.
5. Rozhodnutia sa ukladajú a ovplyvňujú poradie a prahy pri ďalších behoch: typy stôp, ktoré používateľ opakovane odmieta, klesajú nižšie alebo sa skryjú pod „Zobraziť potlačené“; typy, ktoré sleduje, stúpajú hore.

## Typy stôp (deterministické)

- Neuzavretý tok: prostriedky vstúpia k osobe a do 7 dní odídu inam v podobnej sume.
- Chýbajúci článok: dve osoby prepojené tokmi bez zaznamenaného vzťahu.
- Osamotená osoba: entita bez transakcií alebo bez vzťahov, ktorá sa spomína v nálezoch.
- Časový zhluk: neobvyklá koncentrácia operácií v krátkom okne.
- Opakovaný vzor súm: blízke opakované sumy pod ohlasovacím prahom.
- Nepokrytý nález: existujúci nález vysokého rizika bez nadväzujúcej akcie.
- Medzera v dátach: obdobie bez transakcií v inak súvislej sérii.

Každá stopa má typ, názov, odôvodnenie zo skutočných dát, skóre dôležitosti, odkazy na záznamy a navrhované kroky.

## Obrazovka

Nová položka **Vyšetrovací agent** v skupine Vyšetrovanie (desktop sidebar aj mobilný panel „Viac“), trasa `/agent`.

- Hlavička: prípad, čas posledného behu, tlačidlo Prebehnúť prípad, stav a kvóta AI.
- Zoznam stôp zoradený podľa naučeného skóre, s filtrom podľa typu a stavu.
- Karta stopy: typ, dôvod, dotknuté záznamy s preklikom, AI vysvetlenie (rozbaliteľné), navrhované kroky, tlačidlá rozhodnutia.
- Panel „Čo sa agent naučil“: prehľad preferencií podľa typu stopy s možnosťou resetu.
- Prázdny stav vedie na import dát alebo spustenie behu.

## Technické detaily

- Migrácia: `agent_runs` (beh: prípad, čas, počty, stav) a `agent_leads` (typ, skóre, dôvod, odkazy, AI text, rozhodnutie, poznámka, čas rozhodnutia) + `agent_type_feedback` (agregované váhy na používateľa a typ). RLS len na vlastníka, GRANT pre `authenticated` a `service_role`, žiadny `anon`.
- `src/lib/agent/leads.ts` — čisté deterministické generátory stôp nad dátami prípadu, plne testovateľné.
- `src/lib/agent/scoring.ts` — poradie = základné skóre × naučená váha typu; váha sa upravuje po každom rozhodnutí, s dolnou aj hornou hranicou.
- `src/lib/agent.functions.ts` — server funkcie `runAgentScan`, `listAgentLeads`, `decideAgentLead`, `resetAgentLearning`; overenie vlastníctva prípadu, rezervácia AI kvóty rovnakým mechanizmom ako autopilot, pseudonymizovaný vstup do modelu.
- AI časť ide cez existujúci `callLlm` v režime `reasoning` (Grok primárne, Mistral fallback); pri zlyhaní AI zostanú stopy viditeľné bez vysvetlenia.
- MCP: nový nástroj `agentLeads` vedľa existujúcich.
- Testy: generátory stôp, učiace skóre, ownership a odmietnutie cudzieho prípadu, chybové stavy AI, pádová odolnosť pri prázdnych dátach.

## Čo sa nemení

CSV import, deterministické detektory, reporty, platby, autentifikácia, PWA a bezpečnostné pravidlá zostávajú bez zásahu. Žiadne tvrdenia o dokázaní trestnej činnosti ani právne stanoviská.
