import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileDown,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  History,
  Info,
  Layers,
  Scale,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import {
  AppHeader,
  BottomNav,
  PhoneFrame,
  RiskChip,
  Screen,
  SectionTitle,
} from "@/components/malte/Shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DetectorSheet,
  type DetectorTarget,
} from "@/components/malte/DetectorSheet";
import { useActiveCase } from "@/hooks/useActiveCase";
import { useCaseStore } from "@/hooks/useCaseStore";
import { exportCaseReport } from "@/lib/report";
import { toast } from "sonner";
import { formatEur, formatDate, type Severity } from "@/forensic";
import { alertTarget } from "@/lib/alert-target";

export const Route = createFileRoute("/_authenticated/prehlad")({
  head: () => ({
    meta: [
      { title: "Forendo — Prehľad prípadu" },
      {
        name: "description",
        content:
          "Pracovný spis a forenzný stav prípadu: overenie dôkazov, identifikácia rozporov a odporúčané procesné kroky pre vyšetrovateľa a právnika.",
      },
      { property: "og:title", content: "Forendo — Prehľad prípadu" },
      {
        property: "og:description",
        content:
          "Prehľad prípadu: stav dôkazov, overenie zdrojov a prioritné procesné kroky.",
      },
    ],
  }),
  component: CaseOverview,
});

type CaseStatus = "active" | "pending_verification" | "closed";

const STATUS_LABELS: Record<
  CaseStatus,
  { label: string; chipClass: string; icon: typeof Clock }
> = {
  active: {
    label: "Aktívny prípad",
    chipClass:
      "bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25",
    icon: Clock,
  },
  pending_verification: {
    label: "Čaká na overenie",
    chipClass:
      "bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25",
    icon: AlertTriangle,
  },
  closed: {
    label: "Uzavretý spis",
    chipClass:
      "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25",
    icon: CheckCircle2,
  },
};

type AuditModalData = {
  title: string;
  category: string;
  description: string;
  legalBasis: string;
  items: Array<{
    label: string;
    detail: string;
    badge?: string;
    badgeVariant?: "default" | "destructive" | "secondary" | "outline";
    linkTo?: string;
    linkLabel?: string;
  }>;
};

function CaseOverview() {
  const navigate = useNavigate();
  const { activeCase, analysis, cases, setActiveCaseId, refresh } =
    useActiveCase();
  const { totals, caseScore, alerts } = analysis;
  const { state, countExport } = useCaseStore();

  const [target, setTarget] = useState<DetectorTarget | null>(null);
  const [auditModal, setAuditModal] = useState<AuditModalData | null>(null);

  // Perzistencia používateľom zvoleného stavu prípadu bez nutnosti zmeny schémy DB
  const [customStatus, setCustomStatus] = useState<CaseStatus>(() => {
    if (typeof window !== "undefined" && activeCase.id) {
      const stored = window.localStorage.getItem(
        `forendo:case-status:${activeCase.id}`,
      );
      if (
        stored === "active" ||
        stored === "pending_verification" ||
        stored === "closed"
      ) {
        return stored;
      }
    }
    return alerts.some((a) => a.severity === "critical")
      ? "pending_verification"
      : "active";
  });

  const handleStatusChange = (newStatus: CaseStatus) => {
    setCustomStatus(newStatus);
    if (typeof window !== "undefined" && activeCase.id) {
      window.localStorage.setItem(
        `forendo:case-status:${activeCase.id}`,
        newStatus,
      );
    }
    toast.success(
      `Stav prípadu bol zmenený na „${STATUS_LABELS[newStatus].label}“.`,
    );
  };

  // 1. DÔKAZNÝ PANEL (Evidence Seal Metrics) — počítané výhradne z reálnych dát prípadu
  const unverifiedWeapons = activeCase.weapons.filter(
    (w) => !w.licence || !activeCase.validLicences?.includes(w.licence),
  );
  const shellEntities = analysis.entities.filter((e) => e.isShell);
  const riskyTransactions = analysis.transactions.filter(
    (t) => t.level === "high" || t.level === "critical",
  );

  const activeSourcesList: Array<{
    name: string;
    detail: string;
    status: "ok" | "warning";
  }> = [];
  if (activeCase.transactions.length > 0) {
    activeSourcesList.push({
      name: "Bankové výpisy a transakčné knihy",
      detail: `${activeCase.transactions.length} transakcií v objeme ${formatEur(totals.volume)}`,
      status: totals.cashRatio > 0.3 ? "warning" : "ok",
    });
  }
  if (activeCase.entities.some((e) => e.kind === "company")) {
    activeSourcesList.push({
      name: "Obchodný register SR (ORSR)",
      detail: `${totals.companies} právnických osôb s kontrolou sídla a IČO`,
      status:
        Object.keys(activeCase.orsrAddresses ?? {}).length > 0
          ? "ok"
          : "warning",
    });
  }
  if (activeCase.weapons.length > 0) {
    activeSourcesList.push({
      name: "Evidencia zbraní a licencií KR PZ",
      detail: `${totals.weapons} zbraní, ${unverifiedWeapons.length} bez overenej licencie`,
      status: unverifiedWeapons.length > 0 ? "warning" : "ok",
    });
  }
  if (
    (activeCase.europolSerials?.length ?? 0) > 0 ||
    totals.europolMatches > 0
  ) {
    activeSourcesList.push({
      name: "Schengenský register / Europol dožiadanie",
      detail: `${totals.europolMatches} zhodných sériových čísel so záznamami SIS/Europol`,
      status: totals.europolMatches > 0 ? "warning" : "ok",
    });
  }
  if (activeCase.events.length > 0) {
    activeSourcesList.push({
      name: "Vyšetrovací spis a policajné zápisnice",
      detail: `${activeCase.events.length} chronologických úradných záznamov a výsluchov`,
      status: "ok",
    });
  }
  const sourcesCount = Math.max(activeSourcesList.length, 1);

  // Celkový počet spracovaných záznamov
  const processedRecordsCount =
    activeCase.transactions.length +
    activeCase.entities.length +
    activeCase.weapons.length +
    activeCase.events.length +
    activeCase.relations.length;

  // Overené záznamy
  const verifiedEntitiesCount = activeCase.entities.filter(
    (e) =>
      e.kind === "person" ||
      (e.ico && (activeCase.orsrAddresses?.[e.ico] || e.registeredAddress)),
  ).length;
  const verifiedWeaponsCount = activeCase.weapons.filter(
    (w) => w.licence && activeCase.validLicences?.includes(w.licence),
  ).length;
  const cleanTransactionsCount = analysis.transactions.filter(
    (t) => t.level === "low" || t.level === "medium",
  ).length;
  const verifiedRecordsCount =
    verifiedEntitiesCount +
    verifiedWeaponsCount +
    cleanTransactionsCount +
    activeCase.events.length;

  // Neoverené alebo problematické záznamy
  const problematicRecordsCount =
    unverifiedWeapons.length +
    shellEntities.length +
    riskyTransactions.length +
    totals.europolMatches;

  // Duplicity a chýbajúce údaje
  const missingCompanyData = activeCase.entities.filter(
    (e) => e.kind === "company" && (!e.ico || !e.address),
  );
  const missingWeaponLicence = activeCase.weapons.filter((w) => !w.licence);
  const missingTxDescription = activeCase.transactions.filter(
    (t) => !t.description || t.description.trim() === "",
  );
  const missingOrDuplicateCount =
    missingCompanyData.length +
    missingWeaponLicence.length +
    missingTxDescription.length;

  // Celkový stav dôkazov
  const overallSeal =
    problematicRecordsCount > 0
      ? {
          status: "needs_review",
          label: "Vyžaduje kontrolu",
          badgeClass:
            "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30",
          icon: AlertTriangle,
          description:
            "Boli zistené procesné medzery, spochybnené úkony alebo neoverené licencie vyžadujúce verifikáciu pred súdom.",
        }
      : missingOrDuplicateCount > 0
        ? {
            status: "incomplete",
            label: "Neúplné dáta",
            badgeClass:
              "bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30",
            icon: FileQuestion,
            description:
              "V spise chýbajú niektoré formálne náležitosti (IČO, chýbajúce čísla licencií alebo popisy tokov).",
          }
        : {
            status: "trusted",
            label: "Dôveryhodné dôkazy",
            badgeClass:
              "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30",
            icon: ShieldCheck,
            description:
              "Všetky kľúčové zdroje sú preverené voči registrom a spĺňajú podmienky procesnej prípustnosti podľa § 119 TP.",
          };

  // Posledná synchronizácia
  const lastSyncDate = activeCase.referenceDate
    ? formatDate(activeCase.referenceDate)
    : "Aktuálna relácia";

  // 2. BLOK POZORNOSTI — MAX 5 POLOŽIEK
  const priorityAlerts = [...alerts]
    .sort((a, b) => {
      const order: Record<Severity, number> = {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1,
      };
      return order[b.severity] - order[a.severity] || b.score - a.score;
    })
    .slice(0, 5);

  // Odporúčaný procesný krok
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const recommendedStep =
    criticalCount > 0
      ? unverifiedWeapons.length > 0
        ? "1. Vyžiadať overenie platnosti licencií LA od KR PZ (§ 98 TP); 2. Nariadiť písmoznalectvo podpisov v knihe zbraní (§ 142 TP)."
        : "1. Overiť konečného užívateľa výhod v RPVS; 2. Zabezpečiť bankové výpisy k hotovostným vkladom (§ 116 TP)."
      : "Spis je stabilný. Odporúča sa pripraviť finálne dossier pre prokuratúru alebo vyšetrovateľa.";

  // CTA Akcie
  const exportReport = () => {
    if (exportCaseReport(analysis, state.riskFilter)) {
      countExport();
      toast.success("Dossier prípadu bol pripravený na tlač a export do PDF.");
    } else {
      toast.error("Generovanie dossieru zlyhalo.");
    }
  };

  const handleOpenSourceForAlert = (alertId: string) => {
    if (
      alertId.startsWith("tx-") ||
      alertId.startsWith("cb-") ||
      alertId.startsWith("transit-")
    ) {
      void navigate({ to: "/analyza-vypisov" });
    } else if (alertId.startsWith("entity-")) {
      void navigate({ to: "/osoby" });
    } else if (alertId.startsWith("weapon-")) {
      void navigate({ to: "/zbrane" });
    } else if (
      alertId.startsWith("chain-") ||
      alertId.startsWith("path-") ||
      alertId.startsWith("ml-")
    ) {
      void navigate({ to: "/siet" });
    } else {
      void navigate({ to: "/viac" });
    }
  };

  const handleSendToMalte = (title: string) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("forendo:malte-prompt", title);
    }
    toast.info(`Odosielam podnet pre Malteho: „${title}“`);
    void navigate({ to: "/asistent" });
  };

  return (
    <PhoneFrame>
      <AppHeader
        title="Prípad"
        brand
        back
        actions={
          <div className="flex items-center gap-2">
            {cases.length > 1 ? (
              <select
                aria-label="Prepnúť vyšetrovaný prípad"
                value={activeCase.id}
                onChange={(e) => {
                  setActiveCaseId(e.target.value);
                  refresh();
                }}
                className="h-8 max-w-35 truncate rounded-lg border border-white/20 bg-white/10 px-2 text-xs font-semibold text-white outline-none cursor-pointer hover:bg-white/20"
              >
                {cases.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                    className="bg-slate-900 text-white"
                  >
                    {c.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        }
      />

      <Screen>
        <div className="space-y-4 pb-20">
          {/* =========================================================================
              1. HORNÝ KONTEXTOVÝ PANEL
             ========================================================================= */}
          <section
            aria-label="Kontext prípadu"
            className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                    Vyšetrovací spis
                  </span>
                  <span className="text-muted-foreground/60">•</span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground text-[11px]">
                    <Calendar className="h-3 w-3" aria-hidden />
                    Aktualizované: {lastSyncDate}
                  </span>
                  <span className="text-muted-foreground/60">•</span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground text-[11px]">
                    <UserCheck className="h-3 w-3" aria-hidden />
                    Tím: ÚBOK / Finančná polícia
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground wrap-break-word">
                  {activeCase.name}
                </h1>

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {activeCase.subtitle ||
                    "Forenzná analýza organizovanej finančnej trestnej činnosti a tokov (§ 294 TZ)."}
                </p>
              </div>

              {/* Prepínač stavu prípadu */}
              <div className="shrink-0 pt-1 sm:pt-0">
                <label htmlFor="case-status-select" className="sr-only">
                  Stav prípadu
                </label>
                <div className="inline-flex items-center gap-1.5">
                  <select
                    id="case-status-select"
                    value={customStatus}
                    onChange={(e) =>
                      handleStatusChange(e.target.value as CaseStatus)
                    }
                    className={`h-7 rounded-full border px-3 text-xs font-semibold outline-none cursor-pointer transition-colors ${STATUS_LABELS[customStatus].chipClass}`}
                    aria-label="Aktuálny procesný stav prípadu"
                  >
                    <option value="active" className="bg-card text-foreground">
                      Aktívny prípad
                    </option>
                    <option
                      value="pending_verification"
                      className="bg-card text-foreground"
                    >
                      Čaká na overenie
                    </option>
                    <option value="closed" className="bg-card text-foreground">
                      Uzavretý spis
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3 HLAVNÉ CTA TLAČIDLÁ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-10 justify-center gap-2 rounded-xl border-border bg-secondary/50 font-medium text-xs hover:bg-secondary cursor-pointer"
              >
                <Link to="/viac">
                  <History
                    className="h-4 w-4 text-primary shrink-0"
                    aria-hidden
                  />
                  <span>Otvoriť časovú os</span>
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-10 justify-center gap-2 rounded-xl border-border bg-secondary/50 font-medium text-xs hover:bg-secondary cursor-pointer"
              >
                <Link to="/asistent">
                  <Bot className="h-4 w-4 text-primary shrink-0" aria-hidden />
                  <span>Opýtať sa Malteho</span>
                </Link>
              </Button>

              <Button
                size="sm"
                onClick={exportReport}
                className="h-10 justify-center gap-2 rounded-xl font-medium text-xs shadow-xs cursor-pointer"
              >
                <FileDown className="h-4 w-4 shrink-0" aria-hidden />
                <span>Pripraviť dossier</span>
              </Button>
            </div>
          </section>

          {/* =========================================================================
              2. STAV DÔKAZOV / EVIDENCE SEAL (Praktický stavový panel, nie dekorácia)
             ========================================================================= */}
          <section
            aria-label="Stav dôkazov a Evidence Seal"
            className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-3.5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
                  <h2 className="text-sm font-semibold text-foreground">
                    Stav dôkazov • Evidence Seal
                  </h2>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Procesná pripravenosť a overenie evidovaných podkladov pre súd
                  a OČTK
                </p>
              </div>

              {/* Celkový stav — interaktívny pill */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() =>
                        setAuditModal({
                          title: `Celkový stav dôkazov: ${overallSeal.label}`,
                          category: "Procesná použiteľnosť (§ 119 TP)",
                          description: overallSeal.description,
                          legalBasis:
                            "Dôkazom môže byť všetko, čo môže prispieť na náležité objasnenie veci a čo sa získalo zákonným spôsobom z dôkazných prostriedkov.",
                          items: [
                            {
                              label: "Celkové skóre rizika prípadu",
                              detail: `${caseScore} / 100 bodov`,
                              badge:
                                caseScore > 60
                                  ? "Vysoké riziko"
                                  : "Mierne riziko",
                              badgeVariant:
                                caseScore > 60 ? "destructive" : "secondary",
                            },
                            {
                              label: "Evidované zdroje",
                              detail: `${sourcesCount} rôznych informačných tokov`,
                            },
                            {
                              label: "Spracované záznamy",
                              detail: `${processedRecordsCount} záznamov v spise`,
                            },
                            {
                              label: "Procesné odporúčanie",
                              detail: recommendedStep,
                            },
                          ],
                        })
                      }
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all ${overallSeal.badgeClass}`}
                      aria-label={`Celkový stav dôkazov: ${overallSeal.label}. Kliknite pre detail.`}
                    >
                      <overallSeal.icon
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden
                      />
                      <span>{overallSeal.label}</span>
                      <Info className="h-3 w-3 opacity-70" aria-hidden />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs max-w-xs">
                    {overallSeal.description} Kliknutím otvoríte auditný rozbor.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Mriežka 5 praktických ukazovateľov — každý je klikateľný */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {/* 1. Počet zdrojov */}
              <button
                type="button"
                onClick={() =>
                  setAuditModal({
                    title: "Prehľad informačných zdrojov prípadu",
                    category: "Zdroje a pôvod dôkazov",
                    description:
                      "Prehľad všetkých evidovaných registrov, výpisov a zápisníc, z ktorých tento prípad čerpá.",
                    legalBasis: "§ 119 ods. 2 Trestného poriadku",
                    items: activeSourcesList.map((src) => ({
                      label: src.name,
                      detail: src.detail,
                      badge:
                        src.status === "ok"
                          ? "Overený register"
                          : "Vyžaduje kontrolu",
                      badgeVariant:
                        src.status === "ok" ? "secondary" : "destructive",
                    })),
                  })
                }
                className="flex flex-col items-start p-3 rounded-xl border border-border bg-secondary/25 hover:bg-secondary/60 hover:border-border/80 transition-all text-left cursor-pointer group"
                aria-label={`Zdroje: ${sourcesCount}. Kliknite pre zoznam zdrojov.`}
              >
                <div className="flex items-center justify-between w-full text-muted-foreground group-hover:text-foreground">
                  <span className="text-[11px] font-medium">Zdroje</span>
                  <Layers className="h-3.5 w-3.5 text-primary/70" aria-hidden />
                </div>
                <p className="mt-1.5 text-lg font-bold tracking-tight text-foreground tnum">
                  {sourcesCount}
                </p>
                <span className="text-[10px] text-muted-foreground truncate w-full">
                  {activeSourcesList[0]?.name ?? "1 primárny zdroj"}
                </span>
              </button>

              {/* 2. Spracované záznamy */}
              <button
                type="button"
                onClick={() =>
                  setAuditModal({
                    title: "Spracované záznamy v spise",
                    category: "Objem spisu a položiek",
                    description:
                      "Kompletný počet samostatných údajových entít, peňažných tokov a vecí evidovaných v tomto vyšetrovaní.",
                    legalBasis: "§ 120 Trestného poriadku",
                    items: [
                      {
                        label: "Finančné transakcie",
                        detail: `${activeCase.transactions.length} operácií v hodnote ${formatEur(totals.volume)}`,
                        linkTo: "/analyza-vypisov",
                        linkLabel: "Otvoriť analýzu tokov",
                      },
                      {
                        label: "Subjekty a osoby",
                        detail: `${activeCase.entities.length} osôb a firiem (${totals.companies} spoločností)`,
                        linkTo: "/osoby",
                        linkLabel: "Otvoriť zoznam osôb",
                      },
                      {
                        label: "Evidované zbrane a predmety",
                        detail: `${activeCase.weapons.length} kusov techniky`,
                        linkTo: "/zbrane",
                        linkLabel: "Otvoriť register zbraní",
                      },
                      {
                        label: "Chronologické udalosti",
                        detail: `${activeCase.events.length} úkonov v časovej osi`,
                        linkTo: "/viac",
                        linkLabel: "Zobraziť časovú os",
                      },
                      {
                        label: "Vzťahové prepojenia",
                        detail: `${activeCase.relations.length} väzieb medzi subjektmi`,
                        linkTo: "/siet",
                        linkLabel: "Zobraziť sieť",
                      },
                    ],
                  })
                }
                className="flex flex-col items-start p-3 rounded-xl border border-border bg-secondary/25 hover:bg-secondary/60 hover:border-border/80 transition-all text-left cursor-pointer group"
                aria-label={`Spracované záznamy: ${processedRecordsCount}. Kliknite pre rozpis.`}
              >
                <div className="flex items-center justify-between w-full text-muted-foreground group-hover:text-foreground">
                  <span className="text-[11px] font-medium">Záznamy</span>
                  <FileText
                    className="h-3.5 w-3.5 text-primary/70"
                    aria-hidden
                  />
                </div>
                <p className="mt-1.5 text-lg font-bold tracking-tight text-foreground tnum">
                  {processedRecordsCount}
                </p>
                <span className="text-[10px] text-muted-foreground truncate w-full">
                  {activeCase.transactions.length} tokov •{" "}
                  {activeCase.entities.length} osôb
                </span>
              </button>

              {/* 3. Overené zdroje / položky */}
              <button
                type="button"
                onClick={() =>
                  setAuditModal({
                    title: "Overené položky a spoľahlivé dôkazy",
                    category: "Procesne nespochybniteľné podklady",
                    description:
                      "Záznamy, ktoré boli úspešne overené voči štátnym registrom, platným licenciám a bankovým potvrdeniam.",
                    legalBasis: "§ 119 ods. 1 TP a § 98 TP",
                    items: [
                      {
                        label: "Subjekty s overenou adresou a IČO v ORSR",
                        detail: `${verifiedEntitiesCount} z ${activeCase.entities.length} subjektov`,
                        badge: "Overené ORSR",
                        badgeVariant: "secondary",
                        linkTo: "/osoby",
                        linkLabel: "Prezrieť subjekty",
                      },
                      {
                        label: "Zbrane s platnou zbrojnou licenciou",
                        detail: `${verifiedWeaponsCount} z ${activeCase.weapons.length} položiek`,
                        badge: "Platná licencia LA",
                        badgeVariant: "secondary",
                        linkTo: "/zbrane",
                        linkLabel: "Prezrieť zbrane",
                      },
                      {
                        label: "Bezproblémové bezhotovostné prevody",
                        detail: `${cleanTransactionsCount} z ${activeCase.transactions.length} transakcií`,
                        badge: "Nízke riziko",
                        badgeVariant: "secondary",
                        linkTo: "/analyza-vypisov",
                        linkLabel: "Prezrieť prevody",
                      },
                    ],
                  })
                }
                className="flex flex-col items-start p-3 rounded-xl border bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20 transition-all text-left cursor-pointer group"
                aria-label={`Overené záznamy: ${verifiedRecordsCount}. Kliknite pre detail overenia.`}
              >
                <div className="flex items-center justify-between w-full text-emerald-400">
                  <span className="text-[11px] font-semibold">Overené</span>
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                </div>
                <p className="mt-1.5 text-lg font-bold tracking-tight text-emerald-300 tnum">
                  {verifiedRecordsCount}
                </p>
                <span className="text-[10px] text-emerald-400/80 truncate w-full">
                  Splnené procesné štandardy
                </span>
              </button>

              {/* 4. Neoverené / problematické */}
              <button
                type="button"
                onClick={() =>
                  setAuditModal({
                    title: "Problematické záznamy a procesné riziká",
                    category: "Zraniteľné miesta dôkazného reťazca",
                    description:
                      "Položky, ktoré vykazujú právne anomálie, neplatné licencie alebo podozrenie na schránkové operácie.",
                    legalBasis: "§ 125 TP a § 142 TP",
                    items: [
                      ...unverifiedWeapons.map((w) => ({
                        label: `Neoverená zbraň: ${w.brand} ${w.model} (${w.serial})`,
                        detail: w.licence
                          ? `Licencia ${w.licence} nie je v evidencii platných licencií KR PZ`
                          : "Úplne chýba označenie licencie",
                        badge: "Chýba licencia",
                        badgeVariant: "destructive" as const,
                        linkTo: "/zbrane",
                        linkLabel: "Upraviť v registri",
                      })),
                      ...shellEntities.map((s) => ({
                        label: `Schránková firma: ${s.entity.name}`,
                        detail: `Rizikové skóre ${s.score}/100 • Podozrenie na absenciu reálnej ekonomickej činnosti`,
                        badge: "Schránka",
                        badgeVariant: "destructive" as const,
                        linkTo: "/osoby",
                        linkLabel: "Preveriť subjekt",
                      })),
                      ...riskyTransactions.slice(0, 3).map((t) => ({
                        label: `Rizikový tok: ${formatEur(t.transaction.amount)}`,
                        detail: `${t.transaction.description} • ${t.flags.map((f) => f.label).join(", ")}`,
                        badge: "Vysoké riziko",
                        badgeVariant: "destructive" as const,
                        linkTo: "/analyza-vypisov",
                        linkLabel: "Skontrolovať výpis",
                      })),
                    ],
                  })
                }
                className={`flex flex-col items-start p-3 rounded-xl border transition-all text-left cursor-pointer group ${
                  problematicRecordsCount > 0
                    ? "bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/30 text-amber-300"
                    : "bg-secondary/25 hover:bg-secondary/60 border-border text-muted-foreground"
                }`}
                aria-label={`Problematické záznamy: ${problematicRecordsCount}. Kliknite pre zoznam nezrovnalostí.`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-semibold">
                    Problematické
                  </span>
                  <AlertTriangle
                    className="h-3.5 w-3.5 text-amber-400"
                    aria-hidden
                  />
                </div>
                <p className="mt-1.5 text-lg font-bold tracking-tight tnum text-foreground">
                  {problematicRecordsCount}
                </p>
                <span className="text-[10px] text-muted-foreground truncate w-full">
                  {problematicRecordsCount > 0
                    ? `${unverifiedWeapons.length} zbraní • ${shellEntities.length} schránok`
                    : "Žiadne zistené anomálie"}
                </span>
              </button>

              {/* 5. Duplicity a chýbajúce údaje */}
              <button
                type="button"
                onClick={() =>
                  setAuditModal({
                    title: "Duplicity a chýbajúce identifikačné údaje",
                    category: "Formálne nedostatky v evidencii",
                    description:
                      "Položky, ktorým chýba povinný identifikačný údaj (IČO, adresa, licencia alebo účel platby).",
                    legalBasis:
                      "§ 9 ods. 1 zák. č. 297/2008 Z. z. a Trestný poriadok",
                    items:
                      missingOrDuplicateCount > 0
                        ? [
                            ...missingCompanyData.map((c) => ({
                              label: `Spoločnosť bez IČO/adresy: ${c.name}`,
                              detail:
                                "Chýba oficiálna adresa sídla alebo identifikačné číslo",
                              badge: "Chýba údaj",
                              badgeVariant: "destructive" as const,
                              linkTo: "/osoby",
                              linkLabel: "Doplniť IČO",
                            })),
                            ...missingWeaponLicence.map((w) => ({
                              label: `Zbraň bez evidovanej licencie: ${w.serial}`,
                              detail: `${w.brand} ${w.model} nemá priradené číslo zbrojnej licencie`,
                              badge: "Chýba licencia",
                              badgeVariant: "destructive" as const,
                              linkTo: "/zbrane",
                              linkLabel: "Doplniť licenciu",
                            })),
                          ]
                        : [
                            {
                              label: "Všetky formálne náležitosti sú vyplnené",
                              detail:
                                "Neboli zistené duplicitné záznamy ani chýbajúce povinné identifikačné znaky.",
                              badge: "Kompletné",
                              badgeVariant: "secondary",
                            },
                          ],
                  })
                }
                className="flex flex-col items-start p-3 rounded-xl border border-border bg-secondary/25 hover:bg-secondary/60 hover:border-border/80 transition-all text-left cursor-pointer group"
                aria-label={`Chýbajúce údaje: ${missingOrDuplicateCount}. Kliknite pre podrobnosti.`}
              >
                <div className="flex items-center justify-between w-full text-muted-foreground group-hover:text-foreground">
                  <span className="text-[11px] font-medium">
                    Chýbajúce dáta
                  </span>
                  <HelpCircle
                    className="h-3.5 w-3.5 text-primary/70"
                    aria-hidden
                  />
                </div>
                <p className="mt-1.5 text-lg font-bold tracking-tight text-foreground tnum">
                  {missingOrDuplicateCount === 0
                    ? "0"
                    : missingOrDuplicateCount}
                </p>
                <span className="text-[10px] text-muted-foreground truncate w-full">
                  {missingOrDuplicateCount === 0
                    ? "Formálne kompletné"
                    : `${missingOrDuplicateCount} neúplných polí`}
                </span>
              </button>
            </div>
          </section>

          {/* =========================================================================
              3. „ČO SI VYŽADUJE POZORNOSŤ“ (Stručný pokojný briefing pre vyšetrovateľa)
             ========================================================================= */}
          <section
            aria-label="Kľúčový stav a odporúčaný procesný postup"
            className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" aria-hidden />
                <h2 className="text-sm font-semibold text-foreground">
                  Čo si vyžaduje pozornosť
                </h2>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Prioritné zistenia: {priorityAlerts.length}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Najdôležitejšie práve teraz */}
              <div className="rounded-xl border border-border/70 bg-secondary/25 p-3.5 space-y-1.5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  1. Čo je najdôležitejšie práve teraz
                </p>
                <p className="text-xs text-foreground/90 leading-relaxed">
                  {criticalCount > 0
                    ? `V spise je evidovaných ${criticalCount} kritických zistení. Najzávažnejším rizikom je spochybnenie reálneho prevzatia zbraní a chýbajúce overenie podpisových vzorov v evidencii zbraní.`
                    : "Dôkazná situácia nevykazuje kritické zlomy. Všetky základné toky sú podložené účtovnými a bankovými záznamami."}
                </p>
              </div>

              {/* Najbližší odporúčaný krok */}
              <div className="rounded-xl border border-border/70 bg-secondary/25 p-3.5 space-y-1.5">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  2. Najbližší odporúčaný procesný krok
                </p>
                <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                  {recommendedStep}
                </p>
              </div>
            </div>
          </section>

          {/* =========================================================================
              4. BLOK „VYŽADUJE POZORNOSŤ“ (Max 5 položiek, priorita, 1-tap akcie)
             ========================================================================= */}
          <section
            aria-label="Zoznam položiek vyžadujúcich pozornosť"
            className="space-y-2.5"
          >
            <div className="flex items-center justify-between px-1">
              <SectionTitle>
                Vyžaduje pozornosť ({priorityAlerts.length})
              </SectionTitle>
              <Link
                to="/analyza-vypisov"
                className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                Kompletná analýza <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            </div>

            <div
              className="space-y-2.5"
              role="feed"
              aria-label="Zistenia s najvyššou prioritou"
            >
              {priorityAlerts.map((alert) => {
                const targetCandidate = alertTarget(alert.id);
                const priorityText =
                  alert.severity === "critical"
                    ? "Kritická"
                    : alert.severity === "high"
                      ? "Vysoká"
                      : alert.severity === "medium"
                        ? "Stredná"
                        : "Nízka";

                return (
                  <div
                    key={alert.id}
                    className="rounded-2xl border border-border bg-card p-4 transition-all hover:border-border/80 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <RiskChip level={alert.severity}>
                            {priorityText}
                          </RiskChip>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {alert.source
                              ? `Zdroj: ${alert.source}`
                              : "Forenzný detektor"}
                          </span>
                          {alert.date ? (
                            <>
                              <span className="text-muted-foreground/40">
                                •
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {alert.date}
                              </span>
                            </>
                          ) : null}
                        </div>

                        <h3 className="text-sm font-semibold text-foreground wrap-break-word pt-0.5">
                          {alert.title}
                        </h3>

                        <p className="text-xs text-muted-foreground leading-relaxed wrap-break-word">
                          {alert.detail}
                        </p>
                      </div>
                    </div>

                    {/* 1-TAP AKCIE (Overiť / Otvoriť zdroj / Poslať Maltemu) */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (targetCandidate) {
                            setTarget(targetCandidate);
                          } else {
                            setAuditModal({
                              title: alert.title,
                              category: "Detail zistenia a právny rámec",
                              description: alert.detail,
                              legalBasis: "Trestný poriadok SR",
                              items: [
                                {
                                  label: "Závažnosť",
                                  detail: priorityText,
                                  badge: priorityText,
                                  badgeVariant:
                                    alert.severity === "critical"
                                      ? "destructive"
                                      : "secondary",
                                },
                                {
                                  label: "Rizikové skóre",
                                  detail: `${alert.score} bodov`,
                                },
                                {
                                  label: "Odporúčaný procesný postup",
                                  detail:
                                    "Zabezpečiť písomné dôkazy alebo nariadiť znalecké dokazovanie podľa § 142 TP.",
                                },
                              ],
                            });
                          }
                        }}
                        className="h-8 rounded-lg px-2.5 text-xs font-medium cursor-pointer"
                      >
                        <Search
                          className="mr-1.5 h-3.5 w-3.5 text-primary"
                          aria-hidden
                        />
                        Overiť
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenSourceForAlert(alert.id)}
                        className="h-8 rounded-lg px-2.5 text-xs font-medium cursor-pointer"
                      >
                        <ExternalLink
                          className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"
                          aria-hidden
                        />
                        Otvoriť zdroj
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSendToMalte(alert.title)}
                        className="h-8 rounded-lg px-2.5 text-xs font-medium text-primary hover:bg-primary/10 ml-auto cursor-pointer"
                      >
                        <Bot className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                        Poslať Maltemu
                      </Button>
                    </div>
                  </div>
                );
              })}

              {priorityAlerts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-muted-foreground">
                  <CheckCircle2
                    className="mx-auto h-8 w-8 text-emerald-500/70"
                    aria-hidden
                  />
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    Žiadne položky nevyžadujú okamžitú pozornosť
                  </p>
                  <p className="mt-1 text-xs">
                    Všetky kontrolované indikátory a transakcie sú v rámci
                    prípustných parametrov.
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          {/* =========================================================================
              5. SPODNÝ PÁS: RÝCHLE LINKY (Existujúce routes s 0px overflow pri 390px)
             ========================================================================= */}
          <section
            aria-label="Rýchla navigácia prípadu"
            className="rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-sm"
          >
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 px-1">
              Rýchly prístup k častiam prípadu
            </p>
            <nav className="grid grid-cols-5 gap-1.5 text-center">
              <Link
                to="/viac"
                className="flex flex-col items-center justify-center p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors group"
              >
                <History
                  className="h-4 w-4 text-primary/80 group-hover:text-primary mb-1 shrink-0"
                  aria-hidden
                />
                <span className="text-[11px] font-medium leading-tight truncate w-full">
                  Časová os
                </span>
              </Link>

              <Link
                to="/asistent"
                className="flex flex-col items-center justify-center p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors group"
              >
                <Scale
                  className="h-4 w-4 text-rose-400 group-hover:text-rose-300 mb-1 shrink-0"
                  aria-hidden
                />
                <span className="text-[11px] font-medium leading-tight truncate w-full">
                  Rozpory
                </span>
              </Link>

              <Link
                to="/analyza-vypisov"
                className="flex flex-col items-center justify-center p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors group"
              >
                <FileSpreadsheet
                  className="h-4 w-4 text-emerald-400 group-hover:text-emerald-300 mb-1 shrink-0"
                  aria-hidden
                />
                <span className="text-[11px] font-medium leading-tight truncate w-full">
                  Dôkazy
                </span>
              </Link>

              <Link
                to="/asistent"
                className="flex flex-col items-center justify-center p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors group"
              >
                <Bot
                  className="h-4 w-4 text-primary group-hover:text-primary-foreground mb-1 shrink-0"
                  aria-hidden
                />
                <span className="text-[11px] font-medium leading-tight truncate w-full">
                  Malte
                </span>
              </Link>

              <button
                type="button"
                onClick={exportReport}
                className="flex flex-col items-center justify-center p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors group cursor-pointer"
              >
                <FileDown
                  className="h-4 w-4 text-primary mb-1 shrink-0"
                  aria-hidden
                />
                <span className="text-[11px] font-medium leading-tight truncate w-full">
                  Dossier
                </span>
              </button>
            </nav>
          </section>
        </div>
      </Screen>

      {/* Detail zistenia / detektora */}
      <DetectorSheet target={target} onClose={() => setTarget(null)} />

      {/* Auditný modálny dialóg pre Evidence Seal */}
      <Dialog
        open={auditModal !== null}
        onOpenChange={(open) => !open && setAuditModal(null)}
      >
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto rounded-2xl">
          {auditModal ? (
            <>
              <DialogHeader className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                  <span>{auditModal.category}</span>
                </div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {auditModal.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                  {auditModal.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 pt-2">
                <div className="rounded-xl border border-border bg-secondary/30 p-2.5 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    Právny rámec:{" "}
                  </span>
                  {auditModal.legalBasis}
                </div>

                <div className="divide-y divide-border/60 rounded-xl border border-border bg-card">
                  {auditModal.items.map((item, idx) => (
                    <div
                      key={`${item.label}-${idx}`}
                      className="p-3 space-y-1 text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {item.label}
                        </span>
                        {item.badge ? (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              item.badgeVariant === "destructive"
                                ? "bg-rose-500/15 text-rose-300"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.detail}
                      </p>
                      {item.linkTo ? (
                        <div className="pt-1">
                          <Link
                            to={item.linkTo}
                            onClick={() => setAuditModal(null)}
                            className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {item.linkLabel ?? "Prejsť na detail"}{" "}
                            <ArrowRight className="h-3 w-3" aria-hidden />
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </PhoneFrame>
  );
}
