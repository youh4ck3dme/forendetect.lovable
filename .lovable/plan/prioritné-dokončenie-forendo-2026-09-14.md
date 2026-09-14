# Prioritné dokončenie Forendo

## Cieľ
Doplniť iba vážne chýbajúce ochrany a overenia. Existujúci dizajn, analytické pravidlá, CSV import, report so zdrojmi, platby a PWA sa nebudú plošne prerábať.

## 1. Bezpečný forenzný upload
- Zaviesť spoločné limity pre počet súborov, veľkosť jedného súboru, veľkosť celej dávky a maximálny extrahovaný text.
- Limity vynútiť v prehliadači aj na serveri, aby ich nebolo možné obísť priamym volaním.
- Overovať deklarovaný formát podľa obsahu súboru; odmietnuť nesúlad prípony, nepodporované súbory a poškodené dokumenty.
- Obmedziť spracovanie XLSX/DOCX/PDF proti nadmernému čerpaniu pamäte a vrátiť používateľovi konkrétnu chybu pri každom súbore.
- Doplniť testy hraničných veľkostí, priveľkej dávky, falošnej prípony a čiastočného úspechu dávky.

## 2. Bezpečný export forenzného dossieru
- Uniknúť všetky používateľské a AI texty v staršom HTML/PDF exporte pred ich vložením do dokumentu.
- Odstrániť nepravdivé tvrdenia o zákonnej dôkaznej sile, „súdnej nepriestrelnosti“ a automatickom osvedčení integrity.
- Jasne oddeliť pozorované údaje, deterministické nálezy a neoverené AI hypotézy.
- Opraviť kanonický odtlačok dossieru tak, aby zahŕňal celý vnorený obsah stabilným spôsobom.
- Doplniť regresné testy proti vloženému HTML/skriptu a proti manipulácii vnorených údajov.

## 3. Reálne bezpečnostné a koncové testy
- Nahradiť lokálny vývojársky vstup v smoke teste autentifikovanou testovacou reláciou.
- Pridať test dvoch izolovaných účtov: cudzí prípad, transakcia, import, dossier, rola, predplatné a fakturačná udalosť musia byť zamietnuté.
- Pridať koncový scenár: vytvorenie prípadu → CSV import → analýza → zdrojový report.
- Doplniť samostatné príkazy pre unit, security, E2E a coverage; vytvoriť release kontrolu, ktorá zlyhá pri neúspešnom kroku.
- Zachovať aktuálne 160 testov a UI audit ako existujúcu regresnú vrstvu.

## 4. Ochrana AI/OCR pred zneužitím
- Vynútiť serverové limity na používateľa pre AI analýzu, OCR a dávkovú extrakciu; samotné prihlásenie nie je dostatočná ochrana pred nákladovým zneužitím.
- Pri prekročení limitu nič neposielať externému modelu a zobraziť zrozumiteľný čas obnovenia kvóty.
- Zaznamenávať len technické metadáta volania bez textu spisu alebo osobných údajov.

## 5. Použiteľná auditná stopa prípadu
- Sprístupniť vlastníkovi prípadu existujúcu históriu zmien: kto, kedy, aký typ záznamu a ktoré polia zmenil.
- Nezobrazovať citlivé staré/nové hodnoty ani dáta cudzieho prípadu; pridať stránkovanie a prázdny stav.
- Overiť, že používateľ auditný záznam nevytvorí, neupraví ani nevymaže priamo.

## 6. Cielené odstránenie aktívneho databázového upozornenia
- Overiť presnú funkciu označenú scanom a upraviť iba jej oprávnenie alebo spôsob volania.
- Zachovať serverové overovanie rolí aj funkčnosť administrátorského stiahnutia zdrojov.
- Zopakovať bezpečnostný scan a funkčné testy; nulový počet nálezov nebude prezentovaný ako úplná bezpečnosť.

## 7. Bezpečnostné hlavičky
- Pridať primeranú CSP, Referrer-Policy a Permissions-Policy na serverovej odpovedi bez narušenia prihlásenia, platieb, fontov a tlačových reportov.
- Overiť hlavičky na verejných aj prihlásených obrazovkách a zachovať ochranu proti vloženiu aplikácie do cudzieho rámca.

## 8. PWA a release konzistencia
- Odstrániť konflikt medzi ručným `public/sw.js` a generovaným service workerom; ponechať jediný kontrolovaný zdroj registrácie.
- Zjednotiť manifesty a overiť, že offline režim nikdy necachuje prípady, API, AI požiadavky ani podpísané odkazy.
- Otestovať aktualizáciu, odhlásenie a vyčistenie lokálneho stavu v publikovanom režime bez automatického reloadu rozpracovaného formulára.

## Technické overenie
- Unit a integračné testy vrátane nových škodlivých vstupov.
- Typová kontrola a produkčný build.
- Playwright na mobile aj desktope s autentifikovanou reláciou.
- Opakovaný bezpečnostný a dependency scan.
- Stručný release prehľad: overené, neoverené v živej službe a blokátory plateného nasadenia.

## Mimo rozsahu
- Plošný redizajn, nové detektory, nové platobné funkcie a rozširovanie AI promptov.
- Dekompresia ZIP archívov a makier; aplikácia ich momentálne neprijíma. Ak sa podpora archívov pridá neskôr, musí dostať samostatný izolovaný sandbox.
