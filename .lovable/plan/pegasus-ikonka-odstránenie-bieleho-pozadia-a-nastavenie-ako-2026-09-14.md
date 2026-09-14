# Pegasus ikonka: odstránenie bieleho pozadia a nastavenie ako favicon/app icon

## Cieľ

Použiť nahranú Pegasus ikonku ako oficiálnu ikonu aplikácie Forendo — odstrániť biele okolité pozadie, vygenerovať potrebné veľkosti a prepojiť ich s aplikáciou.

## 1. Príprava zdrojovej ikonky

- Zdroj: `user-uploads://PEGAxxA.PNG` (modrý zaoblený štvorec s bielym Pegasusom).
- Odstrániť biele pozadie cez `imagegen--edit_image` s `transparent_background=true`.
- Uložiť priehľadný výstup do `public/icon-source.png` a do `/mnt/documents/exports/pegasus-icon-transparent.png` na kontrolu.

## 2. Generovanie veľkostí

Z priehľadného zdroja vygenerovať (ImageMagick):

- `public/favicon.png` — 32×32 px
- `public/apple-touch-icon.png` — 180×180 px
- `public/pwa-192.png` — 192×192 px
- `public/pwa-512.png` — 512×512 px

Použiť `magick ... -resize WxH -background none -gravity center -extent WxH` aby sa zachoval pomer strán a zaoblený štvorec ostal centrovaný.

## 3. Aktualizácia hlavičky a manifestov

- V `src/routes/__root.tsx` nahradiť existujúce icon linky za:
  - `favicon.png` (rel icon, type image/png)
  - `apple-touch-icon.png` (rel apple-touch-icon)
  - `theme-color` podľa modrej z ikonky
- Aktualizovať `meta` title/description, aby zodpovedali Forendo brandingu (žiadne "Lovable App").
- Aktualizovať `public/manifest.json` a `public/manifest.webmanifest`:
  - `name` / `short_name` = Forendo
  - `icons` s cestami k `pwa-192.png` a `pwa-512.png`
  - `theme_color` / `background_color` podľa modrej z ikonky
- Odstrániť starý `public/favicon.ico`, ak existuje.

## 4. Použitie v landing stránke (voliteľné, ak sa zmestí)

- Ak landing page zobrazuje mark (`src/assets/malte-mark.png`), zvážiť nahradenie novou ikonkou alebo ponechanie existujúceho marku podľa výsledného vzhľadu.

## 5. QA

- Spustiť produkčný build a typecheck.
- Skontrolovať, že sa načítava nový favicon a žiadne chyby v konzole.
- Overiť manifest v DevTools → Application → Manifest.

## Mimo rozsahu

- Zmena forenznej logiky, databázy, AI providerov, platieb.
- Plošný redizajn UI.
