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

  // Integračné moduly (ICO Atlas & Dimitri Checker)
  registryAnalysis?: {
    profiles: import("@/forensic").CompanyRegistryProfile[];
    findings: import("@/forensic").Flag[];
  };
  crossBorderAnalysis?: {
    reports: import("@/forensic").DimitriCheckerReport[];
    routes: Array<{
      fromCountry: string;
      toCountry: string;
      transactionIds?: string[];
      amount?: number;
      currency?: string;
    }>;
    signals: Array<{
      code: string;
      label: string;
      detail: string;
      severity: import("@/forensic").Severity;
      confidence: number;
    }>;
    nomineeIndicators: Array<{
      entityId?: string;
      name: string;
      indicators: string[];
      confidence: number;
    }>;
  };
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

export interface ExtractedCaseEntity {
  name: string;
  role?: string | undefined;
  birthDate?: string | undefined;
  note?: string | undefined;
}

export interface ParsedCaseDocument {
  success: boolean;
  fileName: string;
  charCount: number;
  usedOcr: boolean;
  rawText: string;
  metadata: {
    caseId?: string | undefined;
    documentType?: string | undefined;
    date?: string | undefined;
    location?: string | undefined;
  };
  entities: {
    persons: ExtractedCaseEntity[];
    weapons: string[];
    vehicles: string[];
    companies: string[];
    legalParagraphs: string[];
  };
}

// ─── KRYPTOGRAFICKÝ LEDGER (CHAIN OF CUSTODY & TAMPER-EVIDENT LOG) ─
export interface CustodyLedgerEntry {
  index: number;
  id: string; // ID záznamu
  traceId: string; // ČRZ alebo ID stopy
  timestamp: string; // ISO 8601
  actor: string; // Meno / ID vyšetrovateľa / znalca
  action: "SEIZURE" | "TRANSFER" | "ANALYSIS" | "STORAGE" | "COURT_SUBMISSION";
  location: string;
  notes?: string;
  payloadHash: string; // SHA-256 dát stopy
  prevHash: string; // SHA-256 predchádzajúceho bloku
  hash: string; // SHA-256 celého bloku
}

export interface CustodyLedgerVerificationResult {
  valid: boolean;
  totalEntries: number;
  brokenIndex?: number;
  reason?: string;
  genesisHash?: string;
  latestHash?: string;
}

// ─── DEVIL'S ADVOCATE & ALTERNATÍVNE HYPOTÉZY (OS O6) ──────────────
export interface AlternativeHypothesis {
  id: string;
  title: string;
  scenario: string; // Celý alternatívny nevinný príbeh
  explainedEvidence: string[]; // Ktoré podozrivé stopy/transakcie legitímne vysvetľuje
  requiredTracesIfTrue: string[]; // Aké stopy by v spise museli existovať, ak je pravdivá
  caseFileCheckStatus: "found" | "missing" | "unverified";
  caseFileCheckNote: string;
  rebuttalTest: string; // Konkrétny procesný úkon na vyvrátenie verzie
}

// ─── PROCESNÁ PRÍPUSTNOSŤ (§ 119 TP, OS O8) ────────────────────────
export interface AdmissibilityAuditDefect {
  severity: "critical" | "curable" | "formal"; // kritická = absolútna neprípustnosť; odstrániteľná; formálna
  paragraph: string; // napr. "§ 119 ods. 3 TP", "§ 142 TP"
  description: string;
  remedyAction: string; // Ako vadu odstrániť na pojednávaní
}

export interface AdmissibilityAuditResult {
  overallStatus: "admissible" | "at_risk" | "inadmissible";
  score: number; // 0-100
  defects: AdmissibilityAuditDefect[];
  courtReadySummary: string;
}
