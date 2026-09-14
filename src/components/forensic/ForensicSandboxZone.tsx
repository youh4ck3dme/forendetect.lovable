"use client";

import React, { useState } from "react";
import {
  UploadCloud,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  FolderArchive,
  Sparkles,
  Zap,
} from "lucide-react";

interface ForensicSandboxZoneProps {
  onFileSelect: (file: File) => void;
  onLoadDemo: (
    demoType: "pdf_tampered" | "docx_hidden" | "img_photoshop",
  ) => void;
  isAnalyzing: boolean;
}

export default function ForensicSandboxZone({
  onFileSelect,
  onLoadDemo,
  isAnalyzing,
}: ForensicSandboxZoneProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* Hlavná drop zóna */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() =>
          !isAnalyzing && document.getElementById("sandbox-file-input")?.click()
        }
        className={`relative group border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 ${
          dragOver
            ? "border-brand bg-brand/10 shadow-glow scale-[1.01]"
            : "border-border hover:border-brand/60 bg-[#0E0E12] hover:bg-[#121217]"
        } ${isAnalyzing ? "pointer-events-none opacity-80" : ""}`}
      >
        <input
          id="sandbox-file-input"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.pptx,.zip,.csv,.json"
          className="hidden"
          onChange={handleFileInput}
        />

        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-brand/20 border-t-brand animate-spin" />
              <Zap className="h-6 w-6 text-brand absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white tracking-wide">
                Forenzný engine rozpitváva vzorku...
              </h3>
              <p className="text-xs text-[#888]">
                Skenovanie Magic Bytes, štruktúry objektov, EXIF metadát a
                finančných tokov.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 rounded-2xl bg-surface-subtle border border-border group-hover:border-brand/40 group-hover:scale-110 transition-all duration-300 shadow-sm">
              <UploadCloud className="h-10 w-10 text-brand" />
            </div>

            <div className="space-y-1.5 max-w-lg">
              <h3 className="text-lg font-bold tracking-tight text-white">
                Vhoďte podozrivý súbor do Forenzného Sandboxu
              </h3>
              <p className="text-xs sm:text-sm text-[#888] leading-relaxed">
                Okamžitá dekompozícia vnútornej štruktúry, revízií, skrytých
                skriptov, metadát a bankových tokov.
              </p>
            </div>

            {/* Podporované odznaky formátov */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.04] border border-border text-[#DDD]">
                <FileText className="h-3.5 w-3.5 text-danger" /> PDF
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.04] border border-border text-[#DDD]">
                <ImageIcon className="h-3.5 w-3.5 text-brand" /> PNG / WEBP /
                JPG
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.04] border border-border text-[#DDD]">
                <FileSpreadsheet className="h-3.5 w-3.5 text-success" /> DOCX /
                XLSX
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.04] border border-border text-[#DDD]">
                <FolderArchive className="h-3.5 w-3.5 text-warning" /> ZIP
                Archívy
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Rýchle načítanie forenzných demo vzoriek */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-2 text-xs text-[#777]">
        <span className="flex items-center gap-1.5 font-medium">
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          Rýchle testovacie forenzné vzorky:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onLoadDemo("pdf_tampered")}
            disabled={isAnalyzing}
            className="px-3 py-1 rounded-lg bg-surface border border-border hover:border-brand hover:text-white transition-colors cursor-pointer text-[11px]"
          >
            Faktúra s 2x %%EOF (PDF)
          </button>
          <button
            type="button"
            onClick={() => onLoadDemo("docx_hidden")}
            disabled={isAnalyzing}
            className="px-3 py-1 rounded-lg bg-surface border border-border hover:border-brand hover:text-white transition-colors cursor-pointer text-[11px]"
          >
            Zmluva s makrom (DOCX)
          </button>
          <button
            type="button"
            onClick={() => onLoadDemo("img_photoshop")}
            disabled={isAnalyzing}
            className="px-3 py-1 rounded-lg bg-surface border border-border hover:border-brand hover:text-white transition-colors cursor-pointer text-[11px]"
          >
            Sken z Photoshopu (PNG)
          </button>
        </div>
      </div>
    </div>
  );
}
