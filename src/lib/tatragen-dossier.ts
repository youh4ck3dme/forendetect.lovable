import type { ForensicDossier } from "@/lib/types";
import { TATRAGEN_CROSS_CONTRADICTIONS } from "@/lib/cross-contradictions";

export const TATRAGEN_CASE_DOSSIER: ForensicDossier = {
  caseId: "PPZ-51/UBOK-PZ-ST-2025",
  caseTitle: "Kauza Tatragen & EB-EU — Nedovolené ozbrojovanie (§ 294 TZ)",
  defendabilityIndex: 74,
  generatedAt: new Date().toISOString(),
  facts: {
    timeline: [
      {
        time: "2024-05-21 10:00",
        event: "Odkúpenie EB-EU s.r.o.; kúpu sprostredkoval D. Cohen, spoločníkom Tavira s.r.o.",
        source: "ORSR, Dôkaz 06",
        chainBreak: false,
      },
      {
        time: "2024-12-27 11:30",
        event: "Vydanie zbrojnej licencie LA 002318; trezory z predajne hneď demontované",
        source: "Úradný záznam KR PZ Žilina",
        chainBreak: true,
        severity: "warning",
        paragraph: "§ 98 TP",
      },
      {
        time: "2025-01-23 14:15",
        event: "1. nákup v TATRAGEN s.r.o. — 242 zbraní celkovo; osobný odber v Žiline",
        source: "Dôkaz 09 (Výsluch M. Plch)",
        chainBreak: false,
      },
      {
        time: "2025-09-15 22:40",
        event: "Nočné odovzdávanie zbraní na odpočívadlách D1 Trenčín z kufra BMW 7",
        source: "Dôkaz 08, 10 (Marjov)",
        chainBreak: true,
        severity: "critical",
        paragraph: "§ 98 TP",
      },
      {
        time: "2026-02-06 08:30",
        event:
          "Europol Španielsko: zaistenie Glock 19 (CGDV051) a GP K100 (K055902, K055904) v gangu",
        source: "Dožiadanie Europol č. ES-441/2026",
        chainBreak: false,
      },
      {
        time: "2026-08-12 15:02",
        event: "Zadržanie E. Babčana a D. Cohena; výsluchy a domové prehliadky",
        source: "Zápisnica o zadržaní PPZ ÚBOK",
        chainBreak: false,
      },
    ],
    traces: [
      {
        id: "TR-01",
        type: "balistická",
        description:
          "Glock 19 Gen 5 (CGDV051) — zaistený v Španielsku, zhoda s predajom v Tatragene",
        light: "green",
        chainComplete: true,
        lr: "> 1 000 000",
        paragraph: "§ 119 ods. 2 TP",
      },
      {
        id: "TR-02",
        type: "balistická",
        description: "Grand Power K100 (K055902, K055904) — dodávka EB-EU z Tatragenu",
        light: "green",
        chainComplete: true,
        lr: "1 : 25 000",
        paragraph: "§ 119 ods. 2 TP",
      },
      {
        id: "TR-03",
        type: "dokument",
        description: "Kniha evidencie zbraní a streliva LA 002318 — úmyselne stratená/nedodaná",
        light: "red",
        chainComplete: false,
        lr: "—",
        paragraph: "§ 98 TP",
      },
      {
        id: "TR-04",
        type: "dokument",
        description:
          "Výpisy Tatra banka — úhrady zálohových faktúr Tatragen s.r.o. z hotovostných vkladov",
        light: "green",
        chainComplete: true,
        lr: "—",
        paragraph: "§ 116 TP",
      },
      {
        id: "TR-05",
        type: "digitálna",
        description: "Zvukové nahrávky od D. Marjova v BMW X6 — dokumentujú marže 10-20 €/ks",
        light: "yellow",
        chainComplete: false,
        lr: "—",
        paragraph: "§ 115 TP",
      },
    ],
  },
  defenseAttack: {
    overallRisk: "VYSOKÉ",
    attacks: [
      {
        id: "DA-1",
        defenseClaim:
          "Cohen: 'Bol som len najatý šofér za 300 € na cestu, v taškách som zbrane nevidel a netušil som, že ide o nelegálny tovar.'",
        risk: "VYSOKÉ",
        counterStrike:
          "Vozidlo BMW malo pečiatky firiem EB-EU aj Bark Factory, Cohen mal rukou písané zoznamy kalibrov a zabezpečoval plnomocenstvá. Navrhnúť znalecké posúdenie písma a výsluch advokátov k plnomocenstvám.",
        evidenceGap: "Chýba grafologická expertíza rukou písaných zoznamov modelov v aute.",
        paragraph: "§ 142 TP",
      },
      {
        id: "DA-2",
        defenseClaim:
          "Babčan: 'V Tatragene som v živote nebol, zbrane som neprevzal a Mareka Plcha nepoznám. Moja rola bola len kliknúť platbu.'",
        risk: "KRITICKÉ",
        counterStrike:
          "Svedok Marek Plch (konateľ Tatragen) 3x overil totožnosť Babčana z OP a zbrojného preukazu a Babčan osobne podpisoval evidenciu. Vykonať konfrontáciu podľa § 125 TP a porovnať podpisy na preberacích protokoloch.",
        evidenceGap:
          "Protokoly o prevzatí zbraní z predajne v Žiline neboli podrobené porovnaniu podpisového vzoru.",
        paragraph: "§ 125 TP",
      },
      {
        id: "DA-3",
        defenseClaim:
          "Nahrávky predložené D. Marjovom sú nelegálny odposluch z pomsty za odcudzené vozidlá BMW X6 a X5.",
        risk: "STREDNÉ",
        counterStrike:
          "Nahrávka súkromnej osoby nie je odposluchom podľa § 115 TP a je procesne použiteľná, ak zachytáva páchanie závažného zločinu. Podporiť lokalizačnými dátami BTS z odpočívadla D1 Livinské Opatovce.",
        evidenceGap: "Chýba verifikácia metadát a zariadenia, na ktoré bola nahrávka zaznamenaná.",
        paragraph: "§ 115 TP a § 119 TP",
      },
    ],
  },
  evidenceStrength: {
    traces: [
      {
        id: "TR-01",
        name: "Glock 19 Gen 5 (CGDV051) — Europol",
        lr: "> 1 000 000",
        strength: "Nepriestrelné",
        light: "green",
        paragraph: "§ 119 ods. 2 TP",
      },
      {
        id: "TR-02",
        name: "Grand Power K100 (K055902, K055904)",
        lr: "1 : 25 000",
        strength: "Silná",
        light: "green",
        paragraph: "§ 119 ods. 2 TP",
      },
      {
        id: "TR-03",
        name: "Bankové výpisy EB-EU / Tatragen",
        lr: "—",
        strength: "Silná",
        light: "green",
        paragraph: "§ 116 TP",
      },
      {
        id: "TR-04",
        name: "Nahrávky rozhovorov (svedok Marjov)",
        lr: "—",
        strength: "Zraniteľné",
        light: "yellow",
        paragraph: "§ 115 TP",
      },
      {
        id: "TR-05",
        name: "Evidenčná kniha zbraní (stratená)",
        lr: "—",
        strength: "Procesná mína",
        light: "red",
        paragraph: "§ 98 TP",
      },
    ],
    paragraphs: [
      {
        para: "§ 294 TZ",
        title: "Nedovolené ozbrojovanie",
        status: "OK",
        note: "Znaky organizovanej skupiny naplnené",
      },
      {
        para: "§ 98 TP",
        title: "Zabezpečenie vecí",
        status: "Narušené",
        note: "Evidenčné knihy zbraní chýbajú",
      },
      {
        para: "§ 119 TP",
        title: "Zákonnosť dôkazov",
        status: "OK",
        note: "Balistická identifikácia podložená Europolom",
      },
      {
        para: "§ 125 TP",
        title: "Konfrontácia svedkov",
        status: "Príprava",
        note: "Nutná konfrontácia Babčan vs. Plch",
      },
      {
        para: "§ 168 TP",
        title: "Odôvodnenie obžaloby",
        status: "OK",
        note: "Štruktúra pripravená",
      },
    ],
  },
  judgeReadyText: {
    skutkovyStav:
      "V období od mája 2024 do augusta 2026 obvinení Erik Babčan a Dimitri Cohen po vzájomnej dohode a s presne rozdelenými úlohami založili a využili spoločnosť EB-EU s.r.o. na získanie zbrojnej licencie LA 002318. Následne od dodávateľa TATRAGEN s.r.o. odobrali 242 kusov krátkych palných zbraní, ktoré neboli riadne zaevidované v zmysle zákona o zbraniach a strelive a boli neoprávnene prevedené na neznáme osoby a do zahraničia, pričom minimálne 3 zbrane (Glock 19 v.č. CGDV051 a Grand Power K100 v.č. K055902, K055904) boli následne zaistené v kriminálnom prostredí v Španielsku.",
    vyporiadanie:
      "Tvrdenie obvineného Babčana, že zbrane nikdy neprebral a Mareka Plcha nepozná, je jednoznačne vyvrátené svedeckou výpoveďou Mareka Plcha, ktorý potvrdil opakované osobné predloženie dokladov a podpisy v evidenčných hárkoch. Tvrdenie obvineného Cohena o postavení 'nevedomého šoféra za 300 €' je vyvrátené zaistenou dokumentáciou, pečiatkami firiem, rukou písanými zoznamami kalibrov a výpoveďami svedkov Marjova a Skyrčáka.",
    vedecke:
      "Identifikácia zbraní zaistených v Španielsku bola potvrdená prostredníctvom národnej ústredne EUROPOL a porovnávacej balistiky Kriminalistického a expertízneho ústavu PZ s identifikačnou silou LR > 1 000 000 (pre Glock 19) a LR 1:25 000 (pre Grand Power K100), čo predstavuje mimoriadne silný vedecký dôkaz o totožnosti zbraní pochádzajúcich z dodávok spoločnosti TATRAGEN s.r.o.",
  },
  investigativeAnswers: {
    q1_buyer_seller: {
      questionNumber: 1,
      question: "1. Kto zbrane nakupoval a odovzdával?",
      answer:
        "Zbrane v počte 242 kusov osobne preberal v prevádzke TATRAGEN s.r.o. v Žiline obvinený Erik Babčan (konateľ EB-EU s.r.o.). Následnú distribúciu, prevozy vozidlami BMW a nočné odovzdávanie neznámym osobám na odpočívadlách D1 (Livinské Opatovce, Trenčín) operatívne vykonával Dimitri Cohen.",
      identifiedPersons: [
        "Erik Babčan (konateľ EB-EU s.r.o.)",
        "Dimitri Cohen (logistika a distribúcia)",
        "Marek Plch (konateľ TATRAGEN s.r.o.)",
      ],
      directEvidence: [
        "Výpoveď svedka Mareka Plcha potvrdzujúca opakovaný osobný odber Babčanom",
        "Predložený zbrojný preukaz a občiansky preukaz Erika Babčana pri prevzatí",
        "Kúpne zmluvy, dodacie listy a evidenčné knihy TATRAGEN s.r.o.",
        "Zaistené pečiatky EB-EU a Bark Factory vo vozidle BMW riadenom Cohenom",
      ],
      unverifiedHypotheses: [
        "Identita koncových odberateľov zbraní z kufra BMW na odpočívadle Livinské Opatovce",
        "Trasa a spôsob prevozu zaistených zbraní Glock a GP K100 do Španielska",
      ],
      missingEvidence: [
        "Grafologický posudok k podpisom na preberacích protokoloch EB-EU s.r.o.",
        "Kamerové záznamy z čerpacej stanice Slovnaft pri odpočívadle D1",
      ],
      confidenceLevel: 95,
    },
    q2_planner_coordinator: {
      questionNumber: 2,
      question: "2. Kto plán vymyslel a koordinoval?",
      answer:
        "Architektom a koordinátorom schémy bol Dimitri Cohen v úzkej súčinnosti s Erikom Babčanom. Cohen sprostredkoval prevod prázdnej schránkovej firmy EB-EU s.r.o. cez spoločnosť Tavira s.r.o., promptne vybavil zbrojnú licenciu LA 002318 (pričom trezory boli ihneď demontované) a dojednával odbytové provízie 10–20 € za kus.",
      identifiedPersons: [
        "Dimitri Cohen (organizátor a disponent)",
        "Erik Babčan (štatutárny zástupca)",
        "Dmitrij Marjov (sprostredkovateľ / Shadowarms s.r.o.)",
      ],
      directEvidence: [
        "Zmluvná dokumentácia k prevodu obchodného podielu EB-EU s.r.o. cez Tavira s.r.o.",
        "Zvukové nahrávky rozhovorov od svedka D. Marjova dokumentujúce provízie 10-20 €/ks",
        "Správa EUROPOL o zaistení zbraní v sieti organizovaného zločinu v Španielsku",
        "Zápisnica o obhliadke prevádzky potvrdzujúca demontáž trezorov hneď po udelení licencie",
      ],
      unverifiedHypotheses: [
        "Účasť zahraničných organizátorov z Balkánskej trasy na zadávaní špecifikácií zbraní",
      ],
      missingEvidence: [
        "Forenzná extrakcia šifrovanej komunikácie (Signal/Telegram) z Cohenových telefónov",
        "Súdnoznalecké overenie autentičnosti digitálnych audio nahrávok",
      ],
      confidenceLevel: 90,
    },
    q3_financier: {
      questionNumber: 3,
      question: "3. Kto plán financoval?",
      answer:
        "Financovanie prebiehalo hybridným tokom: 71,4 % prostriedkov (106 000 €) tvorili anonymné hotovostné vklady na účet EB-EU s.r.o. v Tatra banke vykonávané bezprostredne pred nákupmi zbraní (technika smurfingu). Zvyšných 42 500 € tvorili bezhotovostné prevody z prepojenej entity Bark Factory s.r.o. pod rúškom fiktívnych pôžičiek.",
      identifiedPersons: [
        "Dimitri Cohen (disponent / zdroj hotovosti)",
        "Erik Babčan (majiteľ účtu EB-EU s.r.o.)",
        "Bark Factory s.r.o. (prepojená spoločnosť)",
      ],
      directEvidence: [
        "Výpisy z bankového účtu EB-EU s.r.o. v Tatra banka a.s.",
        "Pokladničné vkladové lístky s vkladmi tesne pred nákupmi zbraní",
        "Zálohové faktúry vystavené TATRAGEN s.r.o. párované s hotovostnými vkladmi",
        "Faktúry a zmluvy o pôžičke od prepojenej firmy Bark Factory s.r.o.",
      ],
      unverifiedHypotheses: [
        "Presný pôvod vkladanej hotovosti 106 000 € (podozrenie na výnosy z distribúcie narkotík)",
      ],
      missingEvidence: [
        "Kamerové záznamy bánk z vkladomatov a pobočiek Tatra banky pri vkladoch",
        "Majetkové priznania a daňové priznania Cohena a Babčana za roky 2024–2025",
      ],
      confidenceLevel: 98,
    },
  },
  testimonyContradictions: TATRAGEN_CROSS_CONTRADICTIONS,
  financialAnalysis: {
    totalVolume: 148500,
    cashVolume: 106000,
    transferVolume: 42500,
    cashRatioPercent: 71.4,
    suspiciousFlows: [
      {
        id: "SF-01",
        date: "2025-01-22",
        payer: "Hotovostný vkladník (anonym)",
        recipient: "EB-EU s.r.o. (Tatra banka)",
        amount: 32000,
        method: "cash_deposit",
        purpose: "Vklad v hotovosti na účet pred 1. tranžou",
        redFlag: "Vklad 32 000 € bez dokladovania pôvodu 24 hodín pred odberom v Tatragene",
      },
      {
        id: "SF-02",
        date: "2025-01-23",
        payer: "EB-EU s.r.o.",
        recipient: "TATRAGEN s.r.o.",
        amount: 31850,
        method: "wire_transfer",
        purpose: "Úhrada zálohovej faktúry (55 ks zbraní)",
        redFlag: "Okamžitý odtok čerstvo vloženej hotovosti na nákup zbraní",
      },
      {
        id: "SF-03",
        date: "2025-04-10",
        payer: "Smurfing vkladatelia (3x)",
        recipient: "EB-EU s.r.o. (Tatra banka)",
        amount: 44000,
        method: "cash_deposit",
        purpose: "Štiepené vklady v hotovosti (14 500 € + 14 500 € + 15 000 €)",
        redFlag: "Štiepenie transakcií pod 15 000 € limit AML identifikácie (§ 297/2008 Z.z.)",
      },
      {
        id: "SF-04",
        date: "2025-04-11",
        payer: "EB-EU s.r.o.",
        recipient: "TATRAGEN s.r.o.",
        amount: 43200,
        method: "wire_transfer",
        purpose: "Úhrada za 80 ks pištolí Glock a Grand Power",
        redFlag: "Zbrane po prevzatí okamžite odvezené do nočnej distribúcie na D1",
      },
      {
        id: "SF-05",
        date: "2025-08-18",
        payer: "Vkladomat Bratislava (anonym)",
        recipient: "EB-EU s.r.o. (Tatra banka)",
        amount: 30000,
        method: "cash_deposit",
        purpose: "Vkladomatový vklad pred 3. nákupom zbraní",
        redFlag: "Vklad hotovosti cez bankomat bez osobného kontaktu so zamestnancom banky",
      },
      {
        id: "SF-06",
        date: "2025-08-19",
        payer: "Bark Factory s.r.o. (Cohen)",
        recipient: "EB-EU s.r.o.",
        amount: 42500,
        method: "wire_transfer",
        purpose: "Fiktívna zmluva o krátkodobej pôžičke spoločníka",
        redFlag: "Kreditovanie účtu cez prepojenú firmu bez zmluvného krytia a bonity",
      },
    ],
    financingConclusion:
      "Finančný mechanizmus skupiny vykazuje klasické znaky legalizácie príjmov z trestnej činnosti (pranie špinavých peňazí) podľa § 233a TZ. Zo sumy 148 500 € až 71,4 % (106 000 €) tvorili anonymné hotovostné vklady vkladané tesne pred nákupmi, s využitím techniky štiepenia (smurfing) pod limit povinnej AML identifikácie. Legálny bankový účet slúžil iba ako prechodová tranzitná stanica na premenu nelegálnej hotovosti na legálne nakúpené zbrane.",
  },
};
