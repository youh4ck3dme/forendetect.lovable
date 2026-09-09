import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { buildReportHTML, computeDossierSha256 } from "../src/lib/export-pdf";
import type { ForensicDossier } from "../src/lib/types";

const dossier: ForensicDossier = {
  caseId: "PPZ-51/UBOK-PZ-ST-2025",
  caseTitle:
    "Kauza nelegálneho obchodu so zbraňami TATRAGEN & EB-EU (Erik Babčan, Dimitri Cohen a spol.)",
  defendabilityIndex: 78,
  generatedAt: "2026-09-09T10:30:00.000Z",
  facts: {
    timeline: [
      {
        time: "2024-05-21",
        event:
          "Odkúpenie spoločnosti EB-EU s.r.o., Erik Babčan sa stáva formálnym konateľom na pokyn D. Cohena.",
        source: "Výpis z Obchodného registra SR / Spis č. l. 12",
        chainBreak: false,
        severity: "info",
        paragraph: "§ 119 TP",
      },
      {
        time: "2024-12-27",
        event:
          "Vydanie zbrojnej licencie č. LA 002318 pre EB-EU s.r.o. na fiktívnu predajňu v Žiline.",
        source: "Rozhodnutie KR PZ Banská Bystrica č. l. 45",
        chainBreak: false,
        severity: "warning",
        paragraph: "§ 119 TP",
      },
      {
        time: "2025-01-23",
        event:
          "1. nákup zbraní v TATRAGEN s.r.o. (Žilina) — 48 ks pištolí Glock 19 Gen 5 a GP K100.",
        source: "Zápisnica o výsluchu svedka Mareka Plcha (č. l. 82) a zálohová faktúra",
        chainBreak: false,
        severity: "critical",
        paragraph: "§ 294 TZ",
      },
      {
        time: "2025-03-03",
        event:
          "2. nákup v TATRAGEN s.r.o. — kumulatívne nakúpených 242 kusov krátkych palných zbraní.",
        source: "Faktúry a evidenčná kniha zbraní TATRAGEN s.r.o. (č. l. 110)",
        chainBreak: false,
        severity: "critical",
        paragraph: "§ 294 TZ",
      },
      {
        time: "2025-12-08",
        event:
          "Zadržanie Dimitriho Cohena v Trenčíne, zaistenie pečiatok EB-EU a zoznamov kalibrov.",
        source: "Protokol o osobnej prehliadke a prehliadke vozidla (č. l. 195)",
        chainBreak: false,
        severity: "critical",
        paragraph: "§ 95 ods. 1 TP",
      },
      {
        time: "2026-02-06",
        event:
          "EUROPOL dožiadanie: zaistenie pištole Glock 19 v. č. CGDV051 v kriminálnom prostredí v Španielsku.",
        source: "Správa národnej ústredne EUROPOL č. l. 240",
        chainBreak: false,
        severity: "critical",
        paragraph: "§ 119 ods. 2 TP",
      },
    ],
    traces: [
      {
        id: "TR-01",
        type: "balistická",
        description:
          "Pištoľ Glock 19 Gen 5, v. č. CGDV051 (zhoda s predajom v TATRAGEN s.r.o. a zaistením v ES)",
        light: "green",
        chainComplete: true,
        lr: "> 1 000 000",
        paragraph: "§ 119 ods. 2 TP",
      },
      {
        id: "TR-02",
        type: "balistická",
        description: "2x Grand Power K100 mk12 (v. č. K055902, K055904) zaistené v Španielsku",
        light: "green",
        chainComplete: true,
        lr: "> 500 000",
        paragraph: "§ 119 ods. 2 TP",
      },
      {
        id: "TR-03",
        type: "dokument",
        description:
          "Evidenčná kniha zbraní TATRAGEN s.r.o. s originálmi podpisov a predloženým OP E. Babčana",
        light: "green",
        chainComplete: true,
        lr: "—",
        paragraph: "§ 142 TP",
      },
      {
        id: "TR-04",
        type: "digitálna",
        description: "Fonoskopický záznam a zoznamy marží zaistené vo vozidle BMW X6 (D. Marjov)",
        light: "yellow",
        chainComplete: true,
        lr: "—",
        paragraph: "§ 119 ods. 2 TP",
      },
      {
        id: "TR-05",
        type: "dokument",
        description: "Evidenčná kniha zbraní EB-EU s.r.o. — účelovo zatajená/odcudzená obvinenými",
        light: "red",
        chainComplete: false,
        lr: "—",
        paragraph: "§ 98 TP",
      },
    ],
  },
  defenseAttack: {
    overallRisk: "STREDNÉ",
    attacks: [
      {
        id: "DA-01",
        defenseClaim: "Erik Babčan: V TATRAGENe som nikdy nebol a zbrane som fyzicky neprevzal.",
        risk: "NÍZKE",
        counterStrike:
          "Vyvrátené svedectvom M. Plcha (3x overil OP), podpismi v knihe zbraní a kamerovým záznamom.",
        evidenceGap:
          "Žiadna medzera — skutkový stav je jednoznačne preukázaný svedkom i listinami.",
        paragraph: "§ 168 TP",
      },
      {
        id: "DA-02",
        defenseClaim:
          "Dimitri Cohen: Bol som len nevinný šofér za 300 € a veril som, že obchod je legálny.",
        risk: "STREDNÉ",
        counterStrike:
          "Vyvrátené absenciou zbrojného preukazu, nočným vykladaním z kufra, držbou pečiatok oboch firiem a zmluvami.",
        evidenceGap:
          "Doplniť výsluch advokáta, ktorý overoval splnomocnenia pre firmu Bark Factory Enterprise.",
        paragraph: "§ 125 TP",
      },
      {
        id: "DA-03",
        defenseClaim:
          "Obhajoba: Nezákonnosť prehliadky vozidla BMW X6 bez predchádzajúceho príkazu sudcu.",
        risk: "NÍZKE",
        counterStrike:
          "Prehliadka vykonaná ako neodkladný a neopakovateľný úkon podľa § 95 ods. 1 TP z dôvodu nebezpečenstva z omeškania.",
        evidenceGap:
          "Zápisnica o neodkladnosti úkonu je riadne založená na č. l. 88 vyšetrovacieho spisu.",
        paragraph: "§ 95 ods. 1 TP",
      },
    ],
  },
  evidenceStrength: {
    traces: [
      {
        id: "TR-01",
        name: "Glock 19 Gen 5 (v. č. CGDV051) — nález EUROPOL Španielsko",
        lr: "> 1 000 000",
        strength: "Nepriestrelné",
        light: "green",
        paragraph: "§ 119 ods. 2 TP",
      },
      {
        id: "TR-02",
        name: "Grand Power K100 (v. č. K055902, K055904) — nález Španielsko",
        lr: "> 500 000",
        strength: "Nepriestrelné",
        light: "green",
        paragraph: "§ 119 ods. 2 TP",
      },
      {
        id: "TR-03",
        name: "Kniha zbraní a streliva TATRAGEN s.r.o. (zápis a podpis Babčan)",
        lr: "—",
        strength: "Silná",
        light: "green",
        paragraph: "§ 142 TP",
      },
      {
        id: "TR-04",
        name: "Digitálne nahrávky rozhovorov a faktúry (Marjov)",
        lr: "—",
        strength: "Silná",
        light: "yellow",
        paragraph: "§ 119 ods. 2 TP",
      },
      {
        id: "TR-05",
        name: "Evidencia zbraní EB-EU s.r.o. (fyzicky nedodaná kniha)",
        lr: "—",
        strength: "Zraniteľné",
        light: "red",
        paragraph: "§ 98 TP",
      },
    ],
    paragraphs: [
      {
        para: "§ 294 ods. 2, ods. 4 písm. a) TZ",
        title: "Nedovolené ozbrojovanie a obchodovanie so zbraňami (veľký rozsah)",
        status: "OK",
        note: "242 kusov zbraní kategórie B preukázateľne uvedených do nelegálnej distribúcie bez sprievodných listov.",
      },
      {
        para: "§ 138 písm. h) TZ",
        title: "Spáchanie trestného činu organizovanou skupinou",
        status: "OK",
        note: "Koordinovaná deľba úloh: financovanie (Ľubo), riadenie a logistika (Cohen), konateľ a podpis (Babčan).",
      },
      {
        para: "§ 233 ods. 1, ods. 3 TZ",
        title: "Legalizácia výnosu z trestnej činnosti",
        status: "Príprava",
        note: "Prebieha dožiadanie k bankovým účtom v Rakúsku a overenie hotovostných vkladov 96 000 €.",
      },
      {
        para: "§ 125 TP",
        title: "Konfrontácia pri rozporoch vo výpovediach",
        status: "OK",
        note: "Vypracované otázky a dôkazné body pre konfrontáciu Babčan vs. Plch a Cohen vs. Žember.",
      },
    ],
  },
  judgeReadyText: {
    skutkovyStav:
      "Obvinený Erik Babčan a obvinený Dimitri Cohen v presne nezistenom čase od mája 2024 do augusta 2026 po predchádzajúcej vzájomnej dohode a po dohode s ďalšími doposiaľ nestotožnenými osobami (najmä osobou vystupujúcou pod menom „Ľubo“) konajúc ako organizovaná skupina s deľbou úloh, v úmysle zadovážiť sebe a iným neoprávnený majetkový prospech, účelovo využili zbrojnú licenciu spoločnosti EB-EU s.r.o. na nelegálny nákup 242 kusov krátkych palných zbraní v predajni TATRAGEN s.r.o. v Žiline v hodnote 128 400 €, ktoré následne v rozpore so zákonom o strelných zbraniach a strelive bez povolenia OČTK a bez zbrojných sprievodných listov prepravili a odovzdali neznámym odberateľom na území Slovenskej republiky a do zahraničia, kde boli zbrane zaistené v nelegálnej držbe.",
    vyporiadanie:
      "Obhajoba obvineného Erika Babčana, podľa ktorej bol v predajni TATRAGEN iba formálne a zbrane v skutočnosti neprevzal, bola jednoznačne vyvrátená priamym svedectvom konateľa predajne Mareka Plcha, ktorý obvineného bezpečne spoznal, potvrdil trojnásobnú fyzickú kontrolu jeho občianskeho preukazu a predložil originál evidenčnej knihy zbraní s vlastnoručnými podpismi obvineného. Tvrdenie obvineného Dimitriho Cohena o postavení „iba radového vodiča bez vedomosti o povahe nákladu“ je v logickom i právnom rozpore so skutočnosťou, že menovaný nedisponoval zbrojným preukazom, manipuloval s firemnými pečiatkami, nočne odovzdával zbrane z batožinového priestoru a po zlyhaní dodávateľa osobne organizoval novú spoločnosť Bark Factory Enterprise s.r.o. Súd preto obe obhajobné verzie odmieta ako účelové.",
    vedecke:
      "Kriminalistický a expertízny ústav PZ (oddelenie balistiky) v spojení so správou národnej ústredne EUROPOL vykonal komparatívnu mikroskopickú expertízu nábojníc a hlavňových drážok zaistenej pištole Glock 19 Gen 5, v. č. CGDV051. Podľa medzinárodného štandardu ENFSI dosahuje pomer vierohodnosti hodnotu LR > 1 000 000, čo predstavuje extrémne silnú vedeckú podporu hypotézy, že zaistená zbraň pochádza z dodávky TATRAGEN s.r.o. z 23.01.2025. Reťazec zabezpečenia stopy (Chain of Custody) bol overený od okamihu zaistenia až po znalecké skúmanie bez prerušenia integrity.",
  },
  investigativeAnswers: {
    q1_buyer_seller: {
      questionNumber: 1,
      question: "Kto zbrane nakupoval a následne predával alebo odovzdával?",
      answer:
        "Nákup v TATRAGEN s.r.o. (242 ks) realizoval osobne Erik Babčan (konateľ EB-EU s.r.o.). Preberanie, prepravu v nočných hodinách a následné odovzdávanie zbraní neznámym odberateľom realizoval Dimitri Cohen osobnými motorovými vozidlami (Audi, BMW, Nissan).",
      identifiedPersons: [
        "Erik Babčan",
        "Marek Plch",
        "Dimitri Cohen",
        "Dmitrij Marjov",
        "Michal Žember",
      ],
      directEvidence: [
        "Evidenčná kniha zbraní TATRAGEN s.r.o.",
        "Faktúry a bankové prevody",
        "Trasovacia správa EUROPOL Španielsko",
        "Zaistené pečiatky firiem",
      ],
      unverifiedHypotheses: ["Identita koncových zahraničných odberateľov v Španielsku"],
      missingEvidence: ["Originál evidenčnej knihy EB-EU s.r.o."],
      confidenceLevel: 95,
    },
    q2_planner_coordinator: {
      questionNumber: 2,
      question: "Kto celý plán vymyslel, riadil alebo koordinoval?",
      answer:
        "Plán riadili Dimitri Cohen a doposiaľ presne nestotožnená osoba vystupujúca ako „Ľubo“ / „Marek“. Cohen zabezpečil schránkové spoločnosti (EB-EU, Bark Factory), advokátske plnomocenstvá a organizoval logistiku. „Ľubo“ určoval požiadavky na sortiment a financovanie.",
      identifiedPersons: ["Dimitri Cohen", "„Ľubo“ / „Marek“", "Norbert Skyrčák", "Dmitrij Marjov"],
      directEvidence: [
        "Zaistené rukou písané poznámky vo vozidle BMW X6",
        "Zvukové nahrávky rozhovorov (svedok Marjov)",
        "Výpoveď svedka Michala Žembera",
      ],
      unverifiedHypotheses: ["Plná totožnosť osoby „Ľubo“ (prebieha operatívne preverovanie)"],
      missingEvidence: ["Výsluch sprostredkovateľa Skyrčáka"],
      confidenceLevel: 90,
    },
    q3_financier: {
      questionNumber: 3,
      question: "Kto celý plán financoval?",
      answer:
        "Financovanie bolo zabezpečené prostredníctvom hotovostných vkladov realizovaných osobou „Ľubo“ na účet spoločnosti EB-EU s.r.o. v pobočkách Tatra banky v celkovej sume presahujúcej 96 000 €, z ktorých boli obratom hradené zálohové faktúry predajcovi zbraní.",
      identifiedPersons: ["„Ľubo“", "Erik Babčan", "Dimitri Cohen"],
      directEvidence: [
        "Bankové výpisy z účtu Tatra banka",
        "Pokladničné potvrdenky o vkladoch hotovosti",
        "Faktúry TATRAGEN s.r.o.",
      ],
      unverifiedHypotheses: ["Pôvod hotovostných prostriedkov vkladaných osobou Ľubo"],
      missingEvidence: ["Výpisy z účtov zahraničných spoločností Tavira s.r.o."],
      confidenceLevel: 88,
    },
  },
  testimonyContradictions: [
    {
      id: "TC-01",
      topic: "Osobné objednanie, prevzatie a podpis 242 zbraní v TATRAGEN s.r.o.",
      personA: {
        name: "Erik Babčan",
        status: "obvinený",
        claim:
          "V TATRAGENe som v živote nebol, Plcha nepoznám, zbrane som nikdy nepreberal ani nevidel.",
      },
      personB: {
        name: "Marek Plch",
        status: "svedok (konateľ TATRAGEN)",
        claim:
          "Babčan osobne prišiel 3x na aute Audi, predložil OP a zbrojnú licenciu a vlastnoručne podpisoval knihu.",
      },
      factualRecord:
        "Svedok Plch jednoznačne potvrdil opakované osobné stretnutia a predložil knihu zbraní s podpismi Babčana. Zároveň bol doložený výpis z účtu s platbou z účtu konateľa Babčana.",
      deceitPercentage: 95,
      contradictionSeverity: "critical",
      proceduralResolution:
        "Nariadiť konfrontáciu podľa § 125 TP medzi obvineným Erikom Babčanom a svedkom Marekom Plchom a nariadiť znalecké písmoznalecké skúmanie podpisov.",
    },
    {
      id: "TC-02",
      topic: "Rola Dimitriho Cohena („Nevinný šofér“ vs. hlavný organizátor)",
      personA: {
        name: "Dimitri Cohen",
        status: "obvinený",
        claim:
          "Ja som bol len šofér za 300 € na cestu, veril som, že je to legálne, zbrane som nevidel a nemal som zisk.",
      },
      factualRecord:
        "Cohen nemal zbrojný preukaz, nočne otváral kufor neznámym osobám, disponoval pečiatkami oboch firiem a po zlyhaní PETRISu osobne dohodol novú firmu Bark Factory Enterprise.",
      deceitPercentage: 90,
      contradictionSeverity: "critical",
      proceduralResolution:
        "Opätovný výsluch obvineného so zameraním na pôvod zaistených pečiatok a konfrontácia podľa § 125 TP so svedkom Dmitrijom Marjovom.",
    },
    {
      id: "TC-03",
      topic: "Zmiznutie evidenčnej knihy zbraní a fiktívna predajňa v Žiline",
      personA: {
        name: "Erik Babčan",
        status: "obvinený",
        claim: "Všetky knihy som odovzdal Ľubošovi, ja o ničom neviem.",
      },
      personB: {
        name: "Dimitri Cohen",
        status: "obvinený",
        claim: "O knihách zbraní nič neviem, evidenciu mal riešiť Babčan.",
      },
      factualRecord:
        "Evidenčná kniha zbraní bola po vydaní licencie úmyselne zatajená, aby OČTK nemohli spárovať výrobné čísla 242 zbraní s ich koncovými odberateľmi.",
      deceitPercentage: 85,
      contradictionSeverity: "high",
      proceduralResolution:
        "Vyžiadanie kamerových záznamov z predajne papiernictva pri Europa SC v Banskej Bystrici a vyšetrovací pokus.",
    },
    {
      id: "TC-04",
      topic: "Dôveryhodnosť kľúčového svedka Dmitrija Marjova",
      personA: {
        name: "Dimitri Cohen",
        status: "obvinený",
        claim:
          "Marjov mi ukradol autá BMW X6 a X5 a vypovedá krivo, aby sa obohatil a vydieral ma.",
      },
      personB: {
        name: "Dmitrij Marjov",
        status: "svedok",
        claim:
          "Odovzdal som polícii rukou písané zoznamy marží nájdené vo vozidle a nahrávky rozhovorov s Cohenom.",
      },
      factualRecord:
        "Zaistené listiny z vozidla presne korešpondujú s reálnymi dodávkami zbraní v PETRIS-SLOVAKIA s.r.o. a províziami 10–20 € na kus.",
      deceitPercentage: 75,
      contradictionSeverity: "medium",
      proceduralResolution:
        "Fonoskopické a grafologické znalecké skúmanie zvukových nahrávok a rukopisov (§ 142 TP).",
    },
  ],
  financialAnalysis: {
    totalVolume: 128400,
    cashVolume: 96000,
    transferVolume: 32400,
    cashRatioPercent: 74.77,
    financingConclusion:
      "Finančné toky vykazujú vysokú mieru rizikovosti. Drvivá väčšina prostriedkov (takmer 75 %) bola vložená v hotovosti neznámymi osobami bez daňového a účtovného krytia tesne pred nákupom zbraní, čo zakladá podozrenie zo spáchania trestného činu Legalizácie výnosu z trestnej činnosti podľa § 233 Trestného zákona.",
    suspiciousFlows: [
      {
        id: "SF-01",
        date: "2025-01-23",
        payer: "Hotovosť (Ľubo)",
        recipient: "EB-EU s.r.o. (Tatra banka)",
        amount: 25000,
        method: "cash_deposit",
        purpose: "Vklad na účet — nákup zbraní",
        redFlag: "Vklad v hotovosti bez preukázania legálneho pôvodu finančných prostriedkov",
      },
      {
        id: "SF-02",
        date: "2025-01-24",
        payer: "EB-EU s.r.o.",
        recipient: "TATRAGEN s.r.o.",
        amount: 24800,
        method: "wire_transfer",
        purpose: "Zálohová faktúra č. 20250012 (Glock 19)",
        redFlag: "Okamžitý odtok peňazí do 24 hodín po hotovostnom vklade",
      },
      {
        id: "SF-03",
        date: "2025-03-03",
        payer: "Hotovosť (Ľubo)",
        recipient: "EB-EU s.r.o. (Tatra banka)",
        amount: 35000,
        method: "cash_deposit",
        purpose: "Vklad na účet — 2. tranža zbraní",
        redFlag: "Štiepenie platieb na viacerých pobočkách v Žiline a Banskej Bystrici",
      },
      {
        id: "SF-04",
        date: "2025-03-04",
        payer: "EB-EU s.r.o.",
        recipient: "TATRAGEN s.r.o.",
        amount: 34200,
        method: "wire_transfer",
        purpose: "Faktúra č. 20250034 (Grand Power K100)",
        redFlag: "Nákup zbraní na spoločnosť bez reálneho sídla a predajných priestorov",
      },
      {
        id: "SF-05",
        date: "2025-08-15",
        payer: "Dimitri Cohen (v hotovosti)",
        recipient: "PETRIS-SLOVAKIA s.r.o. (Nitra)",
        amount: 18500,
        method: "handover",
        purpose: "Priama hotovostná úhrada za zbrane",
        redFlag: "Porušenie zákona č. 394/2012 Z. z. o obmedzení platieb v hotovosti (> 15 000 €)",
      },
    ],
  },
};

// 1. Výpočet SHA-256 cez export-pdf.ts
const computedSha256 = computeDossierSha256(dossier);

// 2. Overenie voči Node.js crypto
const canonicalDossier = JSON.stringify(dossier, Object.keys(dossier).sort());
const expectedSha256 = crypto.createHash("sha256").update(canonicalDossier, "utf8").digest("hex");
const isHashValid = computedSha256 === expectedSha256;

console.log("=== KRYPTOGRAFICKÉ OVERENIE SHA-256 ===");
console.log("Vypočítaný SHA-256 hash (export-pdf.ts):", computedSha256);
console.log("Referenčný SHA-256 hash (node:crypto):   ", expectedSha256);
console.log(
  "Stav platnosti SHA-256:                  ",
  isHashValid ? "PLATNÝ (100% ZHODA)" : "NEPLATNÝ",
);

// 3. Generovanie HTML súdneho posudku
const html = buildReportHTML(dossier);
const outHtmlPath = path.resolve("docs/forenz/VZOROVY_SUDNY_POSUDOK_PPZ-51-UBOK-PZ-ST-2025.html");
fs.writeFileSync(outHtmlPath, html, "utf8");
console.log("Vzorový HTML posudok vygenerovaný do:   ", outHtmlPath, "(", html.length, "znakov )");

// 4. Konverzia na PDF cez Microsoft Edge Headless CLI
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const outPdfPath = path.resolve("docs/forenz/VZOROVY_SUDNY_POSUDOK_PPZ-51-UBOK-PZ-ST-2025.pdf");

if (fs.existsSync(edgePath)) {
  try {
    const fileUrl = "file:///" + outHtmlPath.replace(/\\/g, "/");
    execSync(`"${edgePath}" --headless --disable-gpu --print-to-pdf="${outPdfPath}" "${fileUrl}"`, {
      stdio: "pipe",
    });
    const pdfStat = fs.statSync(outPdfPath);
    console.log(
      "Súdny PDF posudok úspešne vygenerovaný:",
      outPdfPath,
      "(",
      pdfStat.size,
      "bajtov )",
    );
  } catch (e: unknown) {
    const err = e as Error;
    console.warn("PDF export varovanie:", err.message);
  }
}

// 5. Audit formátovania podľa Trestného poriadku
console.log("\n=== AUDIT FORMÁTOVANIA PODĽA TRESTNÉHO PORIADKU ===");
const checks: [string, boolean][] = [
  ["Spisová značka / ČVS v hlavičke (§ 142 TP)", html.includes("PPZ-51/UBOK-PZ-ST-2025")],
  [
    "Kryptografická doložka integrity (§ 119 ods. 2 TP)",
    html.includes(computedSha256) && html.includes("Doložka integrity a nemennosti"),
  ],
  [
    "Oddiel I. Zistený skutkový stav (§ 119 ods. 1 TP)",
    html.includes("I. Zistený skutkový stav (§ 119 ods. 1 Trestného poriadku)"),
  ],
  [
    "Oddiel II. Vyporiadanie sa s obhajobou (§ 168 TP)",
    html.includes("II. Vyporiadanie sa s obhajobou obvineného (§ 168 TP)"),
  ],
  [
    "Oddiel III. Vedecké zhodnotenie stôp (LR & ENFSI)",
    html.includes("III. Vedecké zhodnotenie stôp") && html.includes("> 1 000 000"),
  ],
  [
    "Matica rozporov vo výpovediach (§ 125 TP — Konfrontácia)",
    html.includes("§ 125 TP — Konfrontácia") &&
      html.includes("Nariadiť konfrontáciu podľa § 125 TP"),
  ],
  ["Kvantifikácia miery nepravdy v percentách", html.includes("95 %") && html.includes("90 %")],
  [
    "Forenzná analýza transakcií (§ 119 ods. 1 písm. f) TP)",
    html.includes("§ 119 ods. 1 písm. f) TP") && html.includes("Podozrivé finančné toky"),
  ],
  [
    "Právna kvalifikácia trestných činov (§ 294 TZ, § 138 TZ)",
    html.includes("§ 294 ods. 2, ods. 4 písm. a) TZ") && html.includes("§ 138 písm. h) TZ"),
  ],
  [
    "Znalecké osvedčenie a podpisová doložka",
    html.includes("Znalcovo a procesné osvedčenie:") &&
      html.includes("Dozorujúci prokurátor / Predseda senátu"),
  ],
];

checks.forEach(([name, passed]) => {
  console.log(passed ? "  [PASS]" : "  [FAIL]", name);
});
