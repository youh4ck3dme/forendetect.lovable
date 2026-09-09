# Tretí balík: UX, výkon, inštalovateľná appka, príprava plateného produktu

## Východiskový stav (overené)

- V databáze existujú tabuľky prípadov, subjektov, transakcií, zbraní, importov, audit logu a evidencie AI volaní; kvóta AI sa už rezervuje serverovo.
- AI klient je pripravený výhradne na Mistral, ale kľúč `MISTRAL_API_KEY` nie je nastavený — asistent sa dnes hlási ako nenakonfigurovaný.
- Žiadna platobná integrácia, žiadny manifest ani offline režim zatiaľ neexistujú.
- Súkromný priestor na súbory (`private-bucket`) existuje a používa sa na ZIP zdrojového kódu.

## 0. Kľúč k AI

Vyžiadam kľúč cez zabezpečené pole (nikdy nejde do chatu). Po uložení spustím skutočné volanie asistenta nad malým testovacím prípadom a overím vysvetlenie nálezu, zhrnutie prípadu a zamietnutie pri vyčerpanej kvóte. Ak kľúč nezadáte, asistent ostane viditeľne označený ako nenakonfigurovaný a v prehľade to uvediem ako neoverené.

## 1. Orientácia a UX

- Pracovný názov **Forendo** ako jedno konfigurovateľné miesto (názov, tagline, podpis v správach). Poznámka, že dostupnosť značky nie je overená.
- Vysvetlenie produktu: „Premeňte transakcie na prehľad finančných tokov, vysvetliteľné nálezy a správu so zdrojmi.“ Žiadne tvrdenia o dokazovaní trestnej činnosti, právnej prípustnosti či garantovanej rýchlosti.
- Hlavný tok viditeľne vyznačený: vytvoriť prípad → importovať alebo zadať transakcie → preskúmať nálezy → pripraviť správu.
- Prázdne stavy na každej obrazovke dostanú konkrétnu ďalšiu akciu.
- Syntetický demo prípad bez osobných údajov, výslovne označený ako ukážkový, vytvorí sa len na výslovné kliknutie a nikdy sa nemieša s reálnymi prípadmi.
- Prístupnosť: klávesnicová obsluha, viditeľný focus, popisy a chybové hlášky pri poliach, dlhé tabuľky čitateľné na mobile.

## 2. Inštalovateľná appka a offline

- Manifest, ikony, scope, `start_url`, `standalone`.
- Offline vrstva sa obmedzí na verejný obal a jasnú offline stránku. Cachujú sa výhradne povolené verejné statické súbory.
- Nikdy sa necachuje prihlásený obsah, dáta prípadov, správy, originály, podpísané odkazy ani AI komunikácia.
- Pri odhlásení sa vyčistí citlivý stav v prehliadači; overím dvoma účtami, že druhý nevidí nič z prvého.
- Offline sa zobrazí jasná informácia o nedostupnosti cloudových funkcií; žiadne skryté offline ukladanie prípadov.
- Aktualizácia sa nikdy nevynúti reloadom nad rozpracovaným formulárom — ponúkne sa nenásilne.
- Výzva na inštaláciu len tam, kde ju prehliadač podporuje; inde krátky návod. Skutočná inštalácia na telefóne ostane označená ako neoverená.

## 3. Meraný výkon

- Najprv zmeriam produkčný build a veľkosť prenášaných balíkov ako východisko.
- Sieťový graf a grafy sa načítajú až pri potrebe.
- Prepočet analýzy sa obmedzí a zostane viazaný na správnu revíziu prípadu.
- Pri veľkých zoznamoch stránkovanie alebo virtualizácia, ale len ak to meranie odôvodní.
- Závislosti odstránim až po overení, že sa nepoužívajú.
- Na záver porovnanie pred/po v rovnakom prostredí vrátane podmienok a zostávajúcich obmedzení.

## 4. Platby a oprávnenia

- Žiadna platobná integrácia zatiaľ neexistuje, takže použijem vstavanú platobnú integráciu Lovable (Stripe) v testovacom režime — nevytváram živé produkty ani finálny cenník.
- Ceny, meny, kvóty a identifikátory plánov ostanú v konfigurácii, nie natvrdo v kóde.
- Serverové vytvorenie platby a zákazníckeho portálu naviazané na prihláseného používateľa.
- Stav predplatného sa vždy odvodí od overeného poskytovateľa, nikdy z návratu na stránku „úspech“.
- Overenie podpisu notifikácií, idempotencia, duplicity a udalosti mimo poradia.
- Kontrola oprávnenia a kvóty pred každou platenou serverovou operáciou (AI, väčšie importy, serverové exporty). Lokálna deterministická analýza sa nevydáva za vynútiteľný platený limit.
- Po skončení predplatného ostáva prístup k dátam, ich export a vymazanie; obmedzia sa len nové platené operácie.
- Ak chýbajú tajomstvá alebo identifikátory plánov, integrácia sa dokončí s náhradami a stav sa jasne označí ako nenakonfigurovaný. Nikdy sa nezobrazí falošne úspešná platba.

## 5. Súkromie a správa dát

- Export dát, vymazanie prípadu a vymazanie účtu s primeraným potvrdením rozsahu a identity.
- Vymazanie pokryje závislé záznamy, originály, AI výstupy aj dočasné súbory; postup bezpečne zvládne čiastočné zlyhanie a opakovanie a identitu odstráni až na konci.
- Otvorene vysvetlené obmedzenia mazania zo záloh a externých systémov — žiadny sľub okamžitého úplného vymazania.
- Návrh stránok o súkromí a podmienkach podľa skutočného toku dát; neznáme údaje o prevádzkovateľovi, retencii a zmluvných podmienkach viditeľne označené na doplnenie a nevydávané za právne overené.
- Technické sledovanie chýb bez obsahu prípadov, tokenov a osobných údajov.

## 6. Záverečné overenie

Prejdem celý tok: registrácia/prihlásenie → prípad → import → nálezy → AI (ak je nakonfigurovaná) → správa → odhlásenie. Ďalej dva účty a neprístupnosť cudzích dát, testovacia platba vrátane duplicitnej notifikácie a zmeny plánu, serverové zamietnutie AI pri vyčerpanej kvóte, offline stránka a obsah cache, aktualizácia bez straty rozpracovaného vstupu, mobilné rozloženie a dlhé tabuľky, vymazanie prípadu a zlyhanie počas mazania účtu, typová kontrola, testy a produkčný build.

Na záver dostanete stručný prehľad: A. implementované a overené, B. implementované, ale neoverené v živej službe alebo na zariadení, C. konkrétne blokátory pred prvým platiacim zákazníkom s presným chýbajúcim údajom alebo krokom. Živé platby ani verejné produkčné spustenie týmto krokom neaktivujem.

## Mimo rozsahu

Plošný redizajn, zmena forenznej logiky, iný poskytovateľ AI, verejné spustenie a živé platby.
