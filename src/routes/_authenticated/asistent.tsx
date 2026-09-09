import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bot,
  Eye,
  Loader2,
  ShieldAlert,
  Shield,
  Scale,
  Gavel,
  FileCheck,
  Download,
  Clock,
  AlertTriangle,
  CheckCheck,
  Gauge,
  Scan,
  FileText,
  Lock,
  UploadCloud,
  RotateCcw,
  Copy,
  Check,
  Zap,
  HelpCircle,
  Landmark,
  Users,
  Trash2,
  Plus,
  X,
  FileSpreadsheet,
  ArrowRightLeft,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import {
  AppHeader,
  BottomNav,
  Card,
  PhoneFrame,
  Screen,
  SectionTitle,
} from "@/components/malte/Shell";
import { EmptyState } from "@/components/malte/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveCase } from "@/hooks/useActiveCase";
import {
  getAiStatus,
  previewAiPayload,
  runAiTask,
  runForensicAutopilot,
  extractFileText,
  extractBulkFilesText,
  saveCaseDossier,
  getForensicDossier,
  type AiRunResult,
  type AiTask,
} from "@/lib/ai.functions";
import type { ForensicDossier, BulkFileItem } from "@/lib/types";
import { exportDossierToPDF } from "@/lib/export-pdf";
import { upsertTransaction } from "@/lib/case-data";
import { TATRAGEN_CROSS_CONTRADICTIONS } from "@/lib/cross-contradictions";

export const Route = createFileRoute("/_authenticated/asistent")({
  head: () => ({
    meta: [
      { title: "Forenzný Autopilot — Forendo" },
      {
        name: "description",
        content:
          "1 Drop → 1 Obrazovka → 1 Export. Forenzná analýza spisov, detekcia zlomov v reťazci a simulátor útoku obhajoby.",
      },
      { property: "og:title", content: "Forenzný Autopilot — Forendo" },
      {
        property: "og:description",
        content: "Procesná analýza spisu, Likelihood Ratio a rozsudkový formát § 168 TP.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Assistant,
});

const TASK_LABELS: Record<AiTask, string> = {
  explain_finding: "Vysvetliť vybraný nález",
  case_summary: "Návrh zhrnutia prípadu",
  normalize_descriptions: "Normalizovať popisy platieb",
};

type Suggestion = {
  transaction: string;
  normalized: string;
  counterparty?: string;
  confidence: string;
};

function lightClasses(light: string) {
  switch (light) {
    case "green":
      return {
        bg: "bg-emerald-500/15",
        text: "text-emerald-400",
        border: "border-emerald-500/30",
        dot: "bg-emerald-400",
      };
    case "yellow":
      return {
        bg: "bg-amber-500/15",
        text: "text-amber-400",
        border: "border-amber-500/30",
        dot: "bg-amber-400",
      };
    case "red":
      return {
        bg: "bg-rose-500/15",
        text: "text-rose-400",
        border: "border-rose-500/30",
        dot: "bg-rose-400",
      };
    default:
      return {
        bg: "bg-slate-500/15",
        text: "text-slate-400",
        border: "border-slate-500/30",
        dot: "bg-slate-400",
      };
  }
}

function riskBadgeClasses(risk: string) {
  switch (risk) {
    case "KRITICKÉ":
      return "border-rose-500/40 bg-rose-500/15 text-rose-400";
    case "VYSOKÉ":
      return "border-orange-500/40 bg-orange-500/15 text-orange-400";
    case "STREDNÉ":
      return "border-amber-500/40 bg-amber-500/15 text-amber-400";
    default:
      return "border-slate-500/40 bg-slate-500/15 text-slate-400";
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileBadge(name: string) {
  const ext = name.split(".").pop()?.toUpperCase() || "SÚBOR";
  let color = "border-slate-500/30 bg-slate-500/10 text-slate-400";
  if (["PDF"].includes(ext)) {
    color = "border-rose-500/30 bg-rose-500/10 text-rose-400";
  } else if (["DOCX", "DOC", "RTF"].includes(ext)) {
    color = "border-blue-500/30 bg-blue-500/10 text-blue-400";
  } else if (["XLSX", "XLS", "CSV"].includes(ext)) {
    color = "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  } else if (["JSON", "TXT", "MD", "HTML", "HTM"].includes(ext)) {
    color = "border-amber-500/30 bg-amber-500/10 text-amber-400";
  } else if (["PNG", "JPG", "JPEG", "WEBP", "TIFF"].includes(ext)) {
    color = "border-purple-500/30 bg-purple-500/10 text-purple-400";
  }
  return { ext, color };
}

const TATRAGEN_CASE_DOSSIER: ForensicDossier = {
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

export function Assistant() {
  const { activeCase, analysis, hasCase, revisions } = useActiveCase();
  const [mainMode, setMainMode] = useState<"autopilot" | "quick_tasks">("autopilot");

  // Forenzný Autopilot State
  const [isProcessing, setIsProcessing] = useState(false);
  const [stage, setStage] = useState<"idle" | "extracting" | "analyzing">("idle");
  const [dossier, setDossier] = useState<ForensicDossier | null>(null);
  const [autopilotTab, setAutopilotTab] = useState("otazky");
  const [isDragging, setIsDragging] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Server functions
  const runAutopilotFn = useServerFn(runForensicAutopilot);
  const extractTextFn = useServerFn(extractFileText);
  const extractBulkTextFn = useServerFn(extractBulkFilesText);
  const saveCaseDossierFn = useServerFn(saveCaseDossier);
  const getForensicDossierFn = useServerFn(getForensicDossier);

  const [isSavingDossier, setIsSavingDossier] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Automatické načítanie uloženého dossieru pri otvorení prípadu (ak ešte nie je načítaný v pamäti)
  useEffect(() => {
    let active = true;
    if (!activeCase.id) return;

    async function checkExistingDossier() {
      try {
        const res = await getForensicDossierFn({ data: { caseId: activeCase.id } });
        if (active && res && res.success && res.dossier) {
          setDossier(res.dossier);
          toast.info(
            `Načítaný uložený forenzný dossier pre prípad „${activeCase.name || activeCase.id}“.`,
          );
        }
      } catch (err) {
        // Tichý fallback: databáza zatiaľ nemá stĺpec alebo prípad nemá uložený dossier
        console.debug("checkExistingDossier fallback:", err);
      }
    }

    void checkExistingDossier();
    return () => {
      active = false;
    };
  }, [activeCase.id, activeCase.name, getForensicDossierFn]);

  const handleQueueFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setBulkFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const newItems = arr.filter((f) => !existingNames.has(f.name));
      return [...prev, ...newItems];
    });
    toast.info(
      `Pridané ${arr.length} ${arr.length === 1 ? "súbor" : arr.length < 5 ? "súbory" : "súborov"} do fronty.`,
    );
  }, []);

  const handleRemoveQueueFile = useCallback((index: number) => {
    setBulkFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleClearQueue = useCallback(() => {
    setBulkFiles([]);
  }, []);

  const handleRunBulk = useCallback(
    async (filesToProcess: File[]) => {
      if (filesToProcess.length === 0) return;
      setIsProcessing(true);
      setStage("extracting");

      try {
        const payloadFiles: { fileName: string; fileBase64?: string; textContent?: string }[] = [];

        for (const file of filesToProcess) {
          const lower = file.name.toLowerCase();
          if (
            lower.endsWith(".txt") ||
            lower.endsWith(".md") ||
            lower.endsWith(".csv") ||
            lower.endsWith(".json")
          ) {
            const textContent = await file.text();
            payloadFiles.push({ fileName: file.name, textContent });
          } else {
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
              reader.onload = () => {
                const res = reader.result as string;
                const base64 = res.split(",")[1] || res;
                resolve(base64);
              };
              reader.onerror = reject;
            });
            reader.readAsDataURL(file);
            const fileBase64 = await base64Promise;
            payloadFiles.push({ fileName: file.name, fileBase64 });
          }
        }

        const bulkExtractRes = await extractBulkTextFn({
          data: { files: payloadFiles },
        });

        if (!bulkExtractRes.success || !bulkExtractRes.aggregatedText) {
          throw new Error("Extrakcia textu zo súborov zlyhala.");
        }

        toast.info(
          `Extrahovaných ${bulkExtractRes.totalCharCount.toLocaleString("sk-SK")} znakov z ${bulkExtractRes.successfulFiles} spisov. Spúšťam forenznú analýzu...`,
        );

        setStage("analyzing");
        const analysisRes = await runAutopilotFn({
          data: {
            caseId: activeCase.id || "case-autopilot",
            documentText: bulkExtractRes.aggregatedText,
            fileName: `Hromadná dávka (${filesToProcess.length} spisov)`,
          },
        });

        if (analysisRes.success && analysisRes.dossier) {
          setDossier(analysisRes.dossier);
          toast.success("Forenzná analýza dávky bola úspešne dokončená!");
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Spracovanie dávky zlyhalo.");
      } finally {
        setIsProcessing(false);
        setStage("idle");
      }
    },
    [activeCase.id, extractBulkTextFn, runAutopilotFn],
  );

  // Quick tasks state
  const [task, setTask] = useState<AiTask>("case_summary");
  const [alertId, setAlertId] = useState<string>(analysis.alerts[0]?.id ?? "");
  const [result, setResult] = useState<AiRunResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});

  const status = useQuery({
    queryKey: ["ai-status"],
    queryFn: () => getAiStatus(),
    enabled: hasCase,
  });

  const output = result?.output as
    | {
        summary?: string;
        explanation?: string;
        unverified?: string[];
        cited?: string[];
        suggestions?: Suggestion[];
        idMap?: { transactions: Record<string, string> };
      }
    | undefined;

  const text = output?.summary ?? output?.explanation ?? "";
  const suggestions = useMemo(() => output?.suggestions ?? [], [output]);

  // Autopilot file handler
  const handleFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setStage("extracting");
      let documentText = "";

      try {
        const lower = file.name.toLowerCase();
        if (
          lower.endsWith(".txt") ||
          lower.endsWith(".md") ||
          lower.endsWith(".csv") ||
          lower.endsWith(".json")
        ) {
          documentText = await file.text();
        } else {
          // Pre binary súbory (.pdf, .docx) načítame base64 a pošleme na server
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const res = reader.result as string;
              const base64 = res.split(",")[1] || res;
              resolve(base64);
            };
            reader.onerror = reject;
          });
          reader.readAsDataURL(file);
          const fileBase64 = await base64Promise;

          const extractRes = await extractTextFn({
            data: { fileBase64, fileName: file.name },
          });
          if (!extractRes.success || !extractRes.text) {
            throw new Error("Extrakcia textu zo súboru zlyhala.");
          }
          documentText = extractRes.text;

          if (extractRes.usedOcr) {
            toast.info(
              `Dokument rozpoznaný cez Mistral OCR (${documentText.length.toLocaleString("sk-SK")} znakov). Spúšťam forenznú analýzu...`,
            );
          } else {
            toast.info(
              `Text úspešne pripravený (${documentText.length.toLocaleString("sk-SK")} znakov). Spúšťam analýzu...`,
            );
          }
        }

        if (!documentText || documentText.trim().length < 30) {
          throw new Error("Dokument je príliš krátky alebo prázdny.");
        }

        // KROK 2: Analýza
        setStage("analyzing");
        const analysisRes = await runAutopilotFn({
          data: {
            caseId: activeCase.id || "case-autopilot",
            documentText,
            fileName: file.name,
          },
        });

        if (analysisRes.success && analysisRes.dossier) {
          setDossier(analysisRes.dossier);
          toast.success("Forenzná analýza spisu bola úspešne dokončená!");
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Spracovanie spisu zlyhalo.");
      } finally {
        setIsProcessing(false);
        setStage("idle");
      }
    },
    [activeCase.id, extractTextFn, runAutopilotFn],
  );

  const handleExportPDF = useCallback(() => {
    if (!dossier) return;
    exportDossierToPDF(dossier);
    toast.success("Súdny posudok (A4) so SHA-256 pečaťou bol pripravený na tlač/stiahnutie.");
  }, [dossier]);

  const handleSaveDossier = useCallback(async () => {
    if (!dossier) {
      toast.error("Žiadny vygenerovaný dossier na uloženie.");
      return;
    }
    const caseId = activeCase.id;
    if (!caseId) {
      toast.error("Nie je vybratý aktívny prípad pre uloženie dossieru.");
      return;
    }

    setIsSavingDossier(true);
    try {
      const res = await saveCaseDossierFn({
        data: {
          caseId,
          dossier,
        },
      });
      if (res && res.success) {
        const timeStr = new Date().toLocaleTimeString("sk-SK", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        setLastSavedAt(timeStr);
        toast.success(`Forenzný dossier bol úspešne uložený do prípadu (${timeStr}).`);
      } else {
        toast.error("Uloženie dossieru do databázy zlyhalo.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("42703") ||
        msg.includes("forensic_dossier") ||
        msg.toLowerCase().includes("column")
      ) {
        console.warn("Supabase column forensic_dossier missing:", msg);
        toast.warning(
          "Databázová schéma ešte neobsahuje stĺpec forensic_dossier (migrácia čaká na vykonanie v Supabase). Spis je bezpečne uchovaný v lokálnom stave.",
          { duration: 6000 },
        );
      } else {
        toast.error(`Chyba pri ukladaní: ${msg}`);
      }
    } finally {
      setIsSavingDossier(false);
    }
  }, [activeCase.id, dossier, saveCaseDossierFn]);

  // Quick tasks run
  async function runQuickTask() {
    if (busy || !hasCase) return;
    setBusy(true);
    setResult(null);
    try {
      const value = await runAiTask({
        data: {
          caseId: activeCase.id,
          task,
          ...(task === "explain_finding" ? { alertId } : {}),
        },
      });
      setResult(value);
      if (value.status !== "ok" && value.status !== "not_configured") {
        toast.error(value.message ?? "Volanie AI zlyhalo.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Volanie AI zlyhalo.");
    } finally {
      setBusy(false);
    }
  }

  async function showPreview() {
    try {
      const value = await previewAiPayload({
        data: {
          caseId: activeCase.id,
          task,
          ...(task === "explain_finding" ? { alertId } : {}),
        },
      });
      setPreview(JSON.stringify(value.payload, null, 2));
    } catch {
      toast.error("Náhľad sa nepodarilo zostaviť.");
    }
  }

  async function acceptSuggestion(suggestion: Suggestion) {
    const realId = output?.idMap?.transactions?.[suggestion.transaction];
    const transaction = activeCase.transactions.find((t) => t.id === realId);
    if (!transaction) {
      toast.error("Transakcia sa už nenašla — obnovte prípad.");
      return;
    }
    try {
      await upsertTransaction({
        data: {
          id: transaction.id,
          expectedRevision: revisions[transaction.id],
          caseId: activeCase.id,
          date: transaction.date,
          amount: transaction.amount,
          currency: transaction.currency,
          method: transaction.method,
          fromId: transaction.fromId,
          toId: transaction.toId,
          payerId: transaction.payerId,
          originCountry: transaction.originCountry,
          destinationCountry: transaction.destinationCountry,
          description: suggestion.normalized,
        },
      });
      setAccepted((prev) => ({ ...prev, [suggestion.transaction]: true }));
      toast.success("Popis transakcie bol aktualizovaný.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Aktualizácia zlyhala.");
    }
  }

  const [copiedAttackId, setCopiedAttackId] = useState<string | null>(null);
  const [copiedJudgeText, setCopiedJudgeText] = useState(false);

  function handleCopyCounterStrike(attackId: string, text: string) {
    void navigator.clipboard.writeText(text);
    setCopiedAttackId(attackId);
    toast.success("Protiúder bol skopírovaný do schránky.");
    setTimeout(() => setCopiedAttackId(null), 2000);
  }

  function handleCopyJudgeText() {
    if (!dossier) return;
    const fullText = `ROZSUDKOVÝ FORMÁT (§ 168 TP) — ${dossier.caseTitle}
Spis: ${dossier.caseId}

I. ZISTENÝ SKUTKOVÝ STAV:
${dossier.judgeReadyText.skutkovyStav}

II. VYPORIADANIE SA S OBHAJOBOU OBVINENÉHO:
${dossier.judgeReadyText.vyporiadanie}

III. VEDECKÉ ZHODNOTENIE STÔP (LR & METODIKA):
${dossier.judgeReadyText.vedecke}`;

    void navigator.clipboard.writeText(fullText);
    setCopiedJudgeText(true);
    toast.success("Kompletné odôvodnenie (§ 168 TP) skopírované do schránky.");
    setTimeout(() => setCopiedJudgeText(false), 2000);
  }

  const idx = dossier?.defendabilityIndex ?? 0;
  const idxColor = idx >= 75 ? "text-emerald-400" : idx >= 50 ? "text-amber-400" : "text-rose-400";
  const idxBar =
    idx >= 75
      ? "[&>div]:bg-emerald-500"
      : idx >= 50
        ? "[&>div]:bg-amber-500"
        : "[&>div]:bg-rose-500";

  return (
    <PhoneFrame>
      <AppHeader title="Forenzný Autopilot">
        <p className="px-5 pb-1 text-xs text-foreground/80">1 Drop → 1 Obrazovka → 1 Export</p>
      </AppHeader>
      <Screen>
        {/* Prepínač hlavného režimu */}
        <div className="flex rounded-xl bg-card border border-border p-1">
          <button
            onClick={() => setMainMode("autopilot")}
            className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
              mainMode === "autopilot"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Forenzný Autopilot
          </button>
          <button
            onClick={() => setMainMode("quick_tasks")}
            className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
              mainMode === "quick_tasks"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Rýchle triážne úlohy
          </button>
        </div>

        {/* ═══ REŽIM 1: FORENZNÝ AUTOPILOT ═══ */}
        {mainMode === "autopilot" && (
          <div className="space-y-4">
            {/* Header info */}
            <Card className="p-4 bg-muted/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/15 p-2.5 text-primary">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Procesný audit spisu</h3>
                    <p className="text-xs text-muted-foreground">
                      Trestný poriadok č. 301/2005 Z. z.
                    </p>
                  </div>
                </div>
                {dossier && (
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">
                      Index obhájiteľnosti
                    </span>
                    <div className={`text-xl font-bold ${idxColor}`}>
                      {idx}
                      <span className="text-xs text-muted-foreground">/100</span>
                    </div>
                  </div>
                )}
              </div>
              {dossier && (
                <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                      idx >= 75
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : idx >= 50
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        idx >= 75
                          ? "bg-emerald-400"
                          : idx >= 50
                            ? "bg-amber-400"
                            : "bg-rose-400 animate-pulse"
                      }`}
                    />
                    {idx >= 75
                      ? "VYSOKÁ SÚDNA NEPRIESTRELNOSŤ"
                      : idx >= 50
                        ? "PODMIENEČNÁ OBHÁJITEĽNOSŤ"
                        : "VÁŽNE PROCESNÉ RIZIKO"}
                  </span>
                </div>
              )}
            </Card>

            {/* DropZone / Upload */}
            {/* DropZone / Bulk Sandbox */}
            {!dossier ? (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".txt,.pdf,.docx,.doc,.xlsx,.xls,.csv,.json,.png,.jpg,.jpeg,.webp,.tiff,.html,.htm,.rtf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleQueueFiles(e.target.files);
                    }
                  }}
                />

                {bulkFiles.length > 0 ? (
                  /* Staged Bulk Queue View */
                  <Card className="p-4 space-y-3 border-primary/40 bg-card">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-primary/15 p-2 text-primary">
                          <FileSpreadsheet className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-foreground">
                            Forenzný Sandbox — Pripravená dávka
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            {bulkFiles.length}{" "}
                            {bulkFiles.length === 1
                              ? "súbor"
                              : bulkFiles.length < 5
                                ? "súbory"
                                : "súborov"}{" "}
                            ({formatBytes(bulkFiles.reduce((acc, f) => acc + f.size, 0))})
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleClearQueue}
                        className="text-xs h-7 text-muted-foreground hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Vyčistiť
                      </Button>
                    </div>

                    {/* Zoznam súborov vo fronte */}
                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                      {bulkFiles.map((file, fIdx) => {
                        const badge = getFileBadge(file.name);
                        return (
                          <div
                            key={`${file.name}-${fIdx}`}
                            className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/20 p-2 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-mono shrink-0 py-0 ${badge.color}`}
                              >
                                {badge.ext}
                              </Badge>
                              <span
                                className="font-medium text-foreground truncate max-w-55"
                                title={file.name}
                              >
                                {file.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {formatBytes(file.size)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveQueueFile(fIdx)}
                                className="text-muted-foreground hover:text-rose-400 transition-colors p-1 cursor-pointer"
                                title="Odstrániť zo zoznamu"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Akčné tlačidlá fronty */}
                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-border/50">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="w-full sm:w-auto text-xs h-9 cursor-pointer gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Pridať ďalšie
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => void handleRunBulk(bulkFiles)}
                        disabled={isProcessing}
                        className="w-full sm:flex-1 text-xs h-9 cursor-pointer gap-1.5 font-bold shadow-sm"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {stage === "extracting" && "Extrahujem text..."}
                            {stage === "analyzing" && "Analyzujem spis..."}
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4" />
                            Spustiť forenznú analýzu dávky ({bulkFiles.length})
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                ) : (
                  /* Standard Drag and Drop Area */
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleQueueFiles(e.dataTransfer.files);
                      }
                    }}
                    onClick={() => !isProcessing && fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                      isDragging
                        ? "border-primary bg-primary/10 scale-[1.01]"
                        : "border-border/80 bg-card hover:border-primary/50 hover:bg-accent/30"
                    } ${isProcessing ? "opacity-60 pointer-events-none" : ""}`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <div>
                          <p className="text-sm font-medium">
                            {stage === "extracting" && "Extrahujem text zo spisu (PDF / OCR)..."}
                            {stage === "analyzing" && "Forenzný Autopilot analyzuje spis..."}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Spracovávam reťazec stôp a právne náležitosti
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="rounded-xl bg-primary/10 p-3 text-primary">
                          <UploadCloud className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            Pretiahnite spisy, tabuľky transakcií alebo posudky
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Forenzný sandbox s podporou hromadného nahrávania a OCR
                          </p>
                        </div>

                        {/* Format badges */}
                        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5 text-[10px] text-muted-foreground max-w-sm">
                          <span className="rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-300 px-2 py-0.5 font-mono">
                            PDF (aj skeny / OCR)
                          </span>
                          <span className="rounded-md border border-blue-500/30 bg-blue-500/10 text-blue-300 px-2 py-0.5 font-mono">
                            DOCX / DOC / RTF
                          </span>
                          <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-2 py-0.5 font-mono">
                            XLSX / XLS / CSV
                          </span>
                          <span className="rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-300 px-2 py-0.5 font-mono">
                            TXT / MD / HTML / JSON
                          </span>
                          <span className="rounded-md border border-purple-500/30 bg-purple-500/10 text-purple-300 px-2 py-0.5 font-mono">
                            PNG / JPG / WEBP
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                            className="h-9 cursor-pointer"
                          >
                            Vybrať súbory z počítača
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDossier(TATRAGEN_CASE_DOSSIER);
                              toast.success("Načítaný autentický spis: Kauza Tatragen & Babčan");
                            }}
                            className="h-9 gap-1.5 border border-primary/40 bg-primary/15 font-semibold text-primary shadow-xs transition-all hover:border-primary/60 hover:bg-primary/25 cursor-pointer"
                          >
                            <Zap className="h-4 w-4 text-primary" />
                            <span>⚡ Načítať demo: Kauza Tatragen (UBOK)</span>
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Zobrazenie Dossieru (5 Kariet + Export) */
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-card/60 p-2.5 rounded-xl border border-border/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      variant="outline"
                      className="border-primary/40 text-primary font-mono text-xs shrink-0"
                    >
                      {dossier.caseId}
                    </Badge>
                    <span className="text-xs font-semibold text-foreground truncate">
                      {dossier.caseTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveDossier}
                      disabled={isSavingDossier}
                      className="h-8 text-xs gap-1.5 cursor-pointer border-primary/30 hover:bg-primary/10"
                      title="Uložiť dossier do databázy prípadu"
                    >
                      {isSavingDossier ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : (
                        <Save className="h-3.5 w-3.5 text-primary" />
                      )}
                      <span>{lastSavedAt ? `Uložené (${lastSavedAt})` : "Uložiť do prípadu"}</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleExportPDF}
                      className="h-8 text-xs gap-1.5 cursor-pointer font-medium"
                      title="Stiahnuť / vytlačiť súdny posudok podľa Trestného poriadku"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Súdny posudok (PDF)</span>
                    </Button>
                  </div>
                </div>

                <Progress value={idx} className={`h-2 ${idxBar}`} />

                <Tabs value={autopilotTab} onValueChange={setAutopilotTab} className="space-y-3">
                  <TabsList className="grid w-full grid-cols-5 h-auto p-1 gap-1">
                    <TabsTrigger value="otazky" className="text-[11px] py-1.5 gap-1">
                      <HelpCircle className="h-3 w-3 text-primary" />
                      <span className="truncate">3 Otázky</span>
                    </TabsTrigger>
                    <TabsTrigger value="rozpory" className="text-[11px] py-1.5 gap-1">
                      <AlertTriangle className="h-3 w-3 text-rose-400" />
                      <span className="truncate">Rozpory</span>
                    </TabsTrigger>
                    <TabsTrigger value="transakcie" className="text-[11px] py-1.5 gap-1">
                      <Landmark className="h-3 w-3 text-emerald-400" />
                      <span className="truncate">Transakcie</span>
                    </TabsTrigger>
                    <TabsTrigger value="facts" className="text-[11px] py-1.5 gap-1">
                      <CheckCheck className="h-3 w-3 text-cyan-400" />
                      <span className="truncate">Fakty</span>
                    </TabsTrigger>
                    <TabsTrigger value="defense" className="text-[11px] py-1.5 gap-1">
                      <Gavel className="h-3 w-3 text-amber-400" />
                      <span className="truncate">Obhajoba</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* KARTA 1: 3 OTÁZKY (SOURCE OF TRUTH ÚBOK) */}
                  <TabsContent value="otazky" className="space-y-3 m-0">
                    <Card className="space-y-3 p-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <HelpCircle className="h-3.5 w-3.5 text-primary" /> Source of Truth ÚBOK —
                          3 Hlavné vyšetrovacie otázky
                        </div>
                        <Badge
                          variant="outline"
                          className="border-primary/40 text-primary text-[10px]"
                        >
                          PPZ-51/UBOK
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        {[
                          dossier.investigativeAnswers?.q1_buyer_seller,
                          dossier.investigativeAnswers?.q2_planner_coordinator,
                          dossier.investigativeAnswers?.q3_financier,
                        ]
                          .filter(Boolean)
                          .map((q) => {
                            if (!q) return null;
                            return (
                              <div
                                key={q.questionNumber}
                                className="rounded-xl border border-border bg-card p-3.5 space-y-2.5 text-xs shadow-xs"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-border/50 pb-2">
                                  <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
                                      {q.questionNumber}
                                    </span>
                                    {q.question}
                                  </h4>
                                  <Badge
                                    variant="outline"
                                    className={
                                      q.confidenceLevel >= 90
                                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[10px]"
                                        : "border-amber-500/40 bg-amber-500/10 text-amber-400 text-[10px]"
                                    }
                                  >
                                    Preukázanosť: {q.confidenceLevel} %
                                  </Badge>
                                </div>

                                {/* Odpoveď */}
                                <div className="rounded-lg bg-muted/40 border border-border/60 p-2.5">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                                    Zistený skutkový záver:
                                  </p>
                                  <p className="text-foreground/95 leading-relaxed">{q.answer}</p>
                                </div>

                                {/* Stotožnené osoby */}
                                {q.identifiedPersons.length > 0 && (
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                      Stotožnené osoby a role:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {q.identifiedPersons.map((p, pIdx) => (
                                        <Badge
                                          key={pIdx}
                                          variant="secondary"
                                          className="text-[10px] font-medium bg-muted/60 border border-border/80"
                                        >
                                          <Users className="h-3 w-3 mr-1 text-primary/80" />
                                          {p}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Priame dôkazy */}
                                {q.directEvidence.length > 0 && (
                                  <div className="space-y-1 rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                                      <CheckCheck className="h-3 w-3" /> Priame usvedčujúce dôkazy v
                                      spise:
                                    </span>
                                    <ul className="space-y-1 mt-1">
                                      {q.directEvidence.map((ev, eIdx) => (
                                        <li
                                          key={eIdx}
                                          className="text-[11px] text-foreground/90 flex items-start gap-1.5"
                                        >
                                          <span className="text-emerald-400 shrink-0 font-bold">
                                            •
                                          </span>
                                          <span>{ev}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Chýbajúce dôkazy / neoverené hypotézy */}
                                {(q.missingEvidence.length > 0 ||
                                  q.unverifiedHypotheses.length > 0) && (
                                  <div className="space-y-1 rounded-lg bg-amber-500/5 border border-amber-500/20 p-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" /> Úkony na doplnenie
                                      dokazovania (§ 119 TP):
                                    </span>
                                    <ul className="space-y-1 mt-1">
                                      {q.missingEvidence.map((me, mIdx) => (
                                        <li
                                          key={mIdx}
                                          className="text-[11px] text-foreground/80 flex items-start gap-1.5"
                                        >
                                          <span className="text-amber-400 shrink-0 font-bold">
                                            ⚠️
                                          </span>
                                          <span>{me}</span>
                                        </li>
                                      ))}
                                      {q.unverifiedHypotheses.map((uh, uIdx) => (
                                        <li
                                          key={`uh-${uIdx}`}
                                          className="text-[11px] text-muted-foreground flex items-start gap-1.5"
                                        >
                                          <span className="text-muted-foreground shrink-0 font-bold">
                                            ?
                                          </span>
                                          <span>Hypotéza: {uh}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </Card>
                  </TabsContent>

                  {/* KARTA 2: ROZPORY VO VÝPOVEDIACH & MATICA NEPRAVDIVOSTI */}
                  <TabsContent value="rozpory" className="space-y-3 m-0">
                    <Card className="space-y-3 p-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-400" /> Rozpory vo
                          výpovediach & Matica nepravdivosti
                        </div>
                        {dossier.testimonyContradictions && (
                          <Badge
                            variant="outline"
                            className="border-rose-500/30 text-rose-400 bg-rose-500/10 text-[10px]"
                          >
                            {dossier.testimonyContradictions.length} detegované rozpory
                          </Badge>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        Porovnanie tvrdení obvinených a svedkov so zisteným stavom spisu a návrhy
                        procesného postupu (§ 125 TP konfrontácia, § 142 TP znalecké dokazovanie).
                      </p>

                      <div className="space-y-3">
                        {dossier.testimonyContradictions?.map((c) => {
                          const deceitColor =
                            c.deceitPercentage >= 85
                              ? "text-rose-400 border-rose-500/30 bg-rose-500/10"
                              : c.deceitPercentage >= 70
                                ? "text-orange-400 border-orange-500/30 bg-orange-500/10"
                                : "text-amber-400 border-amber-500/30 bg-amber-500/10";

                          const barColor =
                            c.deceitPercentage >= 85
                              ? "[&>div]:bg-rose-500"
                              : c.deceitPercentage >= 70
                                ? "[&>div]:bg-orange-500"
                                : "[&>div]:bg-amber-500";

                          return (
                            <div
                              key={c.id}
                              className="rounded-xl border border-border bg-card p-3 space-y-2.5 text-xs shadow-xs"
                            >
                              {/* Header: Topic & Severity */}
                              <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono text-[10px] font-bold text-muted-foreground shrink-0">
                                    {c.id}
                                  </span>
                                  <h5 className="font-semibold text-foreground truncate">
                                    {c.topic}
                                  </h5>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={
                                    c.contradictionSeverity === "critical"
                                      ? "border-rose-500/40 text-rose-400 text-[9px] py-0"
                                      : c.contradictionSeverity === "high"
                                        ? "border-orange-500/40 text-orange-400 text-[9px] py-0"
                                        : "border-amber-500/40 text-amber-400 text-[9px] py-0"
                                  }
                                >
                                  {c.contradictionSeverity === "critical"
                                    ? "KRITICKÝ ROZPOR"
                                    : c.contradictionSeverity === "high"
                                      ? "VYSOKÝ ROZPOR"
                                      : "STREDNÝ ROZPOR"}
                                </Badge>
                              </div>

                              {/* Deceit meter */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-muted-foreground font-medium">
                                    Odhadovaná miera nepravdivosti tvrdenia:
                                  </span>
                                  <span
                                    className={`font-bold font-mono px-2 py-0.5 rounded border text-[11px] ${deceitColor}`}
                                  >
                                    {c.deceitPercentage} % (Vyvrátené)
                                  </span>
                                </div>
                                <Progress
                                  value={c.deceitPercentage}
                                  className={`h-1.5 ${barColor}`}
                                />
                              </div>

                              {/* 2 Stĺpce: Tvrdenie vs. Konfrontácia */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 space-y-1">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                                    ⚠️ {c.personA.name} ({c.personA.status}):
                                  </p>
                                  <p className="italic text-foreground/90 text-[11px]">
                                    "{c.personA.claim}"
                                  </p>
                                </div>

                                <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-2.5 space-y-1">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                                    🔍 Konfrontácia ({c.personB?.name ?? "Materiálny dôkaz"}):
                                  </p>
                                  <p className="text-foreground/90 text-[11px]">
                                    {c.personB ? `"${c.personB.claim}"` : c.factualRecord}
                                  </p>
                                </div>
                              </div>

                              {/* Skutočnosť podľa spisu */}
                              <div className="rounded-lg bg-muted/40 border border-border/70 p-2 space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Zistený skutkový stav podľa spisu:
                                </p>
                                <p className="text-foreground/90 text-[11px]">{c.factualRecord}</p>
                              </div>

                              {/* Procesné riešenie */}
                              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/25 p-2 space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                                  <Scale className="h-3 w-3" /> Procesný postup (§ 125 TP / § 142
                                  TP):
                                </p>
                                <p className="text-foreground/90 text-[11px]">
                                  {c.proceduralResolution}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </TabsContent>

                  {/* KARTA 3: ANALÝZA TRANSAKCIÍ & FINANCOVANIA */}
                  <TabsContent value="transakcie" className="space-y-3 m-0">
                    <Card className="space-y-3 p-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <Landmark className="h-3.5 w-3.5 text-emerald-400" /> Analýza transakcií &
                          Toky financií
                        </div>
                        <Badge
                          variant="outline"
                          className="border-emerald-500/40 text-emerald-400 text-[10px]"
                        >
                          § 233a TZ (Legalizácia)
                        </Badge>
                      </div>

                      {dossier.financialAnalysis && (
                        <>
                          {/* KPI Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div className="rounded-xl border border-border bg-card p-2.5 text-center">
                              <span className="text-[10px] uppercase font-mono text-muted-foreground">
                                Celkový objem
                              </span>
                              <p className="text-base font-bold text-foreground font-mono mt-0.5">
                                {dossier.financialAnalysis.totalVolume.toLocaleString("sk-SK")} €
                              </p>
                            </div>

                            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-center">
                              <span className="text-[10px] uppercase font-mono text-rose-400 font-semibold">
                                Hotovosť
                              </span>
                              <p className="text-base font-bold text-rose-400 font-mono mt-0.5">
                                {dossier.financialAnalysis.cashVolume.toLocaleString("sk-SK")} €
                              </p>
                            </div>

                            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-2.5 text-center">
                              <span className="text-[10px] uppercase font-mono text-blue-400 font-semibold">
                                Bankové prevody
                              </span>
                              <p className="text-base font-bold text-blue-400 font-mono mt-0.5">
                                {dossier.financialAnalysis.transferVolume.toLocaleString("sk-SK")} €
                              </p>
                            </div>

                            <div className="rounded-xl border border-border bg-card p-2.5 text-center">
                              <span className="text-[10px] uppercase font-mono text-muted-foreground">
                                Podiel hotovosti
                              </span>
                              <p className="text-base font-bold text-amber-400 font-mono mt-0.5">
                                {dossier.financialAnalysis.cashRatioPercent} %
                              </p>
                            </div>
                          </div>

                          {/* Hotovostný pomer progress bar */}
                          <div className="rounded-lg border border-border/70 bg-muted/20 p-2.5 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-rose-400">
                                Hotovosť: {dossier.financialAnalysis.cashRatioPercent} % (Smurfing &
                                anonymné vklady)
                              </span>
                              <span className="font-semibold text-blue-400">
                                Prevody:{" "}
                                {(100 - dossier.financialAnalysis.cashRatioPercent).toFixed(1)} %
                              </span>
                            </div>
                            <Progress
                              value={dossier.financialAnalysis.cashRatioPercent}
                              className="h-2 [&>div]:bg-rose-500"
                            />
                          </div>

                          {/* Podozrivé toky zoznam */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Podozrivé finančné toky (Red Flags)
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {dossier.financialAnalysis.suspiciousFlows.length} záchytov
                              </span>
                            </div>

                            <div className="space-y-2">
                              {dossier.financialAnalysis.suspiciousFlows.map((flow) => (
                                <div
                                  key={flow.id}
                                  className="rounded-xl border border-border bg-card p-3 space-y-2 text-xs shadow-xs"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-[10px] text-muted-foreground">
                                        {flow.id}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className={
                                          flow.method === "cash_deposit"
                                            ? "border-rose-500/40 text-rose-400 bg-rose-500/10 text-[9px] py-0"
                                            : "border-blue-500/40 text-blue-400 bg-blue-500/10 text-[9px] py-0"
                                        }
                                      >
                                        {flow.method === "cash_deposit" ? "HOTOVOSŤ" : "PREVOD"}
                                      </Badge>
                                      <span className="font-mono text-[10px] text-muted-foreground">
                                        {flow.date}
                                      </span>
                                    </div>
                                    <span className="font-mono font-bold text-sm text-foreground">
                                      {flow.amount.toLocaleString("sk-SK")} €
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 text-[11px] text-foreground/90">
                                    <span className="font-medium text-muted-foreground truncate max-w-35">
                                      {flow.payer}
                                    </span>
                                    <ArrowRightLeft className="h-3 w-3 text-primary shrink-0" />
                                    <span className="font-medium text-foreground truncate max-w-35">
                                      {flow.recipient}
                                    </span>
                                  </div>

                                  <p className="text-[11px] text-muted-foreground">
                                    {flow.purpose}
                                  </p>

                                  {/* Red flag */}
                                  <div className="rounded-lg bg-rose-500/10 border border-rose-500/25 p-2 flex items-start gap-1.5">
                                    <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                                    <span className="text-[11px] text-rose-300 leading-tight">
                                      {flow.redFlag}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Záver financovania */}
                          <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                              <Scale className="h-3.5 w-3.5" /> Záver forenzného vyšetrovania tokov
                              financií
                            </div>
                            <p className="text-xs text-foreground/90 leading-relaxed">
                              {dossier.financialAnalysis.financingConclusion}
                            </p>
                          </div>
                        </>
                      )}
                    </Card>
                  </TabsContent>

                  {/* KARTA 4: FAKTY */}
                  <TabsContent value="facts" className="space-y-3 m-0">
                    <Card className="space-y-3 p-3.5">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> Časová os a reťazec zaistenia
                      </div>
                      <div className="space-y-2">
                        {dossier.facts.timeline.map((item, i) => (
                          <div
                            key={i}
                            className={`rounded-lg border p-2.5 text-xs ${
                              item.chainBreak
                                ? "border-rose-500/40 bg-rose-500/10"
                                : "border-border/60 bg-muted/20"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {item.time}
                              </span>
                              {item.chainBreak && (
                                <Badge
                                  variant="outline"
                                  className="border-rose-500/40 text-rose-400 text-[9px] py-0"
                                >
                                  ZLOM REŤAZCA {item.paragraph ? `· ${item.paragraph}` : ""}
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 font-medium text-foreground/90">{item.event}</p>
                            <p className="text-[11px] text-muted-foreground">
                              Zdroj: {item.source}
                            </p>
                          </div>
                        ))}
                      </div>

                      <Separator className="my-2" />

                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Scan className="h-3.5 w-3.5" /> Stopy a semafor integrity
                      </div>
                      <div className="grid gap-2">
                        {dossier.facts.traces.map((t) => {
                          const c = lightClasses(t.light);
                          return (
                            <div
                              key={t.id}
                              className={`rounded-lg border p-2.5 text-xs ${c.border} ${c.bg}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-muted-foreground">
                                  {t.id}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${c.text} ${c.border}`}
                                >
                                  {t.type}
                                </Badge>
                              </div>
                              <p className="mt-1 text-foreground/90">{t.description}</p>
                              {!t.chainComplete && (
                                <p className="mt-1 text-[11px] text-rose-400 font-medium">
                                  ⚠️ Reťazec nie je úplný
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </TabsContent>

                  {/* KARTA 5: OBHAJOBA & SÚDNA SILA */}
                  <TabsContent value="defense" className="space-y-3 m-0">
                    <Card className="space-y-3 p-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          <Gavel className="h-3.5 w-3.5 text-rose-400" /> Simulátor útoku advokáta
                        </div>
                        <Badge
                          variant="outline"
                          className={riskBadgeClasses(dossier.defenseAttack.overallRisk)}
                        >
                          Riziko: {dossier.defenseAttack.overallRisk}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        {dossier.defenseAttack.attacks.map((atk) => (
                          <div
                            key={atk.id}
                            className="rounded-xl border border-border bg-card p-3 space-y-2 text-xs"
                          >
                            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5">
                              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                                ⚖️ Obhajoba na súde povie:
                              </p>
                              <p className="mt-0.5 italic text-foreground/90">{atk.defenseClaim}</p>
                            </div>

                            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 space-y-1">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                                  🛡️ Váš protiúder (ako to vyvrátiť):
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCounterStrike(atk.id, atk.counterStrike)}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                                  title="Kopírovať protiúder"
                                >
                                  {copiedAttackId === atk.id ? (
                                    <>
                                      <Check className="h-3 w-3" />
                                      <span>Skopírované</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3" />
                                      <span>Kopírovať</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <p className="text-foreground/90">{atk.counterStrike}</p>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                              <span>Medzera v spise: {atk.evidenceGap}</span>
                              <Badge variant="outline" className={riskBadgeClasses(atk.risk)}>
                                {atk.risk}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Separator className="my-2" />

                      {/* Súdna sila a Likelihood Ratio */}
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Gauge className="h-3.5 w-3.5 text-cyan-400" /> Likelihood Ratio & Sila
                        dôkazov
                      </div>
                      <div className="space-y-2">
                        {dossier.evidenceStrength.traces.map((t) => {
                          const c = lightClasses(t.light);
                          return (
                            <div
                              key={t.id}
                              className={`flex items-center justify-between rounded-lg border p-2.5 text-xs ${c.border} ${c.bg}`}
                            >
                              <div>
                                <p className="font-semibold text-foreground/90">{t.name}</p>
                                <p className="text-[11px] text-muted-foreground">{t.paragraph}</p>
                              </div>
                              <div className="text-right">
                                {t.lr !== "—" && (
                                  <p className="font-mono text-xs font-bold">{t.lr}</p>
                                )}
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${c.text} ${c.border}`}
                                >
                                  {t.strength}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <Separator className="my-2" />

                      {/* Procesné paragrafy */}
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <FileText className="h-3.5 w-3.5 text-primary" /> Procesné paragrafy
                        (Trestný poriadok)
                      </div>
                      <div className="space-y-1.5">
                        {dossier.evidenceStrength.paragraphs.map((p) => (
                          <div
                            key={p.para}
                            className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 p-2 text-xs"
                          >
                            <div>
                              <span className="font-mono font-bold text-foreground/90">
                                {p.para}
                              </span>
                              <span className="ml-2 text-muted-foreground">{p.title}</span>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                p.status === "OK"
                                  ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                                  : p.status === "Narušené"
                                    ? "border-rose-500/30 text-rose-400 bg-rose-500/10"
                                    : "border-amber-500/30 text-amber-400 bg-amber-500/10"
                              }
                            >
                              {p.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </TabsContent>
                </Tabs>

                {/* Export Card */}
                <Card className="p-3.5 bg-primary/5 border-primary/20 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                        Rozsudkový formát § 168 TP
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Odôvodnenie rozsudku, forenzný posudok a perzistencia spisu
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyJudgeText}
                        className="gap-1.5 text-xs h-8 cursor-pointer"
                      >
                        {copiedJudgeText ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            Skopírované
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Kopírovať text
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveDossier}
                        disabled={isSavingDossier}
                        className="gap-1.5 text-xs h-8 cursor-pointer border-primary/40 hover:bg-primary/10"
                        title="Uložiť vygenerovanú analýzu priamo do prípadu"
                      >
                        {isSavingDossier ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                            Ukladám...
                          </>
                        ) : (
                          <>
                            <Save className="h-3.5 w-3.5 text-primary" />
                            {lastSavedAt ? `Uložené (${lastSavedAt})` : "Uložiť do prípadu"}
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleExportPDF}
                        className="gap-1.5 h-8 cursor-pointer font-semibold shadow-xs"
                        title="Vygenerovať A4 súdny formát so SHA-256 kontrolnou doložkou"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Stiahnuť súdny posudok (PDF)
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Reset button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDossier(null)}
                  className="w-full gap-1.5 text-muted-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Nahrať a analyzovať iný spis
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ═══ REŽIM 2: RÝCHLE TRIÁŽNE ÚLOHY (Pôvodná logika) ═══ */}
        {mainMode === "quick_tasks" && (
          <>
            <SectionTitle>Výber úlohy</SectionTitle>
            <div className="space-y-2">
              {(Object.keys(TASK_LABELS) as AiTask[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTask(t)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    task === t
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-muted/50"
                  }`}
                >
                  <p className="text-sm font-medium">{TASK_LABELS[t]}</p>
                </button>
              ))}
            </div>

            {task === "explain_finding" ? (
              <>
                <SectionTitle>Vyberte nález na vysvetlenie</SectionTitle>
                <div className="space-y-1.5">
                  {analysis.alerts.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAlertId(a.id)}
                      className={`w-full rounded-md border p-2 text-left text-xs ${
                        alertId === a.id ? "border-primary bg-primary/15" : "border-border bg-card"
                      }`}
                    >
                      <span className="font-semibold">{a.title}</span>
                      <span className="ml-2 text-caption">({a.source})</span>
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => void runQuickTask()}
                disabled={busy || !hasCase}
                className="flex-1"
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Bot className="mr-2 h-4 w-4" />
                )}
                Spustiť úlohu
              </Button>
              <Button variant="outline" onClick={() => void showPreview()} disabled={!hasCase}>
                <Eye className="h-4 w-4" />
              </Button>
            </div>

            {result?.status === "ok" && text ? (
              <>
                <SectionTitle>Výsledok</SectionTitle>
                <Card className="space-y-2 p-3 text-xs">
                  <p className="whitespace-pre-wrap">{text}</p>
                </Card>
              </>
            ) : null}
          </>
        )}
      </Screen>
      <BottomNav />
    </PhoneFrame>
  );
}

export default Assistant;
