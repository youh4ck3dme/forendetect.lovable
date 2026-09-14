import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { AppHeader, PhoneFrame, Screen } from "@/components/malte/Shell";
import ForensicSandboxZone from "@/components/forensic/ForensicSandboxZone";
import ForensicReport from "@/components/forensic/ForensicReport";
import {
  dissectFile,
  type ForensicAnalysisResult,
} from "@/forensic/sandbox/forensic-engine";

export const Route = createFileRoute("/_authenticated/sandbox")({
  head: () => ({
    meta: [
      { title: "Forenzný Sandbox — Forendo" },
      {
        name: "description",
        content:
          "Lokálna forenzná analýza PDF, obrázkov, OpenXML dokumentov a ZIP archívov.",
      },
    ],
  }),
  component: ForensicSandbox,
});

type DemoType = "pdf_tampered" | "docx_hidden" | "img_photoshop";

function createDemoFile(type: DemoType): File {
  if (type === "pdf_tampered") {
    const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog >>
endobj
BT
(FAKTURA 2026/0891 IBAN SK3111000000002948112001 Suma 450 000 EUR) Tj
ET
%%EOF
% INKREMENTALNA ZMENA - POSLAT DO PANAMY
BT
(IBAN SK9988000000001122334455 Provizia 90 000 EUR) Tj
ET
%%EOF`;
    return new File([content], "podozriva_faktura_revidovana.pdf", {
      type: "application/pdf",
    });
  }

  if (type === "docx_hidden") {
    return new File(
      [
        "ZMLUVA O SPOLUPRACI. Schrankova Consulting s.r.o. ICO: 35891102. ",
        "Odmena 1 250 000 EUR. Bankovy ucet SK8802000000009988776655. ",
        "VBA makro offshore fond.",
      ],
      "zmluva_poradenstvo_makra.docx",
      {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    );
  }

  return new File(
    [
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      new TextEncoder().encode("Adobe Photoshop export"),
    ],
    "upraveny_sken_zmluvy.png",
    { type: "image/png" },
  );
}

function ForensicSandbox() {
  const [result, setResult] = useState<ForensicAnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze(file: File) {
    setBusy(true);
    setError(null);
    try {
      setResult(await dissectFile(file));
    } catch (cause) {
      console.error("Forenzná analýza zlyhala", cause);
      setError(
        "Súbor sa nepodarilo analyzovať. Skontrolujte jeho formát a integritu.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <PhoneFrame>
      <AppHeader title="Forenzný Sandbox" back />
      <Screen>
        {error ? (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            {error}
          </div>
        ) : null}

        {!result ? (
          <>
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
                Analýza prebieha lokálne v prehliadači
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Súbory sa neposielajú na server. Výsledok môžete následne uložiť
                do aktívneho prípadu.
              </p>
            </div>
            <ForensicSandboxZone
              onFileSelect={analyze}
              onLoadDemo={(type) => void analyze(createDemoFile(type))}
              isAnalyzing={busy}
            />
          </>
        ) : (
          <ForensicReport
            result={result}
            isAiLoading={false}
            onReset={() => setResult(null)}
          />
        )}
      </Screen>
    </PhoneFrame>
  );
}
