"use client";

import React from "react";
import {
  Landmark,
  Hash,
  DollarSign,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import type { ExtractedFinancialEntities } from "@/forensic/sandbox/forensic-engine";

interface FinancialEntitiesCardProps {
  entities: ExtractedFinancialEntities;
}

export default function FinancialEntitiesCard({
  entities,
}: FinancialEntitiesCardProps) {
  const hasData =
    entities.ibans.length > 0 ||
    entities.icos.length > 0 ||
    entities.dics.length > 0 ||
    entities.amounts.length > 0 ||
    entities.suspiciousKeywords.length > 0;

  if (!hasData) {
    return (
      <div className="rounded-xl border border-border bg-[#0B0B0E] p-6 text-center text-xs text-muted-foreground">
        V extrahovanom obsahu neboli nájdené žiadne explicitné finančné
        identifikátory (IČO, DIČ, IBAN ani sumy).
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Kľúčové deskriptory kriminality */}
      {entities.suspiciousKeywords.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-center gap-2 text-warning font-semibold text-xs mb-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>
              Zachytené rizikové forenzné pojmy (
              {entities.suspiciousKeywords.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {entities.suspiciousKeywords.map((kw, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-warning/10 text-warning border border-warning/20 uppercase tracking-wider"
              >
                {kw}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Tieto pojmy indikujú podozrenie na cezhraničné toky, daňovú
            optimalizáciu alebo fiktívne fakturácie v zmysle zákona o AML.
          </p>
        </div>
      )}

      {/* Grid subjektov */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* IBAN Účty */}
        <div className="rounded-xl border border-border bg-[#0B0B0E] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#DDD]">
            <Landmark className="h-4 w-4 text-brand shrink-0" />
            <span>Bankové účty (IBAN)</span>
            <span className="ml-auto text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-surface">
              {entities.ibans.length}
            </span>
          </div>
          {entities.ibans.length > 0 ? (
            <div className="space-y-1.5">
              {entities.ibans.map((iban, idx) => (
                <div
                  key={idx}
                  className="font-mono text-xs text-white bg-surface px-2.5 py-1.5 rounded border border-border flex items-center justify-between"
                >
                  <span>{iban}</span>
                  <a
                    href={`https://forendetect.vercel.app/`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-brand hover:underline"
                  >
                    Overiť vo Forendo →
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#666]">
              Neboli detegované žiadne IBAN formáty.
            </p>
          )}
        </div>

        {/* Peňažné sumy */}
        <div className="rounded-xl border border-border bg-[#0B0B0E] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#DDD]">
            <DollarSign className="h-4 w-4 text-success shrink-0" />
            <span>Identifikované peňažné toky & sumy</span>
            <span className="ml-auto text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-surface">
              {entities.amounts.length}
            </span>
          </div>
          {entities.amounts.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {entities.amounts.map((amt, idx) => (
                <span
                  key={idx}
                  className="font-mono text-xs font-semibold text-success bg-success/10 border border-success/20 px-2 py-1 rounded"
                >
                  {amt}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#666]">
              Neboli nájdené finančné čiastky s menou.
            </p>
          )}
        </div>

        {/* IČO Subjektov */}
        <div className="rounded-xl border border-border bg-[#0B0B0E] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#DDD]">
            <Hash className="h-4 w-4 text-[#A78BFA] shrink-0" />
            <span>Identifikačné čísla organizácií (IČO)</span>
            <span className="ml-auto text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-surface">
              {entities.icos.length}
            </span>
          </div>
          {entities.icos.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {entities.icos.map((ico, idx) => (
                <span
                  key={idx}
                  className="font-mono text-xs font-medium text-[#A78BFA] bg-[#A78BFA]/10 border border-[#A78BFA]/20 px-2 py-1 rounded"
                >
                  {ico}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#666]">Žiadne IČO záznamy.</p>
          )}
        </div>

        {/* DIČ / IČ DPH */}
        <div className="rounded-xl border border-border bg-[#0B0B0E] p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#DDD]">
            <AlertCircle className="h-4 w-4 text-[#38BDF8] shrink-0" />
            <span>Daňové identifikačné čísla (DIČ / IČ DPH)</span>
            <span className="ml-auto text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-surface">
              {entities.dics.length}
            </span>
          </div>
          {entities.dics.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {entities.dics.map((dic, idx) => (
                <span
                  key={idx}
                  className="font-mono text-xs font-medium text-[#38BDF8] bg-[#38BDF8]/10 border border-[#38BDF8]/20 px-2 py-1 rounded"
                >
                  {dic}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#666]">Žiadne DIČ záznamy.</p>
          )}
        </div>
      </div>
    </div>
  );
}
