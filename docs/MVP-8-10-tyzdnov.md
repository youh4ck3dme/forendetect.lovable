# Malte — MVP a backlog na 8–10 týždňov

Referenčný prípad: **E-Babčan** (schránkové firmy, obchod so zbraňami, cezhraničné toky).
Konkurenčný rámec: Palantir Gotham, IBM i2 Analyst's Notebook, Siron/Actimize.
Cieľová skupina: NAKA / finančná polícia, FIU, compliance a AML tímy bánk.

---

## 1. Pozicionovanie

Palantir a i2 sú ťažké, drahé a vyžadujú vyškoleného analytika. Malte cieli na medzeru:
**rýchla forenzná triáž prípadu s vysvetliteľným skóre** — vyšetrovateľ nahrá výpisy a
register, do 10 minút má zoznam červených vlajok s odkazom na dôkaz.

Tri veci, ktoré musia byť v MVP lepšie než u konkurencie:

1. **Vysvetliteľnosť** — každé skóre má rozpad na príznaky s váhou a zdrojovým riadkom.
2. **Čas do prvého výsledku** — import → detekcia → report bez konzultanta.
3. **Cena a nasadenie** — jeden tenant, žiadny 6-mesačný implementačný projekt.

---

## 2. Minimálny funkčný produkt (MVP)

MVP = _jeden vyšetrovateľ dokáže sám uzavrieť triáž jedného prípadu a odovzdať report._

**M1 — Import dát**
CSV/XLSX výpisy transakcií, zoznam subjektov, zoznam zbraní/komodít. Mapovanie stĺpcov,
validácia, náhľad pred uložením. Bez importu je produkt demo, nie nástroj.

**M2 — Model prípadu a perzistencia**
Prípad = subjekty, transakcie, komodity, vzťahy, udalosti. Serverové úložisko (Lovable Cloud),
viac prípadov, autentifikácia, roly (analytik / vedúci / čitateľ).

**M3 — Detekčný engine (už existuje, treba dotiahnuť)**
Shell company, transakčné anomálie, licencie a sériové čísla, reťazce v sieti, cezhraničné toky,
risk scoring 0–100. Doplniť: konfigurovateľné prahy a váhy per prípad.

**M4 — Pracovná plocha analytika**
Zoznam alertov s filtrom podľa závažnosti, detail subjektu/transakcie so spustením detektora,
stav položky (nové / preverené / falošný poplach) s auditom kto a kedy.

**M5 — Sieťový graf**
Interaktívny graf s zvýraznením schránkových firiem a reťazcov, klik na uzol → detail,
zvýraznenie cesty medzi dvoma subjektmi.

**M6 — Report**
Exportovateľná forenzná správa (PDF) so zhrnutím, skóre, zoznamom vlajok a metodikou výpočtu —
použiteľná ako príloha k spisu.

**M7 — Audit trail**
Nemenný log: kto čo spustil, aké dáta vstúpili, aká verzia pravidiel. Bez toho je výstup
v trestnom konaní nepoužiteľný.

Čo do MVP **nepatrí**: AI/ML detekcia, OSINT konektory, real-time monitoring, mobilná appka,
multi-tenant SaaS billing.

---

## 3. Prioritizovaný backlog (8–10 týždňov, 1 FE + 1 FS vývojár)

| #   | Funkcia                                               | Hodnota  | Týždne | Odhad hodín | Náklad (60 €/h) |
| --- | ----------------------------------------------------- | -------- | ------ | ----------- | --------------- |
| 1   | Backend + auth + dátový model prípadu                 | Kritická | T1–T2  | 90          | 5 400 €         |
| 2   | Import CSV/XLSX + mapovanie stĺpcov                   | Kritická | T2–T3  | 80          | 4 800 €         |
| 3   | Detekčný engine na serveri + konfigurovateľné váhy    | Kritická | T3–T4  | 70          | 4 200 €         |
| 4   | Alert queue: filtre, triedenie, stavy, priradenie     | Vysoká   | T4–T5  | 60          | 3 600 €         |
| 5   | Detail subjektu / transakcie s rozpadom skóre         | Vysoká   | T5     | 40          | 2 400 €         |
| 6   | Sieťový graf (interaktívny, cesty, zvýraznenie)       | Vysoká   | T6–T7  | 70          | 4 200 €         |
| 7   | PDF report s metodikou                                | Vysoká   | T7     | 40          | 2 400 €         |
| 8   | Audit trail + verzionovanie pravidiel                 | Vysoká   | T8     | 40          | 2 400 €         |
| 9   | Časová os prípadu                                     | Stredná  | T8     | 25          | 1 500 €         |
| 10  | Sankčné/PEP zoznamy (statický import)                 | Stredná  | T9     | 35          | 2 100 €         |
| 11  | Tímová spolupráca: komentáre k alertom                | Stredná  | T9     | 30          | 1 800 €         |
| 12  | Pilotné dolaďovanie, bezpečnostný audit, dokumentácia | Kritická | T10    | 60          | 3 600 €         |

**Spolu: ~640 hodín ≈ 38 400 €** pri 60 €/h. Pri internom tíme (2 ľudia × 10 týždňov)
cca 30 000–45 000 € podľa seniority. Prevádzka (hosting, DB, storage) do 200 €/mesiac.

Rezerva: plánuj 15 % buffer (≈ 1,5 týždňa) na integračné prekvapenia pri importe reálnych výpisov.

---

## 4. Čo má najväčšiu hodnotu pre zákazníka

**Polícia / NAKA**

1. Sieťový graf a reťazce — priamo mapuje na vyšetrovaciu verziu.
2. Vysvetliteľné skóre + PDF report — použiteľné do spisu.
3. Audit trail — obhájiteľnosť dôkazu pred súdom.
4. Import výpisov — dnes to robia ručne v Exceli, tu je najväčšia úspora času.

**Banky / FIU**

1. Transakčný monitoring s nízkou mierou falošných poplachov.
2. Alert queue s workflow a SLA — audit regulátora sa pýta práve na toto.
3. Sankčné a PEP zoznamy.
4. Reporting pre FIU.

Spoločný menovateľ oboch segmentov: **alert queue + vysvetliteľnosť + report**. To sú tri
funkcie, ktoré nesmú z MVP vypadnúť za žiadnych okolností.

---

## 5. Odložené na fázu 2

| Funkcia                                           | Prečo odložiť                                            | Odhad fázy 2 |
| ------------------------------------------------- | -------------------------------------------------------- | ------------ |
| ML/AI anomálie a scoring                          | Potrebuje označené dáta z pilotu; pravidlá zatiaľ stačia | 6–8 týždňov  |
| OSINT konektory (ORSR, RPVS, obchodný vestník)    | Právne a integračné riziko, dlhé rokovania               | 4–6 týždňov  |
| Real-time monitoring a streamovanie               | Dávkový režim pokrýva vyšetrovanie                       | 4 týždne     |
| Multi-tenant SaaS + billing                       | Prvé nasadenia budú on-prem/dedikované                   | 4 týždne     |
| Mobilná aplikácia                                 | Analytická práca prebieha na desktope                    | 6 týždňov    |
| Rozpoznávanie textu z naskenovaných výpisov (OCR) | Vysoká chybovosť, potrebuje vlastný pipeline             | 4 týždne     |
| Kryptomenová analýza                              | Iná dátová doména                                        | 8 týždňov    |

---

## 6. Míľniky a kritériá úspechu

- **T4 — interné demo:** import reálneho anonymizovaného výpisu (500+ riadkov) prejde bez chyby.
- **T7 — pilotná verzia:** vyšetrovateľ bez školenia dokončí triáž prípadu E-Babčan do 30 minút.
- **T10 — pilot u zákazníka:** aspoň 1 podpísaný pilot, ≥ 70 % detekcií označených ako relevantné,
  falošné poplachy < 30 %.

**Hlavné riziká:** kvalita a formát reálnych bankových výpisov (mitigácia: flexibilné mapovanie
stĺpcov), GDPR a spracovanie osobných údajov (mitigácia: šifrovanie, retencia, DPIA pred pilotom),
dlhý predajný cyklus vo verejnej správe (mitigácia: paralelne osloviť banky).
