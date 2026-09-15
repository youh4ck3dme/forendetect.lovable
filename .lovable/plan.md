# Mistral ako jediná AI, odstránenie Grok/xAI

## Prečo sa hláška zobrazuje
V aplikácii je uložený iba jeden kľúč `MISTRAL_API_KEY` (používa ho OCR). Textové AI úlohy však dnes vyžadujú dva samostatné kľúče (rýchly a hĺbkový režim) alebo kľúč Grok. Keďže ani jeden z nich nie je uložený, panel hlási, že AI nie je nakonfigurovaná.

## Čo sa zmení

1. **Grok/xAI úplne odstrániť**
   - Zmazať serverového klienta xAI aj jeho testy.
   - Odstrániť Grok z výberu poskytovateľa, z popisov v AI paneli a z textu chybovej hlášky.
   - OCR bude výhradne Mistral; záložné rozpoznávanie obrázkov cez Grok zaniká (Mistral OCR zvláda PDF aj obrázky).

2. **Jeden kľúč stačí**
   - Rýchly aj hĺbkový režim použijú `MISTRAL_API_KEY`, ak nie sú nastavené samostatné kľúče pre jednotlivé režimy.
   - Dva rôzne modely (rýchly a hĺbkový) zostávajú zachované.
   - Po tejto zmene bude AI panel rovno funkčný s už uloženým kľúčom.

3. **Texty a stavy**
   - Hláška pri chýbajúcom kľúči: „AI nie je nakonfigurovaná — chýba serverový kľúč Mistral."
   - Panel zobrazuje iba „Mistral", režim, model, kvótu, stav a náhľad pseudonymizovaných údajov.
   - Označenia „AI hypotéza" / „AI vysvetlenie" zostávajú.

## Technické detaily
- Zmazať `src/lib/ai/xai.server.ts` a `src/lib/__tests__/xai-api.test.ts`.
- `src/lib/ai/llm.server.ts`: odstrániť typ poskytovateľa `xai`, vetvu `callXai` a `callXaiVisionOcr`; `llmConfigured`/`preferredLlmModel`/`providerDisplayName` vracajú iba Mistral.
- `src/lib/ai/mistral.server.ts`: v `modeKey()` doplniť pád späť na `MISTRAL_API_KEY`, keď `MISTRAL_API_KEY_FAST` / `MISTRAL_API_KEY_REASONING` chýba.
- Upraviť `src/lib/__tests__/ocr-fallback.test.ts`, `parse-uploaded-case.test.ts`, `secrets-boundary.test.ts`, `llm-failover.test.ts` podľa nového stavu (kontrola úniku tajomstiev zostáva).
- `src/components/malte/Assistant.tsx` a `src/lib/agent.functions.ts`: texty bez zmienky o Grok.

## Overenie
- Kompletné testy, typová kontrola a produkčný build.
- Reálne volanie rýchleho aj hĺbkového režimu z AI panela cez existujúci Mistral kľúč, bez zobrazenia tajomstiev.
- Kontrola, že import CSV, deterministické analýzy, reporty, platby a PWA zostávajú nezmenené.

Nezasahuje sa do forenznej logiky, detektorov, platieb ani prihlásenia.
