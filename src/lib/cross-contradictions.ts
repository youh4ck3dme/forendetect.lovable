import type { TestimonyContradiction } from "./types";

/**
 * Celková krížová konfrontačná matica rozporov vo výpovediach (§ 125 Trestného poriadku)
 * Kauza: Nedovolené ozbrojovanie a obchodovanie so zbraňami (PPZ-51/UBOK-PZ-ST-2025)
 * Aktéri: Erik Babčan, Marek Plch (TATRAGEN), Dmitrij Marjov (Shadowarms), Michal Žember (PETRIS), Dimitri Cohen
 */
export const TATRAGEN_CROSS_CONTRADICTIONS: TestimonyContradiction[] = [
  {
    id: "TC-01",
    topic: "Osobná prítomnosť a fyzický odber 242 zbraní v Žiline",
    personA: {
      name: "Erik Babčan",
      status: "obvinený (konateľ EB-EU s.r.o.)",
      claim:
        "V predajni TATRAGEN v Žiline som nikdy nebol, zbrane som nepreberal a Mareka Plcha v živote nevidel. Moja úloha bola len vklad na účet.",
    },
    personB: {
      name: "Marek Plch",
      status: "svedok (konateľ TATRAGEN s.r.o.)",
      claim:
        "Erik Babčan chodil po zbrane vždy sám na aute Audi, 3x osobne predložil občiansky preukaz a zbrojnú licenciu a osobne zapisoval a podpisoval zbrane do evidenčnej knihy zbraní.",
    },
    factualRecord:
      "Svedok Plch jednoznačne stotožnil Babčana pri rekognícii in natura. V evidenčných hárkoch a knihe zbraní TATRAGEN figurujú podpisy v mene Babčana a číslo jeho platného ZP. Fyzická prítomnosť doložená aj úhradami zálohových faktúr z účtu EB-EU s.r.o.",
    deceitPercentage: 95,
    contradictionSeverity: "critical",
    proceduralResolution:
      "Vykonať konfrontáciu podľa § 125 TP medzi Babčanom a Plchom; nariadiť znalecké dokazovanie z odboru písmoznalectva (§ 142 TP) na podpisy v evidenčných knihách zbraní; zabezpečiť BTS lokalizáciu mobilu.",
  },
  {
    id: "TC-02",
    topic: "Osobná návšteva a nákupy zbraní v predajni PETRIS Nitra",
    personA: {
      name: "Erik Babčan",
      status: "obvinený",
      claim:
        "Spoločnosť PETRIS-SLOVAKIA s.r.o. ani Michala Žembera nepoznám, v Nitre som v živote nebol a žiadne zbrane odtiaľ nekupoval.",
    },
    personB: {
      name: "Michal Žember",
      status: "svedok (konateľ PETRIS-SLOVAKIA s.r.o.)",
      claim:
        "V auguste 2025 prišiel do predajne v Nitre Cohen a spolu s ním Erik Babčan v šiltovke, fotil zbrane a objednával tovar. Neskôr mi Babčan cez Cohenov telefón osobne potvrdil, že zbrane prevzal a zapísal do knihy zbraní.",
    },
    factualRecord:
      "Svedok Žember predložil vyšetrovateľovi prefotený občiansky a vodičský preukaz Erika Babčana a dodacie listy s jeho podpisom. Telefonát cez Cohenov telefón priamo potvrdzuje Babčanovo zapojenie do preberania tovaru v hodnote desiatok tisíc eur.",
    deceitPercentage: 92,
    contradictionSeverity: "critical",
    proceduralResolution:
      "Vykonať konfrontáciu podľa § 125 TP Babčan vs. Žember; vykonať rekogníciu in natura / podľa fotografií (§ 126 TP); zabezpečiť výpisy telekomunikačnej prevádzky (§ 116 TP) medzi telefónmi Cohena, Babčana a Žembera.",
  },
  {
    id: "TC-03",
    topic: "Disponovanie a výbery z bankomatovej karty EB-EU s.r.o.",
    personA: {
      name: "Erik Babčan",
      status: "obvinený",
      claim:
        "S firemnou kartou EB-EU s.r.o. disponoval iba Ľuboš. Ja som robil len prevody a neviem o tom, že by z nej vyberal niekto iný.",
    },
    personB: {
      name: "Dmitrij Marjov",
      status: "svedok (konateľ Shadowarms s.r.o.)",
      claim:
        "Cohen mi osobne odovzdal bankomatovú kartu EB-EU s.r.o. vystavenú na meno Erik Babčan (č. 4234 7305 7598 2857) a 19.01.2025 som z nej osobne vybral 1 000 € na kúpu českej firmy pre Cohena. Kartu som odfotil a fotky odovzdal polícii.",
    },
    factualRecord:
      "Svedok Marjov odovzdal OČTK fotografie oboch strán platobnej karty EB-EU s.r.o. vystavenej na meno Erik Babčan. Bankové výpisy potvrdzujú výber hotovosti 1 000 € dňa 19.01.2025. Babčan vedome umožnil obeh platobnej karty medzi neoprávnenými osobami.",
    deceitPercentage: 88,
    contradictionSeverity: "high",
    proceduralResolution:
      "Zabezpečiť výpis z bankového účtu Tatra banka a.s. k debetnej karte č. 4234 7305 7598 2857 (§ 119 ods. 1 písm. f) TP); zabezpečiť kamerové záznamy z bankomatu z 19.01.2025; konfrontovať Babčana so zverením karty tretím osobám.",
  },
  {
    id: "TC-04",
    topic: "Rola organizátora vs. „nevinného šoféra“ a nákupy v hotovosti",
    personA: {
      name: "Dimitri Cohen",
      status: "obvinený (spoločník Tavira s.r.o.)",
      claim:
        "Bol som len radový najatý šofér za 300–400 € na jazdu. Netušil som, čo je v taškách v kufri auta, zbrane som v živote nevidel ani nepredával.",
    },
    personB: {
      name: "Dmitrij Marjov & Michal Žember",
      status: "svedkovia (predajcovia zbraní)",
      claim:
        "Žember: Cohen platil desaťtisíce eur v hotovosti (14 000 €, 17 500 €) a meral výklady, lebo budoval vlastnú predajňu. Marjov: V Sučanoch mi Cohen navrhol odber 300–400 zbraní mesačne so ziskom 100 €/ks a priznal nelegálnosť ďalšieho predaja (existuje nahrávka).",
    },
    factualRecord:
      "Prehliadka motorového vozidla BMW X6m a výsluchy svedkov dokazujú, že Cohen disponoval stotisícovými sumami v hotovosti, dojednával nákupy stoviek zbraní a priamo plánoval ich distribúciu mimo legálny režim. Dňa 09.12.2025 si nechal poslať plnomocenstvo na prevoz zbraní na email ivankamarek.sk@gmail.com.",
    deceitPercentage: 95,
    contradictionSeverity: "critical",
    proceduralResolution:
      "Vykonať konfrontáciu Cohen vs. Marjov podľa § 125 TP; vykonať súdnolekárske a fonoskopické overenie audiozáznamu zo Sučian (§ 142 TP); sprísniť právnu kvalifikáciu na organizátora zločineckej skupiny podľa § 138 písm. h) TZ.",
  },
  {
    id: "TC-05",
    topic:
      "Úmyselné marenie evidencie a strata evidenčných kníh zbraní LA 002318",
    personA: {
      name: "Erik Babčan & Dimitri Cohen",
      status: "obvinení",
      claim:
        "Knihy zbraní sa stratili pri sťahovaní, alebo ich má ten druhý. Žiadnu nelegálnu distribúciu sme neorganizovali.",
    },
    personB: {
      name: "KR PZ Banská Bystrica & Žember",
      status: "kontrolný orgán a svedok",
      claim:
        "Trezory boli z deklarovanej predajne na ul. Vysokoškolákov v Žiline odvezené ihneď po kontrole licencie; evidencia sa na adrese nikdy neviedla a Cohen pri nákupoch knihu nikdy nepredložil.",
    },
    factualRecord:
      "Spoločnosť EB-EU s.r.o. bola účelovo založená ako fiktívna prietoková entita na nákup zbraní. Úmyselné 'stratenie' kníh zbraní znemožnilo OČTK fyzicky dohľadať 242 zbraní z TATRAGENu a desiatky Glockov z PETRISu, pričom zbraň Glock 19 (CGDV051) bola zaistená v kriminálnom prostredí v Španielsku.",
    deceitPercentage: 90,
    contradictionSeverity: "high",
    proceduralResolution:
      "Vykonať prehliadku a zaistenie vecí podľa § 89 a § 101 TP na dohľadanie evidencie zbraní; vzniesť obvinenie z marenia spravodlivosti podľa § 344 TZ a nedovoleného ozbrojovania podľa § 294 TZ.",
  },
  {
    id: "TC-06",
    topic: "Prechod na schránkovú spoločnosť Bark Factory Enterprise s.r.o.",
    personA: {
      name: "Erik Babčan",
      status: "obvinený",
      claim:
        "Spoločnosť Bark Factory Enterprise s.r.o., Borinka 127, ani Filipa Flata vôbec nepoznám a o ďalších nákupoch neviem.",
    },
    personB: {
      name: "Michal Žember & Dmitrij Marjov",
      status: "svedkovia",
      claim:
        "Žember: Cohen po nezhodách s Babčanom plynule prešiel na firmu Bark Factory Enterprise a dal mi k telefónu Filipa Flata, ktorý to potvrdil. Marjov: V aute BMW X6m po Cohenovi som našiel originál pečiatku Bark Factory a 6 faktúr PETRIS.",
    },
    factualRecord:
      "Vozidlo BMW X6m užívané Cohenom obsahovalo originálnu pečiatku Bark Factory Enterprise s.r.o. a 6 faktúr PETRIS-SLOVAKIA. Po tom, čo Babčan zablokoval financie a polícia skontrolovala priestory EB-EU, skupina plynule pokračovala v nákupoch cez identický model s druhou schránkovou entitou.",
    deceitPercentage: 85,
    contradictionSeverity: "high",
    proceduralResolution:
      "Predvolať a vypočuť Filipa Flata podľa § 121 TP; vykonať konfrontáciu podľa § 125 TP; zaistiť kompletnú účtovnú a zmluvnú dokumentáciu Bark Factory Enterprise podľa § 90 TP.",
  },
];

/**
 * Vráti štatistiku a súhrn krížovej konfrontácie pre súdne potreby
 */
export function getCrossContradictionStats(
  contradictions: TestimonyContradiction[] = TATRAGEN_CROSS_CONTRADICTIONS,
) {
  const total = contradictions.length;
  const critical = contradictions.filter(
    (c) => c.contradictionSeverity === "critical",
  ).length;
  const high = contradictions.filter(
    (c) => c.contradictionSeverity === "high",
  ).length;
  const medium = contradictions.filter(
    (c) => c.contradictionSeverity === "medium",
  ).length;
  const avgDeceit =
    total > 0
      ? Math.round(
          contradictions.reduce((acc, c) => acc + c.deceitPercentage, 0) /
            total,
        )
      : 0;

  return {
    total,
    critical,
    high,
    medium,
    avgDeceitPercentage: avgDeceit,
  };
}
