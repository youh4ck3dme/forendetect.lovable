# Rozšírený prompt: kompletný UI/UX audit Forendo (~3000 slov)

## Cieľ
Vytvoriť jeden samostatne použiteľný slovenský prompt v rozsahu približne 3000 slov, ktorý zadá úplný audit a cielené opravy používateľského rozhrania celej aplikácie Forendo — bez zásahu do forenznej logiky, dát, platieb, AI routingu a autentifikácie.

## Štruktúra promptu a rozdelenie rozsahu

1. **Kontext a zákazy (~200 slov)** — čo je Forendo, čo sa nesmie meniť: deterministické detektory, importy, reporty, platby, AI napojenie, bezpečnostné politiky. Zákaz plošného redizajnu a zákaz vymýšľania obsahu.
2. **Rozsah auditu (~300 slov)** — menovitý zoznam obrazoviek: úvod, prihlásenie, uvítacie kroky, prehľad, analýza výpisov, osoby, vzťahy, sieť tokov, zbrane, prípady, import CSV, AI asistent, právny kontext, predplatné, súkromie, agentné API, chybové a 404 stavy.
3. **Dizajnové tokeny a konzistencia (~300 slov)** — jednotné farby, rozostupy, polomery, tiene, typografická škála, výšky ovládacích prvkov, zákaz natvrdo zapísaných farieb, kontrola duplicitných variantov tlačidiel a kariet.
4. **Svetlý a tmavý režim (~250 slov)** — kontrast textu, aktívne, hover, disabled a vybrané stavy, čitateľnosť malých popisov, stav hlavičky a hodín, grafy a rizikové farby, minimálne WCAG AA.
5. **Responzivita (~300 slov)** — mobil, tablet, desktop, nulové horizontálne pretekanie, bezpečné okraje, sticky spodná lišta, mobilný panel nástrojov, tabuľky a grafy na úzkych displejoch, jediný zvonček vpravo v hlavičke.
6. **Prístupnosť (~350 slov)** — poradie fokusu, skip link, viditeľný focus ring, klávesová navigácia, ARIA role a názvy, ikonové tlačidlá, dialógy a panely, oznamovanie zmien, dotykové plochy minimálne 44 px, rozlíšenie stavov nielen farbou.
7. **Stavy a spätná väzba (~300 slov)** — prázdne, načítavacie, chybové, offline a limitné stavy; zrozumiteľné texty chýb, potvrdenia deštruktívnych akcií, stabilita rozloženia bez skokov.
8. **Obsah a texty (~250 slov)** — jednotná slovenská terminológia, žiadne zvyšky demo obsahu, jasné označenie syntetickej ukážky a AI výstupov ako hypotéz či vysvetlení, žiadne tvrdenia o dokázaní trestnej činnosti.
9. **Mikroanimácie a výkon (~200 slov)** — jemné prechody, rešpektovanie zníženého pohybu, žiadne blikanie, plynulé skrolovanie, stabilné vykresľovanie zoznamov.
10. **Postup práce (~250 slov)** — najprv úplný audit s číslovaným zoznamom nálezov a závažnosťou, potom opravy po skupinách, oprava celej triedy chyby naraz namiesto jedného výskytu.
11. **Overenie (~200 slov)** — vizuálne testy reprezentatívnych trás v oboch režimoch na mobilnej a desktopovej šírke, kontrola konzoly, pretekania, fokusu a kontrastu, cielené testy, typová kontrola a produkčný build.
12. **Povinný výstupný report (~100 slov)** — rozdelenie na opravené a overené, opravené ale neoverené, a blokované s dôvodom; konkrétne dôkazy namiesto všeobecných tvrdení.

## Forma
Prompt bude v slovenčine, číslovaný a členený nadpismi, formulovaný ako priame zadanie pre vývojového agenta, s akceptačnými kritériami a jasnými zákazmi. Dodá sa ako text v odpovedi aj ako súbor v projekte na opakované použitie.
