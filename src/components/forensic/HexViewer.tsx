"use client";

import React from "react";
import { Binary, Eye } from "lucide-react";

interface HexViewerProps {
  rows: { offset: string; hex: string; ascii: string }[];
  magicBytes: string;
  magicMatch: boolean;
}

export default function HexViewer({
  rows,
  magicBytes,
  magicMatch,
}: HexViewerProps) {
  return (
    <div className="rounded-xl border border-border bg-[#0B0B0E] p-4 text-xs font-mono overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Binary className="h-4 w-4 text-brand" />
          <span className="font-semibold text-white">
            Hexadecimálny inšpektor hlavičky (Magic Bytes)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Magic Bytes:</span>
          <span
            className={`px-2 py-0.5 rounded font-bold ${magicMatch ? "bg-success/10 text-success border border-success/30" : "bg-danger/10 text-danger border border-danger/30"}`}
          >
            {magicBytes || "N/A"}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[#555] border-b border-border/40 select-none">
              <th className="py-1 px-2 font-normal">Offset</th>
              <th className="py-1 px-3 font-normal">
                00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F
              </th>
              <th className="py-1 px-3 font-normal">Dekódovaný ASCII</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20 text-[#CCC]">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                <td className="py-1 px-2 text-brand font-semibold select-none">
                  {row.offset}
                </td>
                <td className="py-1 px-3 font-mono tracking-wider text-[#A0A0B0]">
                  {row.hex}
                </td>
                <td className="py-1 px-3 font-mono text-[#7ED321] select-none">
                  {row.ascii}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-[#666]">
        <span>Zobrazených prvých {rows.length * 16} bajtov súboru</span>
        <span className="flex items-center gap-1">
          <Eye className="h-3 w-3" /> Zelená = tlačiteľné znaky, sivá = binárny
          obsah
        </span>
      </div>
    </div>
  );
}
