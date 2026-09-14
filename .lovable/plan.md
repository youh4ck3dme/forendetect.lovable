# Oprava kontrastu a celkových UI/UX chýb

## Potvrdené problémy

### Kritické
1. **Neviditeľné hodiny a stavové ikony v mobilnej hlavičke** — tmavá hlavička používa farbu textu odvodenú od svetlej/tmavej témy; v svetlom režime vzniká tmavý text na tmavom pozadí.
2. **Nečitateľný text aktívnych tlačidiel** — tmavý modrý prechod je kombinovaný s tmavým textom v svetlom režime. Problém sa opakuje v prepínači Graf/Zoznam, filtroch subjektov, potvrdeniach importu, formulároch subjektov a transakcií a spoločnom primárnom placeholder tlačidle.

### Vysoká závažnosť
3. **Dekoratívne ikony vyzerajú ako ovládacie prvky** — ikony hľadania a ďalších možností na obrazovke Vzťahy nemajú žiadnu akciu. Odstránia sa alebo sa napoja na skutočnú funkciu; bez funkcie sa odstránia.
4. **Rizikový stav je miestami vyjadrený iba farbou** — uzly možných schránkových spoločností potrebujú aj samostatnú ikonu alebo textové označenie.
5. **Malé dotykové plochy** — späť, zatvorenie panela, upozornenia a duplikovanie prípadu majú iba 28–32 px. Zväčšia sa minimálne na 44 × 44 px bez zväčšovania samotných ikon.
6. **Filtrované uzly siete zostávajú v poradí klávesnice** — neviditeľné/zoslabené prvky sa musia deaktivovať a čitateľný celý názov sa doplní do prístupného popisu.
7. **Presmerovanie neprihláseného používateľa stráca pôvodnú adresu** — pri otvorení chránenej obrazovky sa používateľ dostane na prihlásenie bez vysvetlenia a bez návratu na pôvodné miesto.

### Stredná závažnosť
8. **Dve navigácie nemajú rozlíšiteľné názvy** — desktopová a spodná mobilná navigácia dostanú samostatné popisy pre čítačky obrazovky.
9. **Prázdne stavy sa po zmene obsahu neoznamujú** — doplní sa nenásilné oznámenie dynamickej zmeny.
10. **Niektoré loading spinnery nemajú textový stav** — doplní sa oznámenie „Načítava sa“ pre čítačky obrazovky.
11. **Malý graf vzťahov môže pri hustých dátach prekrývať názvy** — zachová sa jednoduchý náhľad, ale doplní sa jasný prístup k plnej interaktívnej sieti a klávesnicovo použiteľná alternatíva.
12. **Ručne vytvorený náhľad firmy sa správa ako modal bez kompletnej správy fokusu** — nahradí sa existujúcim prístupným dialógom.
13. **Placeholder ovládací prvok je neaktívny, ale stále sa dá fokusovať** — odstráni sa z poradia klávesnice.
14. **Úvodná stránka pri overovaní prihlásenia mení výšku obsahu** — text načítania nemá rezervovaný priestor a po načítaní spôsobí posun rozloženia.
15. **Prepínač témy pred načítaním pôsobí ako pokazené ovládanie** — tri deaktivované ikony nemajú vizuálny loading stav.
16. **Nevyvážené prázdne miesto na úvodnej a prihlasovacej obrazovke** — obsah je najmä na vyšších displejoch nahustený hore a spodná časť zostáva nevyužitá.

## Implementácia

- Zaviesť semantickú farbu textu pre tmavú hlavičku a tmavý značkový prechod; nepoužívať na nich všeobecnú farbu `foreground`.
- Opraviť všetky potvrdené výskyty aktívnych tlačidiel naraz, aby sa chyba nevrátila na inej obrazovke.
- Zväčšiť mobilné dotykové plochy, doplniť názvy navigácií, stavové oznámenia a prístupné popisy uzlov.
- Odstrániť nefunkčné ikony na obrazovke Vzťahy a doplniť nefarebné označenie rizikových uzlov.
- Nahradiť ručne vytvorený náhľad firmy existujúcim dialógom so správnym fokusom a zatvorením cez Escape.
- Doplniť prístupné loading stavy pri AI analýze bez zmeny jej logiky.
- Zachovať cieľovú obrazovku pri presmerovaní na prihlásenie a po úspešnom prihlásení sa na ňu vrátiť.
- Stabilizovať priestor počas kontroly prihlásenia a vizuálne vyvážiť úvodnú a prihlasovaciu obrazovku.

## Overenie

- Otestovať svetlý aj tmavý režim na mobilnej šírke 420 px a desktope 1280 px.
- Zmerať kontrast hodín a aktívnych tlačidiel; cieľ je minimálne WCAG AA.
- Prejsť všetky obrazovky klávesnicou, skontrolovať fokus, dialógy, dotykové plochy a horizontálne pretekanie.
- Spustiť cielené testy, typovú kontrolu a produkčný build.

## Scanlog

- Posledný bezpečnostný scan eviduje **1 aktívne upozornenie**: `SUPA_authenticated_security_definer_function_executable`.
- Kontrola závislostí nenašla zraniteľnosti vysokej ani kritickej závažnosti.
- Kontroly App MCP, databázovej vrstvy a dodávateľského reťazca nehlásili ďalšie nálezy; externý Wiz scan sa nevykonal, pretože konektor nie je nastavený.
- Nulový počet nálezov v jednotlivých kontrolách nie je dôkazom úplnej bezpečnosti.
- Bezpečnostný nález sa v tejto UI/UX oprave nebude meniť bez samostatného zadania.

## Obmedzenie auditu

Automatický prechod potvrdil nulové horizontálne pretekanie na kontrolovaných adresách, ale lokálny testovací vstup nezobrazil obsah chránených obrazoviek. Vizuálne overenie všetkých stavov sa preto zopakuje po implementácii s platnou testovacou reláciou; vyššie uvedené chyby sú potvrdené zdrojovým auditom a dodanou snímkou.
