# Vyleštený prompt: kompletný UI/UX audit Forendo

## Cieľ
Pripraviť približne 500-slovný implementačný prompt v slovenčine, ktorý zadá dôkladný audit a cielené opravy používateľského rozhrania celej aplikácie Forendo bez zásahov do forenznej logiky, dát, platieb, AI routingu alebo autentifikácie.

## Obsah výsledného promptu
- Určiť rozsah auditu pre všetky verejné aj prihlásené obrazovky, navigáciu, formuláre, tabuľky, filtre, dialógy, prázdne a chybové stavy.
- Zachovať súčasnú vizuálnu identitu Forendo a existujúce dizajnové tokeny; nepridávať plošný redizajn.
- Skontrolovať svetlý aj tmavý režim, kontrast textov, aktívne a zakázané stavy, focus, čitateľnosť malých popisov a rozlíšenie stavov bez spoliehania sa iba na farbu.
- Overiť mobil, tablet a desktop vrátane nulového horizontálneho pretekania, bezpečných okrajov, stabilného sticky spodného menu a jediného zvončeka vpravo v hlavičke.
- Skontrolovať ovládanie klávesnicou, poradie fokusu, skip link, ARIA atribúty, názvy ikonových tlačidiel, dotykové plochy a správanie panelov či dialógov.
- Zjednotiť rozostupy, typografiu, výšky ovládacích prvkov, stavy načítania, mikroanimácie a spätnú väzbu bez zbytočných dekorácií.
- Vyžadovať opravu iba potvrdených problémov, nie zmenu fungujúcej obchodnej alebo forenznej logiky.

## Overenie
Prompt bude požadovať automatizované aj vizuálne testy reprezentatívnych trás vo svetlom a tmavom režime, na mobilnom a desktopovom rozmere, vrátane kontroly konzoly, pretekania, fokusu a kontrastu. Záver rozdelí nálezy na opravené, overené a blokované, s konkrétnymi dôkazmi namiesto všeobecného tvrdenia.

## Výstup
Jeden samostatne použiteľný slovenský prompt s jasnými zákazmi, akceptačnými kritériami a povinným reportom; rozsah približne 500 slov.
