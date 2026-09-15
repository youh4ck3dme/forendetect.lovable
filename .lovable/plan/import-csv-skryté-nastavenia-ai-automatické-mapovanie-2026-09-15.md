# Import CSV: skryté nastavenia + AI automatické mapovanie

Obrazovka importu dnes zobrazuje naraz sedem rozbaľovacích zoznamov mapovania a päť nastavení formátu. Na mobile je to dlhá stena polí. Cieľ: predvolene ukázať jednu vetu a jedno tlačidlo, detaily skryť, a mapovanie navrhnúť automaticky.

## Ako to bude vyzerať

Po výbere súboru sa spustí automatické rozpoznanie a namiesto formulára sa zobrazí jedna karta:

```text
 ┌──────────────────────────────────────────┐
 │ vypis_2026.csv · 1 204 riadkov           │
 │ ✓ Rozpoznané automaticky                 │
 │                                          │
 │ Dátum → Dátum transakcie                 │
 │ Suma → Suma (EUR)                        │
 │ Odosielateľ → Platiteľ                   │
 │ Príjemca → Protistrana                   │
 │                                          │
 │ [ Skontrolovať riadky ]                  │
 │ Upraviť rozpoznanie  ⌄                   │
 └──────────────────────────────────────────┘
```

- Zhrnutie je textové, bez rozbaľovacích polí; zobrazí len štyri povinné väzby.
- „Upraviť rozpoznanie" rozbalí pôvodné polia (kódovanie, oddeľovač, hlavička, desatinný oddeľovač, formát dátumu, sedem mapovaní) v jednom skrytom bloku.
- Ak niečo nie je rozpoznané, karta to pomenuje („Nerozpoznali sme príjemcu") a blok s detailmi sa otvorí sám, s fokusom na chýbajúce pole.
- Tlačidlo „Skontrolovať riadky" je aktívne hneď, keď sú štyri povinné väzby známe.

## AI automatické mapovanie

Poradie je striktné: najprv deterministické rozpoznanie (existujúce regulárne výrazy nad hlavičkou + detekcia oddeľovača, desatinnej čiarky a formátu dátumu). AI sa volá len keď po ňom chýba aspoň jedno povinné pole.

- Nová AI úloha `csv_column_mapping` v rýchlom režime (Mistral FAST), zapísaná do existujúceho routovania a schém v `src/lib/ai.functions.ts`.
- Na model ide iba: názvy stĺpcov a maximálne 5 vzorových riadkov, prehnaných cez existujúcu pseudonymizáciu (`src/lib/ai/redact.ts`). Žiadny celý súbor, žiadny originál.
- Odpoveď je JSON s indexom stĺpca pre každé pole plus krátke zdôvodnenie. Indexy mimo rozsahu a duplicity sa zahodia; návrh nikdy neprepíše to, čo už deterministicky sedí.
- Výsledok je označený ako **AI návrh** a používateľ ho môže jedným klikom prijať alebo otvoriť detaily a prepísať. Import sa nikdy nespustí bez potvrdenia používateľom.
- Bez nakonfigurovaného AI kľúča alebo pri chybe (429/5xx/402) sa karta ticho vráti k deterministickému výsledku a otvorí detaily — import zostáva plne použiteľný bez AI.
- Volanie sa počíta do existujúcich kvót a zapíše do `ai_usage` rovnako ako ostatné úlohy.

## Čo sa nemení

Parsovanie vo web workeri, validácia riadkov, kontrola protistrán, atomický zápis `commitImport`, ukladanie originálu, limity veľkosti a počtu riadkov, oprávnenia a RLS.

## Technické poznámky

- `src/routes/_authenticated/import-csv.tsx`: nový stav `detailsOpen`, zhrňujúca karta, presun existujúcich polí do skrytého bloku (`<details>`-like s ARIA `aria-expanded`/`aria-controls`, klávesnicovo ovládateľné, focus na prvé chýbajúce pole pri auto-otvorení).
- Návrh mapovania presunúť z inline kódu v `parseWith` do čistej funkcie v `src/lib/csv/mapping.ts` (`guessMapping(header, sampleRows)`), aby sa dala testovať samostatne.
- `src/lib/ai.functions.ts`: pridať `csv_column_mapping` do zoznamu úloh, mapovania režimov, Zod schém a promptov; server overí vlastníctvo prípadu.
- Testy: `guessMapping` na slovenských aj anglických hlavičkách, ignorovanie neplatných AI indexov, fallback pri nedostupnej AI, a že sa do AI payloadu nedostane viac než 5 riadkov.
- Overenie: `vitest run`, typová kontrola, produkčný build a vizuálna kontrola importu pri 428 px šírke.
