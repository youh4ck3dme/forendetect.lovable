# Dokončenie MVP: font, favicon, cleanup, QA

## Cieľ

Uzavrieť posledných 5 % prototypu Malte tak, aby bol demo-ready pre stakeholderov.

## 1. Typografia — Plus Jakarta Sans

Dizajnový token `--font-sans` už na font odkazuje, ale samotný font sa nikde nenačítava, takže sa reálne renderuje systémový fallback.

- Do `head().links` v `src/routes/__root.tsx` pridať preconnect na Google Fonts a `<link rel="stylesheet">` pre Plus Jakarta Sans (400/500/600/700/800).
- Font sa načíta cez link tag v root route, nie cez `@import` v CSS (build to nepodporuje).

## 2. Favicon a branding v head

- Vygenerovať fialový "M" mark ladiaci s brand gradientom a uložiť ako PNG do `public/` (`favicon.png`, `apple-touch-icon.png`), plus ho použiť ako og obrázok pre úvodnú obrazovku.
- V `__root.tsx` nahradiť generický icon link novými ikonami.
- Prepísať generické meta tagy ("Lovable App" / "Lovable Generated Project") na Malte branding a doplniť `theme-color`.

## 3. Cleanup a metadáta trás

- `src/routes/vztahy.tsx`: odstrániť nepoužité importy (ponechať len tie skutočne použité).
- Prejsť všetky trasy (`/`, `/analyza-vypisov`, `/osoby`, `/vztahy`, `/siet`, `/zbrane`, `/viac`) a overiť, že každá má vlastný `head()` s unikátnym titulkom a popisom.
- Odstrániť prípadné ďalšie nepoužité importy naprieč routami.

## 4. Overenie buildu a QA

- Spustiť produkčný build a typecheck, opraviť čokoľvek, čo spadne.
- Playwright prechod cez všetky obrazovky pri 390px šírke: screenshot každej trasy, kontrola konzoly na chyby.
- Funkčná kontrola: risk filter, klik na entitu/transakciu → DetectorSheet s výsledkami detekcie, sieťový graf na `/siet`, PDF export, perzistencia stavu po reloade (IndexedDB).

## Mimo rozsahu

Backend (Lovable Cloud), ORSR integrácia, alerty a AI/ML modely — samostatná fáza po tomto MVP.
