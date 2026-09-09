// ─── FORENZNÝ DOSSIER — štruktúra výstupu z Autopilota ───────────

export type TrafficLight = "green" | "yellow" | "red";

export interface TimelineEvent {
  time: string; // ISO alebo "YYYY-MM-DD HH:mm"
  event: string;
  source: string; // odkaz do spisu (zápisnica č., strana)
  chainBreak: boolean;
  severity?: "critical" | "warning" | "info";
  paragraph?: string; // napr. "§ 100 TP"
}

export interface TraceItem {
  id: string; // ev. č. / ČRZ
  type: string; // DNA | balistická | dokument | prehliadka | ...
  description: string;
  light: TrafficLight; // 🟢🟡🔴
  chainComplete: boolean; // reťazec zabezpečenia kompletný?
  lr?: string; // "1 : 12 000" | "> 1 000 000" | null
  paragraph?: string;
}

export interface DefenseAttack {
  id: string;
  defenseClaim: string; // čo povie advokát
  risk: "KRITICKÉ" | "VYSOKÉ" | "STREDNÉ" | "NÍZKE";
  counterStrike: string; // ako to vyvrátiť
  evidenceGap: string; // čo v spise chýba
  paragraph?: string;
}

export interface EvidenceRow {
  id: string;
  name: string;
  lr: string; // "—" ak n/a
  strength: "Nepriestrelné" | "Silná" | "Zraniteľné" | "Procesná mína";
  light: TrafficLight;
  paragraph: string;
}

export interface ParagraphStatus {
  para: string;
  title: string;
  status: "OK" | "Narušené" | "Príprava";
  note: string;
}

export interface JudgeReadyText {
  skutkovyStav: string; // I. Zistený skutkový stav
  vyporiadanie: string; // II. Vyporiadanie sa s obhajobou
  vedecke: string; // III. Vedecké zhodnotenie stôp
}

// ─── 3 HLAVNÉ VYŠETROVACIE OTÁZKY (SOURCE OF TRUTH ÚBOK) ─────────
export interface InvestigativeQuestionAnswer {
  questionNumber: 1 | 2 | 3;
  question: string;
  answer: string;
  identifiedPersons: string[];
  directEvidence: string[];
  unverifiedHypotheses: string[];
  missingEvidence: string[];
  confidenceLevel: number; // 0–100%
}

// ─── ROZPORY VO VÝPOVEDIACH & MATICA KLAMSTVA / NEPRAVDY ──────────
export interface TestimonyContradiction {
  id: string;
  topic: string;
  personA: { name: string; status: string; claim: string };
  personB?: { name: string; status: string; claim: string };
  factualRecord: string; // reálny stav podložený spisom
  deceitPercentage: number; // odhad miery nepravdivosti (0–100%)
  contradictionSeverity: "critical" | "high" | "medium";
  proceduralResolution: string; // napr. konfrontácia § 125 TP
}

// ─── FORENZNÁ ANALÝZA TRANSAKCIÍ A TOKOV FINANCIÍ ────────────────
export interface SuspiciousFlowItem {
  id: string;
  date: string;
  payer: string;
  recipient: string;
  amount: number;
  method: "cash_deposit" | "wire_transfer" | "handover";
  purpose: string;
  redFlag: string;
}

export interface FinancialTransactionSummary {
  totalVolume: number;
  cashVolume: number;
  transferVolume: number;
  cashRatioPercent: number;
  suspiciousFlows: SuspiciousFlowItem[];
  financingConclusion: string;
}

export interface ForensicDossier {
  caseId: string;
  caseTitle: string;
  defendabilityIndex: number; // 0–100
  generatedAt: string; // ISO

  facts: {
    timeline: TimelineEvent[];
    traces: TraceItem[];
  };

  defenseAttack: {
    overallRisk: "KRITICKÉ" | "VYSOKÉ" | "STREDNÉ" | "NÍZKE";
    attacks: DefenseAttack[];
  };

  evidenceStrength: {
    traces: EvidenceRow[];
    paragraphs: ParagraphStatus[];
  };

  judgeReadyText: JudgeReadyText;

  // Rozšírené moduly ÚBOK
  investigativeAnswers?: {
    q1_buyer_seller: InvestigativeQuestionAnswer;
    q2_planner_coordinator: InvestigativeQuestionAnswer;
    q3_financier: InvestigativeQuestionAnswer;
  };
  testimonyContradictions?: TestimonyContradiction[];
  financialAnalysis?: FinancialTransactionSummary;
}

// ─── VSTUP DO AUTOSPILOTA & BULK MEDIA SANDBOX ────────────────────

export interface AutopilotInput {
  caseId: string;
  documentText?: string; // extrahovaný text zo spisu (PDF/TXT/DOCX/XLSX/OCR)
  fileName?: string;
  bulkFiles?: {
    name: string;
    size: number;
    charCount: number;
    usedOcr?: boolean;
  }[];
}

export interface BulkFileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  status: "pending" | "extracting" | "done" | "error";
  text?: string;
  charCount?: number;
  usedOcr?: boolean;
  error?: string;
}
