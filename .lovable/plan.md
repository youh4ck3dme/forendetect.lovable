# Dvojmodelové Mistral napojenie

## Cieľ
Nahradiť existujúce jednotné Mistral volanie serverovým smerovaním cez dva oddelené kľúče a dva overené modely bez zásahu do CSV, detektorov, reportov, platieb alebo PWA.

## Implementácia
- Nastaviť serverové modely podľa živého zoznamu Mistral:
  - FAST: `mistral-small-latest`
  - REASONING: `magistral-medium-latest`
- Rozšíriť typy AI úloh a zaviesť explicitné serverové mapovanie FAST/REASONING; text používateľa nebude ovplyvňovať výber kľúča.
- Upraviť Mistral klienta na výber správneho kľúča/modelu, kontrolu modelu cez `/v1/models`, dva pokusy pre 429/5xx s oneskorením a kontrolovaný kompatibilný fallback. Bez umelého timeoutu a bez fallbacku pri 400/401/402/403 alebo prerušení.
- Zachovať jednu rezerváciu kvóty pre celý pokus vrátane retry/fallbacku a rozšíriť audit o režim, model, stav, fallback a technický identifikátor bez promptov, odpovedí či kľúčov.
- Zachovať pseudonymizáciu a ochranu vlastníctva prípadu; nové výsledky označiť ako AI vysvetlenie alebo AI hypotézu.
- Rozšíriť AI panel o voľbu Rýchla/Hĺbková analýza, automatický predvolený režim podľa úlohy a zobrazenie modelu, poskytovateľa, kvóty, stavu a fallbacku.
- Staré `MISTRAL_API_KEY` ponechať iba pre OCR kompatibilitu; textové úlohy budú používať nové dvojité nastavenie.

## Overenie
- Unit testy smerovania všetkých úloh, statusov 400/401/402/403/429/5xx, Retry-After, maximálneho počtu pokusov, fallbacku a neprítomnosti kľúčov v klientovi.
- Test pseudonymizácie, cudzieho prípadu, jednej kvótovej rezervácie a auditných metadát.
- Reálne volanie FAST aj REASONING cez aplikáciu a kontrola výsledku bez zobrazenia tajomstiev.
- Kompletné testy, typová kontrola, produkčný build a kontrola aktuálneho build logu.

## Výstup
Záver oddelí: overené časti, neoverené časti, blokátory, mapu úloh na oba modely a výsledky všetkých kontrol.
