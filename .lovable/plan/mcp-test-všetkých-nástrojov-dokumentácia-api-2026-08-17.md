# MCP: test všetkých nástrojov + dokumentácia API

## Cieľ

Overiť, že všetkých 7 MCP nástrojov reálne odpovedá, a spísať presnú dokumentáciu podľa skutočných výstupov (nie odhadov).

## 1. Test všetkých 7 nástrojov

Testovací skript (mimo repa, `/tmp`) zavolá bežiaci dev server na `http://localhost:8080/mcp` cez MCP Streamable HTTP:

- hlavičky `Content-Type: application/json` a `Accept: application/json, text/event-stream`
- `initialize` → `tools/list` → `tools/call` pre každý nástroj
- parametre: `analyze_entity` s reálnym id z `list_entities`, `analyze_transaction` s reálnym id, filtre pri `list_alerts`, `list_entities`, `list_weapons`
- kontrola chybovej cesty: neexistujúce id musí vrátiť čitateľnú chybu, nie pád

Poznámka k tvojim curl príkladom: metóda nie je `case_overview`, ale `tools/call` s `{"name":"case_overview","arguments":{}}` — v dokumentácii to bude uvedené správne.

## 2. docs/mcp-api.md

Nový dokument (po slovensky) obsahujúci:

- čo server je, URL `/mcp`, transport Streamable HTTP, verejný read-only prístup
- pripojenie z Claude/ChatGPT/Cursor (URL konektora) aj z curl
- tabuľka 7 nástrojov s presnými názvami parametrov a povolenými hodnotami podľa manifestu
- pre každý nástroj ukážka volania a skrátená reálna odpoveď zachytená z testu
- obmedzenia: iba čítanie, statické demo dáta prípadu E-Babčan, žiadne zápisy
- krátka sekcia „ako neskôr prejsť na OAuth", ak dáta prestanú byť demo

## Čo sa nemení

Kód MCP servera, nástroje ani dáta appky sa nedotýkam. Appka naďalej číta dáta priamo z `src/forensic/` — volať vlastný MCP zvnútra appky by len pridalo sieťový skok bez prínosu.

## Technické detaily

- Zmenený súbor: iba nový `docs/mcp-api.md`.
- Test beží ako jednorazový skript v `/tmp`, do repa sa neukladá.
- Dokumentácia sa píše až po teste, aby ukážky výstupov sedeli s realitou.
