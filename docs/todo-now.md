# Forendetect — Implementačná Roadmapa a Postupnosť Promptov

Tento dokument obsahuje **12 samostatných implementačných promptov** usporiadaných do logického, sekvenčného poradia. Každý prompt je navrhnutý tak, aby bol pod limitom 1000 slov a dal sa spúšťať samostatne v AI asistentovi (Copilot / Antigravity).

---

## ⚠️ Zásady a pravidlá postupu

1. **Prísna sekvenčnosť:** Nikdy nespúšťaj ďalší prompt, kým predchádzajúci krok nemá zelené testy alebo riadne zdokumentovaný a vyriešený blokátor.
2. **Žiadne tiché obchádzky:** Neopravuj chyby oslabovaním validácií, vypínaním pravidiel v linteri ani umelým navyšovaním test coverage.
3. **Reálny reporting:** Reportuj skutočné namerané čísla z testov a buildu. 99,99 % coverage sa nesmie deklarovať bez overeného výstupu z nástroja.
4. **Izolácia zmien:** Každý prompt sa sústredí iba na svoj vymedzený rozsah, aby sa nemiešali nesúvisiace zmeny.

---

## 📋 Prehľadná matica postupu (Master Checklist)

| # | Fáza | Názov kroku | Závislosť / Vstup | Stav |
|---|---|---|---|:---:|
| **01** | **Fáza 1: Infraštruktúra** | [Stabilizácia projektu a testovacej infraštruktúry](#prompt-1--stabilizácia-projektu-a-testovacej-infraštruktúry) | Existujúci repozitár | [ ] |
| **02** | **Fáza 1: Infraštruktúra** | [Autorizácia a session guardy](#prompt-2--autorizácia-a-session-guardy) | Úspešný Krok 01 | [ ] |
| **03** | **Fáza 2: Dáta & Core** | [CSV import, mapping a validácia](#prompt-3--csv-import-mapping-a-validácia) | Úspešný Krok 02 | [ ] |
| **04** | **Fáza 2: Dáta & Core** | [Analýza transakcií a finančné detektory](#prompt-4--analýza-transakcií-a-finančné-detektory) | Úspešný Krok 03 | [ ] |
| **05** | **Fáza 3: UI & Moduly** | [Osoby, firmy, filtre a vzťahová sieť](#prompt-5--osoby-firmy-filtre-a-vzťahová-sieť) | Úspešný Krok 04 | [ ] |
| **06** | **Fáza 3: UI & Moduly** | [Reporty a export](#prompt-6--reporty-a-export) | Úspešný Krok 05 | [ ] |
| **07** | **Fáza 3: UI & Moduly** | [Forenzný Sandbox](#prompt-7--forenzný-sandbox) | Úspešný Krok 01 (izolovaný modul) | [ ] |
| **08** | **Fáza 4: Kvalita & Bezpečnosť** | [Kontrast, témy a accessibility (A11y)](#prompt-8--kontrast-témy-a-accessibility) | Úspešné Kroky 05, 06, 07 | [ ] |
| **09** | **Fáza 4: Kvalita & Bezpečnosť** | [Bezpečnostný audit a ochrana dát](#prompt-9--bezpečnostný-audit) | Úspešné Kroky 02–07 | [ ] |
| **10** | **Fáza 4: Kvalita & Bezpečnosť** | [Coverage a eliminácia flaky testov](#prompt-10--coverage-a-flaky-testy) | Úspešné Kroky 01–09 | [ ] |
| **11** | **Fáza 5: Release & Produkcia** | [Výkon, PWA, favicon a offline režim](#prompt-11--výkon-pwa-favicon-a-offline-režim) | Úspešné Kroky 08–10 | [ ] |
| **12** | **Fáza 5: Release & Produkcia** | [Finálna release validácia](#prompt-12--finálna-release-validácia) | Všetky predchádzajúce kroky | [ ] |

---

## FÁZA 1: Infraštruktúra & Autorizačný základ

---

### Prompt 1 — Stabilizácia projektu a testovacej infraštruktúry

- **Cieľ:** Zabezpečiť deterministické lokálne testovacie prostredie, funkčné konfiguračné súbory a zelený baseline bez nutnosti externých API kľúčov.
- **Prerekvizity:** Čistý repozitár bez prebiehajúcich konfliktov.
- **Kedy pokračovať ďalej:** Všetky základné testovacie skripty prebehnú, lint a build sú zelené.

```text
Pracuj v projekte:

C:\Users\42195\Downloads\forendetect.lovable-inspect-20260914093414

Najprv stabilizuj projekt bez pridávania nových funkcií.

Úlohy:
1. Over, že existujú:
   - playwright.config.ts
   - e2e/
   - vitest.config.ts
   - package.json test scripts
2. Obnov alebo oprav iba chýbajúcu testovaciu infraštruktúru.
3. Live Laravel/PostgreSQL testy oddeľ explicitným príznakom RUN_LIVE_E2E=1.
4. Bežné unit testy nesmú vyžadovať:
   - Supabase credentials,
   - Stripe credentials,
   - AI credentials,
   - Laravel server,
   - vzdialenú databázu.
5. Oprav iba skutočné lint/format chyby, nie nesúvisiaci produkčný kód.
6. Spúšťaj príkazy sekvenčne, nie paralelne.

Spusť:
npm run test
npm run test:security
npm run test:e2e
npm run lint
npm run build

Na konci uveď:
- počet Vitest súborov a testov,
- počet E2E testov,
- počet security testov,
- lint errors/warnings,
- výsledok buildu,
- všetky zostávajúce blokátory.

Neuvádzaj úspech, ak test reálne neprešiel.
```

---

### Prompt 2 — Autorizácia a session guardy

- **Cieľ:** Zabezpečiť ochranu rout, tenant/case izoláciu a deterministický vývojársky bypass bez bezpečnostných dier v produkcii.
- **Prerekvizity:** Funkčný Prompt 1 (zelený testovací baseline).
- **Kedy pokračovať ďalej:** Playwright aj unit testy potvrdzujú odmietnutie neoprávnených prístupov a izoláciu údajov.

```text
V projekte Forendo dokonči a otestuj autorizáciu.

Cesta projektu:

C:\Users\42195\Downloads\forendetect.lovable-inspect-20260914093414

Skontroluj:
- všetky chránené routy,
- redirect používateľa bez session,
- local Dev Free Entry bypass,
- ochranu serverových funkcií,
- autorizáciu podľa user_id a case_id,
- odhlásenie a expiráciu session,
- SSR/browser hydration správanie.

Požiadavky:
1. Neoslabuj produkčnú autorizáciu.
2. Dev bypass musí fungovať iba v lokálnom vývojovom režime.
3. Serverové funkcie nesmú dôverovať ID poslanému klientom.
4. Používateľ nesmie čítať ani meniť cudzí prípad.
5. Pridaj unit/integration testy pre:
   - unauthenticated request,
   - cudzie case_id,
   - cudzie user_id,
   - chýbajúcu session,
   - platnú session,
   - Dev Free Entry hranice.
6. Pridaj Playwright testy pre priamy vstup na chránené routy.

Použi syntetické fixture a žiadne reálne credentials.

Spusť relevantné testy, lint a build. V reporte uveď presne, ktoré authorization boundaries sú pokryté.
```

---

## FÁZA 2: Dáta & Finančné analytické jadro

---

### Prompt 3 — CSV import, mapping a validácia

- **Cieľ:** Kompletný, robustný flow spracovania bankových a účtovných CSV súborov s ošetrením chýb, formátov a duplikátov.
- **Prerekvizity:** Funkčný Prompt 2.
- **Kedy pokračovať ďalej:** Parser bezpečne zvláda poškodené vstupy, čiastočný import vyžaduje potvrdenie a testy sú zelené.

```text
Dokonči hlavný CSV flow:

Import CSV → mapping → validácia → review → potvrdenie importu.

Projekt:

C:\Users\42195\Downloads\forendetect.lovable-inspect-20260914093414

Pokry:
- delimiter detection,
- BOM,
- automatické mapovanie hlavičiek,
- manuálne mapovanie,
- dátumové formáty,
- desatinné oddeľovače,
- meny,
- záporné a nulové sumy,
- chýbajúce dátumy,
- chýbajúce odosielateľ/príjemca,
- rovnakého odosielateľa a príjemcu,
- duplicitné riadky,
- neplatné hlavičky,
- prázdny CSV,
- poškodený CSV,
- príliš veľký súbor,
- riadky s chybami.

Produkčný kód zmeň iba vtedy, ak test reprodukuje reálnu chybu.

Doplň:
- unit testy parsera,
- unit testy mappingu,
- integračné testy validation flow,
- Playwright testy úspešného importu a chybových stavov.

Nepouži produkčné dáta ani sieť.

Over, že používateľ vidí počet platných/chybných riadkov a že čiastočný import vyžaduje explicitné potvrdenie.
```

---

### Prompt 4 — Analýza transakcií a finančné detektory

- **Cieľ:** Deterministické analytické jadro detegujúce podozrivé finančné toky, kruhové platby a anomálie s vysvetliteľnými dôvodmi alertov.
- **Prerekvizity:** Funkčný Prompt 3 (validované transakčné dáta).
- **Kedy pokračovať ďalej:** Výpočty sú matematicky presné (bez floating point chýb) a dashboard správne vykresľuje alerty.

```text
Dokonči a over analytické jadro Forendo.

Projekt:

C:\Users\42195\Downloads\forendetect.lovable-inspect-20260914093414

Skontroluj:
- sumy a agregácie,
- príjmy/výdavky,
- meny,
- časové obdobia,
- protipartnerov,
- kruhové platby,
- cezhraničné toky,
- rozdelené transakcie,
- náhle objemové nárasty,
- schránkové firmy,
- rizikové skóre,
- vysvetlenie dôvodu alertu.

Požiadavky:
1. Výpočty musia byť deterministické.
2. Desatinné čísla nesmú vytvárať chyby zaokrúhlenia.
3. Neplatné dáta nesmú byť ticho zahodené.
4. Každý alert musí mať vysvetliteľný dôvod.
5. Pridaj testy pre:
   - normálne transakcie,
   - nulové a záporné hodnoty,
   - cudzie meny,
   - chýbajúce entity,
   - duplicitné transakcie,
   - hraničné dátumy,
   - prázdne dataset-y,
   - extrémne hodnoty.

Pridaj integračné testy pre načítanie analýzy do dashboardu. Zachovaj existujúce UX a nemen nesúvisiace obrazovky.
```

---

## FÁZA 3: Používateľské rozhranie, Grafy & Špecializované moduly

---

### Prompt 5 — Osoby, firmy, filtre a vzťahová sieť

- **Cieľ:** Prepojenie analytických výsledkov do zoznamov osôb/firiem, interaktívnych filtrov a sieťového grafu s bezchybným kontrastom.
- **Prerekvizity:** Funkčný Prompt 4.
- **Kedy pokračovať ďalej:** Filtrovanie funguje okamžite, prepínač Graf/Zoznam je funkčný a prvky spĺňajú kontrast WCAG AA.

```text
Dokonči používateľský flow:

Analýza → Osoby → filtre → Vzťahy.

Projekt:

C:\Users\42195\Downloads\forendetect.lovable-inspect-20260914093414

Over:
- zoznam osôb,
- firmy,
- schránkové firmy,
- rizikové filtre,
- aktívny stav tlačidiel,
- počty výsledkov,
- prázdne výsledky,
- detail subjektu,
- vzťahovú mapu,
- prepínač Graf/Zoznam,
- výber uzla,
- spätnú navigáciu.

Oprav všetky kontrastné chyby:
- tmavý text na tmavom tlačidle,
- svetlý text na svetlom pozadí,
- nedostatočný kontrast aktívnych filtrov,
- nečitateľné secondary texty.

Doplň Playwright testy pre:
- všetky typy filtrov,
- aktívny aria-pressed stav,
- prázdny filter,
- Graf/Zoznam,
- svetlú a tmavú tému,
- responsive mobilné rozmery.

Použi WCAG AA kontrast minimálne 4.5:1 pre bežný text.
```

---

### Prompt 6 — Reporty a export

- **Cieľ:** Bezpečný export zistení a prípadov do formátu PDF/HTML s odolnosťou proti XSS a zlyhaniu tlače.
- **Prerekvizity:** Funkčný Prompt 5.
- **Kedy pokračovať ďalej:** Export funguje aj pri prázdnych dátach, HTML escaping je overený testami a chyby sa zobrazujú používateľovi.

```text
Dokonči reportovací a exportný flow.

Projekt:

C:\Users\42195\Downloads\forendetect.lovable-inspect-20260914093414

Skontroluj:
- export do PDF,
- HTML report,
- tlač cez iframe/window.print,
- export prázdneho prípadu,
- export bez transakcií,
- export s neplatnými dátami,
- escaping HTML,
- špeciálne znaky,
- chyby pri vytváraní iframe,
- absenciu document/window v test environment.

Požiadavky:
1. Žiadny text z používateľských dát nesmie vytvoriť XSS.
2. Export musí zobrazovať názov prípadu, súhrny a alerty.
3. Chyba exportu musí byť používateľovi oznámená.
4. Nepridávaj tiché fallbacky.
5. Doplň unit testy všetkých error paths.
6. Doplň Playwright test dostupnosti export tlačidla.
7. Ak browser print dialog nemožno automatizovať, otestuj pripravenie reportu a volanie print API mockom.

Spusť testy a uveď, ktoré časti exportu sú automatizované a ktoré vyžadujú manuálnu kontrolu.
```

---

### Prompt 7 — Forenzný Sandbox

- **Cieľ:** Lokálna in-browser analýza binárnych súborov (PDF, obrázky, archívy, kancelárske dokumenty) bez úniku dát na server.
- **Prerekvizity:** Funkčný Prompt 1 (infraštruktúra a build).
- **Kedy pokračovať ďalej:** Malformed súbory nezhadzujú aplikáciu, limity archívov chránia pred DoS a testy bežia na syntetických fixtúrach.

```text
Dokonči a bezpečne otestuj Forenzný Sandbox.

Projekt:

C:\Users\42195\Downloads\forendetect.lovable-inspect-20260914093414

Pokry:
- PDF,
- PNG/JPG/WEBP,
- DOCX/XLSX,
- ZIP,
- magic bytes,
- MIME mismatch,
- polyglot súbory,
- Shannon entropy,
- PDF %%EOF revízie,
- PDF JavaScript,
- producenta ERP/Photoshop,
- EXIF/GPS,
- OpenXML metadata,
- VBA makrá,
- rekurzívne ZIP archívy,
- IBAN, IČO, DIČ,
- peňažné sumy,
- AML slová,
- hex preview.

Požiadavky:
1. Analýza musí prebiehať lokálne v browseri.
2. Neposielaj súbory na vzdialený server.
3. Obmedz veľkosť a hĺbku archívov.
4. Malformed súbor nesmie zhodiť aplikáciu.
5. Pridaj syntetické binárne fixture.
6. Pridaj unit testy engine.
7. Pridaj Playwright testy demo súborov, resetu, tabov a chybových vstupov.
8. Zabezpeč bezpečné spracovanie škodlivých názvov a skriptov v archívoch.
```

---

## FÁZA 4: Vizuálna stabilizácia, Bezpečnosť & Kvalita kódu

---

### Prompt 8 — Kontrast, témy a accessibility

- **Cieľ:** Kompletný accessibility audit naprieč všetkými obrazovkami a témami (WCAG AA, klávesnicová navigácia, reduced motion).
- **Prerekvizity:** Dokončené UI moduly (Prompty 5, 6 a 7).
- **Kedy pokračovať ďalej:** Žiadne kontrastné chyby v svetlej/tmavej téme, neonový perimeter rešpektuje layout a testy a11y prešli.

```text
Urob kompletný accessibility audit Forendo.

Projekt:

C:\Users\42195\Downloads\forendetect.lovable-inspect-20260914093414

Over svetlú, tmavú a systémovú tému.

Skontroluj:
- hodiny,
- header,
- neonový perimeter,
- aktívne tlačidlá,
- filtre,
- secondary text,
- mapové ovládanie,
- focus ring,
- hover/active/disabled stavy,
- ikony bez textu,
- formulárové labely,
- aria-pressed,
- keyboard navigation,
- reduced motion,
- mobilné rozmery.

Neon:
- nesmie prechádzať cez stred headera,
- musí sledovať border-box,
- nesmie meniť rozmery,
- musí rešpektovať prefers-reduced-motion.

Použi computed styles a automatizované testy. Cieľ:
- WCAG AA kontrast minimálne 4.5:1,
- focus viditeľný,
- všetky ovládacie prvky dostupné klávesnicou,
- žiadny text biely na bielom alebo tmavý na tmavom.

Oprav iba súvisiace štýly a pridaj regresné Playwright testy.
```

---

### Prompt 9 — Bezpečnostný audit

- **Cieľ:** Hĺbková previerka únikov tajomstiev, autorizačných hraníc, ochrany proti zip bombám a injekciám.
- **Prerekvizity:** Funkčné jadro aplikácie (Prompty 2 až 7).
- **Kedy pokračovať ďalej:** Žiadne high/critical zraniteľnosti, reportované nálezy v štruktúrovanej tabuľke, security testy zelené.

```text
Urob bezpečnostný audit aplikácie Forendo.

Projekt:

C:\Users\42195\Downloads\forendetect.lovable-inspect-20260914093414

Skontroluj:
- secrets v repozitári,
- environment premenné,
- Supabase authorization,
- user_id/case_id boundaries,
- XSS v reportoch,
- HTML escaping,
- upload limity,
- ZIP bomb ochranu,
- path traversal,
- MIME spoofing,
- SSRF,
- webhook replay,
- logovanie osobných údajov,
- export citlivých dát.

Neposielaj kód ani secrets mimo lokálny projekt.

Pridaj alebo rozšír security testy:
- odmietnutie cudzieho prípadu,
- odmietnutie neplatného súboru,
- škodlivý HTML input,
- secret redaction,
- malformed webhook,
- replay request,
- neplatný content type,
- nadlimitná veľkosť.

Výsledok uveď v tabuľke:
Severity, súbor, riadky, problém, confidence, odporúčaná oprava.

Žiadny nález nezľahčuj a nič neopravuj širokým refaktorom.
```

---

### Prompt 10 — Coverage a flaky testy

- **Cieľ:** Stabilizácia celej testovacej suity, odstránenie nestabilných timeoutov a poctivý report pokrytia kódu.
- **Prerekvizity:** Hotové testy z predchádzajúcich krokov (1 až 9).
- **Kedy pokračovať ďalej:** Testy bežia rýchlo a deterministicky, žiadny test náhodne nezlyháva a coverage report je podložený dátami.

```text
Zvýš kvalitu a stabilitu testovacej sady.

Projekt:

C:\Users\42195\Downloads\forendetect.lovable-inspect-20260914093414

Úlohy:
1. Identifikuj flaky testy.
2. Odstráň nepotrebné waitForTimeout.
3. Nahraď ich stabilnými signálmi:
   - locator assertions,
   - response čekanie,
   - DOM state,
   - explicitná readiness značka.
4. Oddel live testy od deterministických.
5. Doplň chýbajúce testy pre:
   - report error paths,
   - auth boundaries,
   - CSV edge cases,
   - sandbox malformed input,
   - empty states,
   - theme states.
6. Zachovaj malé syntetické fixture.
7. Nemeň coverage exclusions iba preto, aby číslo vyzeralo lepšie.
8. Spusť:
   npm run test
   npm run test:coverage
   npm run test:security
   npm run test:e2e

Na konci uveď:
- Statements,
- Branches,
- Functions,
- Lines,
- počet testov,
- skipped testy,
- flaky testy,
- skutočné zostávajúce uncovered oblasti.

99,99 % uvádzaj iba v prípade, že ho report reálne potvrdí.
```

---

## FÁZA 5: Výkon, PWA & Finálny Release

---

### Prompt 11 — Výkon, PWA, favicon a offline režim

- **Cieľ:** PWA manifest, správne servovanie ikon, service worker pravidlá (bez cachovania privátnych API) a kontrola veľkosti bundlov.
- **Prerekvizity:** Funkčný, otestovaný a bezpečný projekt (Prompty 1 až 10).
- **Kedy pokračovať ďalej:** Všetky assety vracajú HTTP 200, offline režim je korektný a veľkosť produkčného buildu je optimalizovaná.

```text
Dokonči PWA a výkonovú vrstvu.

Projekt:

C:\Users\42195\Downloads\forendetect.lovable-inspect-20260914093414

Skontroluj:
- favicon-16x16,
- favicon-32x32,
- favicon.ico,
- apple-touch-icon,
- Android Chrome ikony,
- manifest.webmanifest,
- theme-color,
- service worker,
- precache,
- offline.html,
- cache invalidáciu,
- Vite bundle.

Požiadavky:
1. Všetky assety musia vracať HTTP 200.
2. MIME typy musia byť správne.
3. Manifest musí obsahovať platné ikony.
4. Service worker nesmie cachovať súkromné API odpovede.
5. Navigácia a API requesty musia mať bezpečné správanie.
6. Favicon odkazy musia byť v root head.
7. Over mobilné zobrazenie.
8. Nepridávaj cache na citlivé dáta.
9. Pridaj test asset dostupnosti a manifest JSON validácie.

Spusť build a skontroluj veľkosť hlavného JS/CSS bundle. Uveď iba reálne namerané výsledky.
```

---

### Prompt 12 — Finálna release validácia

- **Cieľ:** Záverečné sekvenčné overenie celého projektu od čistej inštalácie po build a vygenerovanie release reportu.
- **Prerekvizity:** Úspešné dokončenie všetkých predchádzajúcich krokov 1 až 11.
- **Výstup:** Finálny audit, zhodnotenie pripravenosti na produkciu a odporúčanie pre rollback stratégiu.

```text
Priprav Forendo na release.

Projekt:

C:\Users\42195\Downloads\forendetect.lovable-inspect-20260914093414

Pred release over:
1. čistú inštaláciu dependencies,
2. TypeScript,
3. lint,
4. unit testy,
5. security testy,
6. E2E testy,
7. coverage,
8. build,
9. PWA manifest,
10. favicony,
11. auth redirect,
12. svetlú/tmavú tému,
13. responsive mobilný layout,
14. CSV import,
15. analýzu transakcií,
16. osoby a filtre,
17. vzťahy,
18. export reportu,
19. Forenzný Sandbox.

Príkazy spúšťaj sekvenčne:

Set-Location -LiteralPath "C:\Users\42195\Downloads\forendetect.lovable-inspect-20260914093414"

npm ci
npm run test
npm run test:security
npm run test:e2e
npm run test:coverage
npm run lint
npm run build

Ak niečo zlyhá:
- neopravuj náhodne nesúvisiaci kód,
- uveď presnú chybu,
- nájdi root cause,
- oprav minimálne,
- test zopakuj.

Na konci vytvor release report:
- hotové funkcie,
- známe obmedzenia,
- test counts,
- coverage metrics,
- lint errors/warnings,
- build výsledok,
- deployment risk,
- rollback odporúčanie.

Nedeklaruj aplikáciu ako 100 % hotovú bez dôkazov.
```
