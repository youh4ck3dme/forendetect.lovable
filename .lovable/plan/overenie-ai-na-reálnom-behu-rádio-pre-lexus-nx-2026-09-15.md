# Overenie AI na reálnom behu + rádio pre Lexus NX

## Časť A — Prejsť jeden prípad cez asistenta a agenta

Použijem označenú syntetickú ukážku (žiadne citlivé údaje) a prejdem celý tok tak, ako ho prejde používateľ.

### Čo prebehne

1. Vytvorím čistý testovací prípad zo syntetickej ukážky (transakcie, osoby, vzťahy, nálezy).
2. AI asistent — spustím obidva režimy nad tým istým prípadom:
   - rýchly: vysvetlenie nálezu, krátke zhrnutie, normalizácia popisov,
   - hĺbkový: zhrnutie prípadu, rozpory, časová analýza, finančné toky, podklad pre správu.
3. Vyšetrovací agent — spustím beh nad prípadom a pozriem stopy, ich odôvodnenia, AI vysvetlenia a navrhované kroky.
4. Každý výstup porovnám s reálnymi dátami prípadu.

### Ako posúdim, či odpovede nie sú šablónovité

Skontrolujem všetky tri kritériá:

- **Odkazy na dáta** — každá odpoveď musí spomínať konkrétne sumy, dátumy a identifikátory záznamov, ktoré skutočne existujú vo vstupe. Čokoľvek vymyslené sa počíta ako chyba.
- **Rozdiel medzi režimami** — rýchla a hĺbková analýza nad rovnakým vstupom musia dať merateľne odlišné výstupy (dĺžka, počet citovaných záznamov, hĺbka argumentácie), nie ten istý text.
- **Stabilita** — každú úlohu spustím dvakrát a overím, že závery si neprotirečia (rovnaké sumy, rovnaké záznamy, žiadne opačné tvrdenia).

Naviac skontrolujem, že tvrdenia bez opory v dátach skončia v sekcii „neoverené", že sa nikde neobjaví tvrdenie o dokázaní trestnej činnosti, a že AI texty ostávajú označené ako hypotéza alebo vysvetlenie.

### Výstup

Tabuľka: úloha, režim, model, čas, stav, počet citovaných záznamov, počet vymyslených údajov, hodnotenie „konkrétne / šablónovité". Na konci oddelím overené, neoverené a nájdené chyby. Ak niečo zlyhá (napr. kvóta, chyba služby), uvediem presný dôvod bez zobrazenia kľúčov.

### Čo neopravujem v tomto kroku

Nemením forenznú logiku, import, reporty, platby ani prihlásenie. Ak nájdem chybu, popíšem ju a navrhnem opravu samostatne.

---

## Časť B — Rádio do Lexus NX 450h+ (2022+) pre beh aplikácie v aute

Výsledok rešerše (zhrnutie, nie implementácia):

### Pôvodný displej sa prakticky nedá nahradiť

V druhej generácii NX (2022+) je 9,8"/14" obrazovka prepojená s ovládaním klimatizácie, asistenčnými systémami a head-up displejom. Plnohodnotné Android náhrady displeja existujú len pre staršie NX (2014–2021). Pre 2022+ sa predávajú iba doplnkové moduly, nie výmena obrazovky.

### Realistická cesta: Android box cez CarPlay port

Zariadenie sa tvári ako bezdrôtový CarPlay, ale beží na plnom Androide, takže sa doň dá nainštalovať prehliadač a spustiť Forendo ako aplikáciu na celú obrazovku.

- **Ottocast OttoAibox P3 / P3 Pro** — Android 13, Snapdragon, inštalácia bežných aplikácií. Najlepšia voľba.
- **CarlinKit Ai Box 5.0 / Plus** — lacnejšia alternatíva s rovnakým princípom.
- **AAWireless** — nevhodné, je to len adaptér bez vlastného Androidu, aplikácie sa doň nedajú inštalovať.
- **Carputech interface box pre NX** — pridáva CarPlay/Android Auto k pôvodnej obrazovke, ale vlastný prehliadač neponúka.

Pred kúpou treba predajcovi poslať VIN a fotku pôvodnej jednotky — kompatibilita sa líši podľa modelového roka a výbavy.

### Ako by tam bežala aplikácia

V prehliadači na boxe cez „Pridať na plochu" vznikne ikonka a aplikácia sa spustí na celú obrazovku. Pre trvalé spustenie po štarte sa dá pridať kiosk launcher. Offline režim aplikácia už má, takže po prvom načítaní funguje aj bez signálu, hoci s obmedzeniami.

### Na čo upozorňujem

- Zásah môže byť dôvodom na odmietnutie záruky na infotainment.
- V EÚ môžu zásahy do systémov naviazaných na bezpečnostné prvky komplikovať poistnú udalosť — overte u dovozcu.
- Prehliadanie webu na hlavnom displeji počas jazdy je v rozpore s pravidlami cestnej premávky. Aplikácia je určená na použitie v zaparkovanom vozidle.
- Ide o produkty bez oficiálnej podpory Lexus/Toyota.

Ak chcete, v ďalšom kroku môžem aplikáciu doladiť pre pomer strán a dotykové ovládanie takejto obrazovky (väčšie tlačidlá, tmavý režim ako predvolený, offline).
