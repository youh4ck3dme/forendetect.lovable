import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppHeader, Card, PhoneFrame, Screen } from "@/components/malte/Shell";
import { Button } from "@/components/ui/button";

type Report = {
  name: string;
  message: string;
  risk: number;
};

export const Route = createFileRoute("/_authenticated/sandbox")({
  component: ForensicSandbox,
});

function ForensicSandbox() {
  const [report, setReport] = useState<Report | null>(null);

  async function inspect(file: File) {
    const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const signature = Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join(" ");
    const isPdf = signature.startsWith("25 50 44 46");
    const message = isPdf
      ? "PDF hlavička bola overená."
      : `Súbor má príponu ${file.name.split(".").pop() ?? "neznámu"}, ale magic bytes nezodpovedajú PDF.`;
    setReport({ name: file.name, message, risk: isPdf ? 12 : 78 });
  }

  function loadDemo() {
    setReport({
      name: "faktura-2x-eof.pdf",
      message: "Detegované dve %%EOF revízie PDF dokumentu.",
      risk: 64,
    });
  }

  return (
    <PhoneFrame>
      <AppHeader title="Forenzný Sandbox" brand />
      <Screen>
        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Analýza súboru</h2>
              <p className="text-sm text-muted-foreground">
                Lokálna kontrola magic bytes a základných anomálií súborov.
              </p>
            </div>
            <input
              id="sandbox-file-input"
              type="file"
              className="block w-full rounded-lg border border-border bg-card p-2 text-sm"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void inspect(file);
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={loadDemo}>
                Faktúra s 2x %%EOF
              </Button>
              <Button type="button" variant="outline" onClick={loadDemo}>
                Zmluva s makrom
              </Button>
              <Button type="button" variant="outline" onClick={loadDemo}>
                Sken z Photoshopu
              </Button>
            </div>
          </div>
        </Card>
        {report ? (
          <Card>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Forenzný Index Rizika</h2>
              <p className="text-sm font-medium">{report.name}</p>
              <p className="text-sm text-muted-foreground">{report.message}</p>
              <p className="text-sm font-semibold">Skóre: {report.risk}/100</p>
            </div>
          </Card>
        ) : null}
      </Screen>
    </PhoneFrame>
  );
}
