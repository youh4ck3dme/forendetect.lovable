# Prompt: zjednodušenie navigácie Forendo

## Cieľ
Vytvoriť podrobný slovenský implementačný prompt, ktorý zníži orientačnú a vizuálnu záťaž navigácie približne o 40 %, odstráni chaos medzi hlavnými obrazovkami, nástrojmi a nastaveniami a zachová všetky existujúce funkcie.

## Potvrdený súčasný stav
- Hlavná navigácia obsahuje päť položiek: Prehľad, Analýza, Osoby, Vzťahy a Viac.
- Vedľajší zoznam obsahuje deväť rovnocenne prezentovaných položiek: Prípady, Import CSV, AI asistent, Sieť tokov, Zbrane, Právny kontext, Predplatné, Súkromie a podmienky a Agentné API.
- Mobilný panel „Viac“ zobrazuje všetkých deväť nástrojov v jednej mriežke.
- Stránka „Viac“ mieša vzhľad, register zbraní, Agentné API, export zdrojového kódu, priebeh analýzy, históriu detektorov, časovú os, nastavenia a odhlásenie.

## Navrhovaná informačná architektúra
Prompt rozdelí navigáciu podľa pracovného cieľa, nie podľa technických názvov:

1. **Prípad** — Prehľad, Prípady, Import údajov.
2. **Vyšetrovanie** — Analýza transakcií, Osoby a firmy, Vzťahy, Sieť tokov, Zbrane.
3. **Asistencia** — AI asistent, Právny kontext, príprava správy.
4. **Účet a systém** — Predplatné, Súkromie a podmienky, Agentné API, vzhľad, stiahnutie zdrojov a odhlásenie.

Mobilná sticky lišta ostane vždy viditeľná a zachová päť známych cieľov: Prehľad, Analýza, Osoby, Vzťahy, Viac. Panel „Viac“ však už nebude plochá mriežka deviatich položiek; zobrazí najčastejšie pracovné akcie hore a zvyšok v troch jasne pomenovaných skupinách. Desktopový sidebar použije rovnaké názvy a zoskupenie ako mobil.

## Obsah promptu
- Auditovať duplicity, nejasné názvy, príliš veľa rovnocenných volieb a miešanie práce s nastaveniami.
- Zachovať všetky existujúce adresy a funkcie; meniť iba informačnú architektúru, názvy a prezentáciu navigácie.
- Doplniť označenie aktívnej sekcie, cestu späť a zrozumiteľné nadpisy každej skupiny.
- Použiť postupné odhaľovanie: bežné úlohy viditeľné okamžite, pokročilé a administratívne položky až v sekcii Viac.
- Zachovať sticky spodné menu, safe-area, focus management, klávesové šípky, Home/End a návrat fokusu po zatvorení panelu.
- Odstrániť navigačné karty a ikony bez reálnej akcie; nezdvojovať rovnaký cieľ na jednej obrazovke.
- Zaviesť krátke, jednotné slovenské názvy a maximálne jeden stručný vysvetľujúci riadok tam, kde je potrebný.
- Zachovať dáta, detektory, AI, platby, import, export, autentifikáciu a bezpečnostné pravidlá bez zmien.

## Merateľné akceptačné kritériá
- Najčastejšie pracovné ciele sú dostupné najviac na dva kroky.
- Na jednej úrovni nie je viac ako päť hlavných volieb; širšie skupiny majú najviac päť položiek.
- Mobilný panel neobsahuje nečlenený zoznam deviatich položiek.
- Desktop a mobil používajú rovnakú terminológiu a logiku skupín.
- Aktívna sekcia je rozpoznateľná textom aj vizuálne, nie iba farbou.
- Žiadne horizontálne pretekanie pri 393, 420, 768, 1024 a 1440 px.
- Všetky ovládacie prvky majú minimálne 44 × 44 px, viditeľný fokus a zrozumiteľný prístupný názov.
- Používateľ sa z Prehľadu dostane k importu, analýze, osobám, vzťahom, zbraniam, AI a nastaveniam bez slepej uličky.

## Overenie
Prompt vyžiada test všetkých navigačných ciest na mobile aj desktope, svetlý a tmavý režim, klávesnicu, čítačku obrazovky, sticky správanie pri skrolovaní, návrat fokusu, správne aktívne stavy, nulové duplicity a nulové chyby konzoly. Záverečný report porovná počet rozhodnutí a krokov pred a po úprave a oddelí overené výsledky od neoverených predpokladov.

## Výstup
Jeden samostatne použiteľný implementačný prompt v slovenčine, dostatočne presný na priamu realizáciu, bez plošného redizajnu aplikácie.
