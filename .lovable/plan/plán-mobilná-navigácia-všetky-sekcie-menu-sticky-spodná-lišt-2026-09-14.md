# Plán: Mobilná navigácia — všetky sekcie menu + sticky spodná lišta

## Problém
Na mobile spodná lišta (`BottomNav`) zobrazuje iba 5 hlavných položiek (Prehľad, Analýza, Osoby, Vzťahy, Viac). Sekcia „Nástroje" s 9 položkami (Prípady, Import CSV, AI asistent, Sieť tokov, Zbrane, Právny kontext, Predplatné, Súkromie, Agentné API) je na mobile nedostupná priamo z navigácie — existuje len v desktopovom sidebari.

## Riešenie

### 1. Sticky spodná lišta (ponechať + vylepšiť)
- `BottomNav` ostáva `sticky bottom-0` na spodku obrazovky, skrytá na desktope (`lg:hidden`).
- Pridať `padding-bottom: env(safe-area-inset-bottom)`, aby lišta nepresaHovala do domovského indikátora na iPhone.
- Obsah (`Screen`) dostane spodný padding, aby lišta neprekrývala posledný obsah.

### 2. Prístup ku všetkým sekciám na mobile
- Položka „Viac" v spodnej lište otvorí **bottom sheet** (vysúvací panel zospodu) namiesto len prekliku na stránku.
- Sheet obsahuje:
  - hlavičku „Nástroje" s tlačidlom Zavrieť,
  - mriežku/zoznam všetkých 9 položiek sekcie Nástroje s ikonami a štítkami,
  - aktívna položka je zvýraznená (rovnaký štýl ako v sidebari),
  - po ťuknutí na položku sa sheet zavrie a prejde na trasu.
- Zdroj dát: existujúce `navItems` a `secondaryItems` z `src/components/malte/nav.ts` — žiadna duplicita.
- Ak stránka `/viac` už existuje, zostane funkčná; bottom sheet je rýchlejšia cesta k nástrojom.

### 3. Správanie sheetu
- Otvorenie/zatvorenie animáciou (slide-up + fade pozadia), ťuknutie na pozadie alebo potiahnutie nadol zavrie.
- Klávesnica: Escape zavrie, focus zostane v sheete; `aria-modal`, `role="dialog"`.
- Badge kritických nálezov na „Prehľad" ostáva; na položke „Viac" sa badge nezobrazuje.

### 4. Bez regresií
- Desktop sidebar a existujúce správanie sa nemenia.
- Žiadne horizontálne pretekanie pri 420px (iPhone 17 Air breakpoint) — sheet je full-width s max šírkou a zaoblenými rohmi.

## Technické detaily
- Úpravy: `src/components/malte/Shell.tsx` (`BottomNav` + nový komponent `MobileMoreSheet`), prípadne jemný doplnok `src/styles.css` pre sheet animáciu.
- Žiadne nové balíčky — čisté Tailwind triedy a React stav (alebo existujúci shadcn `Sheet` komponent, ak je v projekte).
- Overenie: Playwright kontrola pri 420×912 — otvorenie sheetu, klik na „Právny kontext", zavretie, sticky lišta pri scrolle; typecheck + build.
