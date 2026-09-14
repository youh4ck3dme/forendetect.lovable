# E2E overenie chybových stavov AI

## Cieľ
Doplniť automatizované integračné E2E scenáre dvojmodelového Mistral smerovania bez živého míňania kreditov a bez vystavenia tajomstiev.

## Implementácia
- Pridať kontrolovaný testovací serverový vstup, dostupný iba počas testov, ktorý simuluje odpovede Mistral API pre 401, 403, 429 a 5xx.
- Overiť, že 401 a 403 sú terminálne: jeden pokus, žiadny fallback a zrozumiteľný stav v AI paneli.
- Overiť 429 s hlavičkou `Retry-After`: oneskorenie pred druhým pokusom, maximálne dva pokusy a fallback až po ich vyčerpaní.
- Overiť 5xx: exponenciálne oneskorenie, maximálne dva pokusy a kontrolovaný prechod na kompatibilný druhý režim.
- Overiť zachovanie jedného technického identifikátora a jednej rezervácie kvóty počas retry/fallback toku.
- Skontrolovať odpovede, audit, prehliadačové úložisko a zachytené logy proti API kľúčom, autorizačným hlavičkám a celým promptom.

## Testy a dôkazy
- Rozšíriť integračné testy serverového klienta o presné počty volaní, režim/model, `Retry-After`, fallback a request ID.
- Doplniť Playwright E2E scenáre AI panela pre výsledný používateľský stav bez reálneho volania poskytovateľa.
- Spustiť cielené AI testy, celý test suite, typovú kontrolu a produkčný build.
- Skontrolovať najnovší build log a uviesť, ktoré scenáre boli plne overené a ktoré závisia od prihlásenej relácie.

## Technické obmedzenia
- Produkčné správanie, CSV import, deterministické analýzy, reporty, platby a PWA sa nemenia.
- Testovací vstup nebude dostupný v produkčnom zostavení a nebude prijímať ani vracať secrets.
