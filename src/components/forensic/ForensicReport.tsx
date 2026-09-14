"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  FileCode,
  Info,
  Binary,
  Landmark,
  Scale,
  BrainCircuit,
  Calendar,
  Layers,
  MapPin,
  FileSearch,
  Download,
  RotateCcw,
} from "lucide-react";
import type { ForensicAnalysisResult } from "@/forensic/sandbox/forensic-engine";
import HexViewer from "./HexViewer";
import StructureTreeView from "./StructureTreeView";
import FinancialEntitiesCard from "./FinancialEntitiesCard";

interface ForensicReportProps {
  result: ForensicAnalysisResult;
  aiVerdict?: {
    verdict: string;
    legalQualification: string;
    recommendations: string[];
    aiRiskScore: number;
  } | null;
  isAiLoading: boolean;
  onReset: () => void;
}

export default function ForensicReport({
  result,
  aiVerdict,
  isAiLoading,
  onReset,
}: ForensicReportProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "structure" | "entities" | "metadata" | "hex" | "rawtext"
  >("overview");

  const effectiveRiskScore = aiVerdict?.aiRiskScore ?? result.riskScore;

  const getRiskBadge = (score: number) => {
    if (score >= 75) {
      return {
        label: "KRITICKÉ FORENZNÉ RIZIKO",
        color: "bg-danger/10 text-danger border-danger/30",
        icon: ShieldAlert,
      };
    }
    if (score >= 45) {
      return {
        label: "ZVÝŠENÉ RIZIKO / ANOMÁLIE",
        color: "bg-warning/10 text-warning border-warning/30",
        icon: ShieldAlert,
      };
    }
    return {
      label: "INTEGRITA ZACHOVANÁ (NÍZKE RIZIKO)",
      color: "bg-success/10 text-success border-success/30",
      icon: ShieldCheck,
    };
  };

  const badge = getRiskBadge(effectiveRiskScore);
  const BadgeIcon = badge.icon;

  return (
    <div className="w-full space-y-6 animate-in fade-in-50 duration-500">
      {/* Top Banner s informáciami o súbore & Forenzným skóre */}
      <div className="rounded-2xl border border-border bg-[#0C0C10] p-6 shadow-forensic">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.color}`}
              >
                <BadgeIcon className="h-4 w-4" />
                {badge.label}
              </span>
              <span className="text-xs font-mono text-muted-foreground bg-surface px-2.5 py-0.5 rounded border border-border">
                SHA-256: {result.sha256.slice(0, 16)}...
              </span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              {result.fileName}
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#888]">
              <span>
                Typ: <strong className="text-[#CCC]">{result.fileType}</strong>
              </span>
              <span>
                Veľkosť:{" "}
                <strong className="text-[#CCC]">
                  {result.fileSizeFormatted}
                </strong>
              </span>
              <span>
                Entropia:{" "}
                <strong className="text-[#CCC]">
                  {result.fileEntropy} b/B
                </strong>
              </span>
              {result.software && (
                <span>
                  Softvér:{" "}
                  <strong className="text-[#CCC]">{result.software}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Skóre kruh / ukazovateľ */}
          <div className="flex items-center gap-4 shrink-0 bg-surface-subtle border border-border/80 rounded-2xl p-4">
            <div className="text-center">
              <div
                className={`text-4xl font-extrabold font-mono ${
                  effectiveRiskScore >= 75
                    ? "text-danger"
                    : effectiveRiskScore >= 45
                      ? "text-warning"
                      : "text-success"
                }`}
              >
                {effectiveRiskScore}
                <span className="text-base text-[#666]">/100</span>
              </div>
              <p className="text-[11px] font-medium text-[#888] uppercase tracking-wider mt-1">
                Forenzný Index Rizika
              </p>
            </div>

            <div className="border-l border-border/80 pl-4 space-y-2">
              <button
                type="button"
                onClick={onReset}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-white border border-border transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Nová analýza
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigačné taby */}
      <div className="flex items-center gap-1.5 border-b border-border/80 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "overview"
              ? "bg-brand text-white shadow-glow"
              : "text-[#888] hover:text-white hover:bg-surface"
          }`}
        >
          <Info className="h-3.5 w-3.5" /> Zhrnutie & Riziká (
          {result.anomalies.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("structure")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "structure"
              ? "bg-brand text-white shadow-glow"
              : "text-[#888] hover:text-white hover:bg-surface"
          }`}
        >
          <Layers className="h-3.5 w-3.5" /> Rozpitvaná Štruktúra
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("entities")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "entities"
              ? "bg-brand text-white shadow-glow"
              : "text-[#888] hover:text-white hover:bg-surface"
          }`}
        >
          <Landmark className="h-3.5 w-3.5" /> Finančné Entity & AML
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("metadata")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "metadata"
              ? "bg-brand text-white shadow-glow"
              : "text-[#888] hover:text-white hover:bg-surface"
          }`}
        >
          <Calendar className="h-3.5 w-3.5" /> Metadáta & Stopa
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("hex")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "hex"
              ? "bg-brand text-white shadow-glow"
              : "text-[#888] hover:text-white hover:bg-surface"
          }`}
        >
          <Binary className="h-3.5 w-3.5" /> Hex Inšpektor
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rawtext")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "rawtext"
              ? "bg-brand text-white shadow-glow"
              : "text-[#888] hover:text-white hover:bg-surface"
          }`}
        >
          <FileSearch className="h-3.5 w-3.5" /> Extrahovaný Text
        </button>
      </div>

      {/* OBSAH ZVOLENÉHO TABU */}

      {/* 1. PREHĽAD & ANOMÁLIE */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* AI Znalecký Posudok */}
          <div className="rounded-2xl border border-brand/30 bg-gradient-to-r from-brand/10 via-[#0B0B0E] to-[#0B0B0E] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-brand uppercase tracking-wider">
                <BrainCircuit className="h-4 w-4 text-brand animate-pulse" />
                Forenzný AI Posudok (Forendetect Engine)
              </span>
              {isAiLoading && (
                <span className="text-[11px] text-brand animate-pulse">
                  Analyzujem slovenské trestnoprávne normy...
                </span>
              )}
            </div>

            <p className="text-sm text-[#DDD] leading-relaxed">
              {aiVerdict?.verdict ||
                "Prebieha vyhodnocovanie korelácie medzi binárnymi anomáliami a účtovnými predpismi..."}
            </p>

            {aiVerdict?.legalQualification && (
              <div className="flex items-start gap-2 pt-2 border-t border-border/60 text-xs">
                <Scale className="h-4 w-4 text-[#F5A623] shrink-0 mt-0.5" />
                <div>
                  <span className="text-muted-foreground">
                    Právna kvalifikácia:{" "}
                  </span>
                  <span className="font-semibold text-white">
                    {aiVerdict.legalQualification}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Zoznam Anomálií a zistení */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Identifikované forenzné zistenia ({result.anomalies.length})
            </h3>

            {result.anomalies.length > 0 ? (
              <div className="space-y-2.5">
                {result.anomalies.map((anom) => (
                  <div
                    key={anom.id}
                    className={`rounded-xl border p-4 space-y-2 ${
                      anom.severity === "critical"
                        ? "border-danger/30 bg-danger/5"
                        : anom.severity === "high"
                          ? "border-danger/20 bg-danger/[0.02]"
                          : anom.severity === "medium"
                            ? "border-warning/30 bg-warning/5"
                            : "border-border bg-surface"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                            anom.severity === "critical" ||
                            anom.severity === "high"
                              ? "bg-danger/20 text-danger"
                              : anom.severity === "medium"
                                ? "bg-warning/20 text-warning"
                                : "bg-white/10 text-[#AAA]"
                          }`}
                        >
                          {anom.severity}
                        </span>
                        <h4 className="text-sm font-semibold text-white">
                          {anom.title}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {anom.id}
                      </span>
                    </div>

                    <p className="text-xs text-[#BBB] leading-relaxed">
                      {anom.description}
                    </p>

                    <div className="pt-2 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#888]">
                      <div>
                        <strong className="text-[#DDD]">Odporúčanie:</strong>{" "}
                        {anom.recommendation}
                      </div>
                      {anom.legalContext && (
                        <div className="text-[#F5A623] font-medium shrink-0">
                          {anom.legalContext}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-center text-xs text-success font-medium">
                V štruktúre súboru neboli nájdené žiadne známe signatúry
                manipulácie ani škodlivého kódu.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. ŠTRUKTÚRA */}
      {activeTab === "structure" && (
        <div className="space-y-4">
          <StructureTreeView tree={result.structureTree} />
        </div>
      )}

      {/* 3. FINANČNÉ ENTITY & AML */}
      {activeTab === "entities" && (
        <div className="space-y-4">
          <FinancialEntitiesCard entities={result.financialEntities} />
        </div>
      )}

      {/* 4. METADÁTA & EXIF */}
      {activeTab === "metadata" && (
        <div className="rounded-xl border border-border bg-[#0B0B0E] p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Metadátová stopa a vlastnosti
            </h3>
            {result.gps && (
              <a
                href={`https://www.google.com/maps?q=${result.gps.latitude},${result.gps.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
              >
                <MapPin className="h-3.5 w-3.5 text-danger" /> Zobraziť GPS na
                mape
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-surface border border-border">
              <span className="text-[11px] text-[#777] block">
                Autor / Vlastník
              </span>
              <span className="text-xs font-semibold text-white">
                {result.author || "Neznámy"}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-border">
              <span className="text-[11px] text-[#777] block">
                Vytvorené dňa
              </span>
              <span className="text-xs font-semibold text-white">
                {result.createdAt || "N/A"}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-surface border border-border">
              <span className="text-[11px] text-[#777] block">
                Naposledy upravené
              </span>
              <span className="text-xs font-semibold text-white">
                {result.modifiedAt || "N/A"}
              </span>
            </div>
          </div>

          {/* Všetky raw metadáta */}
          {Object.keys(result.metadata).length > 0 ? (
            <div className="space-y-1 text-xs font-mono">
              <span className="text-[11px] text-muted-foreground block mb-1">
                Kompletné surové metadátové značky:
              </span>
              <div className="max-h-60 overflow-y-auto rounded-lg bg-surface p-3 border border-border space-y-1">
                {Object.entries(result.metadata).map(([key, val]) => (
                  <div
                    key={key}
                    className="flex items-start gap-2 py-0.5 border-b border-border/30"
                  >
                    <span className="text-brand font-semibold shrink-0">
                      {key}:
                    </span>
                    <span className="text-[#CCC] break-all">
                      {typeof val === "object"
                        ? JSON.stringify(val)
                        : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#666]">
              V súbore neboli nájdené žiadne dodatočné EXIF/XML značky.
            </p>
          )}
        </div>
      )}

      {/* 5. HEX INŠPEKTOR */}
      {activeTab === "hex" && (
        <HexViewer
          rows={result.hexSample}
          magicBytes={result.magicBytes}
          magicMatch={result.magicMatch}
        />
      )}

      {/* 6. EXTRAHOVANÝ TEXT */}
      {activeTab === "rawtext" && (
        <div className="rounded-xl border border-border bg-[#0B0B0E] p-4 space-y-2">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-semibold text-white">
              Vyťažený textový obsah súboru (Text Mining)
            </span>
            <span className="text-[11px] text-muted-foreground">
              {result.extractedContentText.length} znakov
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto p-3 rounded-lg bg-surface border border-border text-xs font-mono text-[#AAA] whitespace-pre-wrap leading-relaxed">
            {result.extractedContentText ||
              "Zo súboru sa nepodarilo vyťažiť žiadne čitateľné textové prúdy."}
          </div>
        </div>
      )}
    </div>
  );
}
