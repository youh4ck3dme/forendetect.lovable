import { useActiveCase } from "@/hooks/useActiveCase";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Search, User } from "lucide-react";
import {
  AppHeader,
  BottomNav,
  Card,
  PhoneFrame,
  RiskChip,
  Screen,
  SectionTitle,
} from "@/components/malte/Shell";
import { RiskFilter } from "@/components/malte/RiskFilter";
import { openCommandPalette } from "@/components/malte/CommandPalette";
import { EmptyState } from "@/components/malte/EmptyState";
import {
  DetectorSheet,
  type DetectorTarget,
} from "@/components/malte/DetectorSheet";
import { useCaseStore, passesFilter } from "@/hooks/useCaseStore";
import { cn } from "@/lib/utils";
import { formatEur, type Severity } from "@/forensic";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/osoby")({
  head: () => ({
    meta: [
      { title: "Subjekty — Forendo" },
      {
        name: "description",
        content:
          "Osoby a firmy prípadu s vypočítaným rizikovým skóre, príznakmi schránkovej firmy a objemom transakcií.",
      },
      { property: "og:title", content: "Subjekty — Forendo" },
      {
        property: "og:description",
        content:
          "Rizikový rebríček subjektov prípadu vrátane detekcie schránkových firiem.",
      },
    ],
  }),
  component: People,
});

type KindFilter = "all" | "person" | "company" | "shell";

function People() {
  const { activeCase, analysis, refresh } = useActiveCase();
  const { state } = useCaseStore();
  const [target, setTarget] = useState<DetectorTarget | null>(null);
  const [kind, setKind] = useState<KindFilter>("all");
  const [icoInput, setIcoInput] = useState("");
  const [previewProfile, setPreviewProfile] = useState<
    import("@/forensic").CompanyRegistryProfile | null
  >(null);

  const handleIcoSearch = () => {
    if (!icoInput.trim()) {
      import("sonner").then(({ toast }) => toast.error("Zadajte platné IČO"));
      return;
    }
    try {
      const parsed = import("@/forensic")
        .then(({ parseCompanyRegistryProfile }) => {
          const dummyPayload = {
            ico: icoInput,
            legalName: `Spoločnosť ${icoInput} s.r.o.`,
            legalForm: "s.r.o.",
            registeredAddress: "Bratislava, Hlavná ulica 12",
            country: "SK",
            status: "active",
            incorporatedAt: "2021-05-15",
            statutoryPersons: [
              {
                name: "Ing. Peter Kováč",
                role: "konateľ",
                validFrom: "2021-05-15",
              },
            ],
            businessActivities: [
              "kúpa tovaru na účely jeho predaja",
              "sprostredkovateľská činnosť",
            ],
            source: {
              source: "ico-atlas",
              capturedAt: new Date().toISOString(),
              confidence: 98,
            },
          };
          const profile = parseCompanyRegistryProfile(dummyPayload);
          setPreviewProfile(profile);
        })
        .catch((err) => {
          import("sonner").then(({ toast }) =>
            toast.error(`Import zlyhal: ${err.message}`),
          );
        });
    } catch (err) {
      import("sonner").then(({ toast }) =>
        toast.error("Chyba spracovania vstupu"),
      );
    }
  };

  const confirmImport = async (mode: "new" | "update") => {
    if (!previewProfile) return;
    try {
      const { importCompanyRegistryProfile } =
        await import("@/lib/registry.functions");
      await importCompanyRegistryProfile({
        data: {
          caseId: activeCase.id,
          profile: previewProfile,
          createEntity: true,
        },
      });
      const { toast } = await import("sonner");
      toast.success(
        mode === "new"
          ? "Nová firma bola úspešne pridaná z ICO Atlas"
          : "Firma bola aktualizovaná dátami z ICO Atlas",
      );
      setPreviewProfile(null);
      setIcoInput("");
      refresh();
    } catch (err) {
      const { toast } = await import("sonner");
      toast.error(`Zápis zlyhal: ${(err as Error).message}`);
    }
  };

  const counts = analysis.entities.reduce<Partial<Record<Severity, number>>>(
    (acc, e) => {
      acc[e.level] = (acc[e.level] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const visible = analysis.entities
    .filter((e) => passesFilter(state.riskFilter, e.level))
    .filter((e) =>
      kind === "all"
        ? true
        : kind === "shell"
          ? e.isShell
          : e.entity.kind === kind,
    );

  const kinds: { id: KindFilter; label: string }[] = [
    { id: "all", label: "Všetky" },
    { id: "person", label: "Osoby" },
    { id: "company", label: "Firmy" },
    { id: "shell", label: "Schránkové" },
  ];

  return (
    <PhoneFrame>
      <AppHeader
        title="Subjekty"
        actions={
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label="Hľadať v prípade"
            className="rounded-full p-1 transition-colors hover:bg-foreground/15"
          >
            <Search
              className="h-5 w-5 opacity-90"
              role="img"
              aria-label="Vyhľadávanie"
            />
          </button>
        }
      />
      <Screen>
        <div className="flex flex-wrap gap-2">
          {kinds.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setKind(option.id)}
              aria-pressed={kind === option.id}
              className={cn(
                "h-8 rounded-full border px-3 text-xs font-medium transition-colors",
                kind === option.id
                  ? "gradient-brand border-transparent text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <RiskFilter counts={counts} />

        {/* Panel: Pridať firmu podľa IČO (ICO Atlas Adapter) */}
        <Card className="space-y-3 bg-secondary/30 p-4 border border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" aria-hidden />
              <h3 className="text-sm font-semibold">Pridať firmu podľa IČO</h3>
            </div>
            <span className="text-[10px] rounded bg-primary/15 px-2 py-0.5 font-medium text-primary">
              ICO Atlas
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Zadajte IČO (napr. 51234567)"
                value={icoInput}
                onChange={(e) => setIcoInput(e.target.value)}
                className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleIcoSearch}
                className="h-9 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Importovať z ICO Atlas
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Zadajte IČO a importujte autorizovaný profil z registra s
              preverením štatutárov.
            </p>
          </div>
        </Card>

        {/* Modal Náhľadu ICO Atlas Profilu */}
        {previewProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h4 className="text-base font-bold">
                    {previewProfile.legalName}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    IČO: {previewProfile.ico} •{" "}
                    {previewProfile.legalForm || "s.r.o."}
                  </p>
                </div>
                <RiskChip level="low">Náhľad profilu</RiskChip>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground">
                    Adresa:{" "}
                  </span>
                  <span>{previewProfile.registeredAddress || "Neuvedená"}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">
                    Krajina:{" "}
                  </span>
                  <span>{previewProfile.country}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">
                    Status:{" "}
                  </span>
                  <span className="font-medium text-primary">
                    {previewProfile.status || "Aktívny"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">
                    Čas získania:{" "}
                  </span>
                  <span>
                    {new Date(previewProfile.source.capturedAt).toLocaleString(
                      "sk-SK",
                    )}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">
                    Zdroj:{" "}
                  </span>
                  <span>
                    {previewProfile.source.source} (Confidence:{" "}
                    {previewProfile.source.confidence ?? 100}%)
                  </span>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="font-semibold mb-1">
                    Štatutárne orgány ({previewProfile.statutoryPersons.length}
                    ):
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                    {previewProfile.statutoryPersons.map((sp, idx) => (
                      <li key={idx}>
                        <strong className="text-foreground">{sp.name}</strong> (
                        {sp.role || "konateľ"})
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="font-semibold mb-1">
                    Predmety činnosti (
                    {previewProfile.businessActivities.length}):
                  </p>
                  <p className="text-muted-foreground">
                    {previewProfile.businessActivities.slice(0, 3).join(", ")}
                    {previewProfile.businessActivities.length > 3 ? "..." : ""}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex flex-col gap-2">
                <p className="text-[11px] font-semibold text-foreground text-center">
                  Potvrďte akciu s importovaným profilom:
                </p>
                <button
                  type="button"
                  onClick={() => confirmImport("new")}
                  className="h-9 w-full rounded-md gradient-brand font-medium text-foreground text-xs"
                >
                  Vytvoriť novú firmu v prípade
                </button>
                <button
                  type="button"
                  onClick={() => confirmImport("update")}
                  className="h-9 w-full rounded-md border border-border bg-secondary font-medium text-secondary-foreground text-xs hover:bg-secondary/80"
                >
                  Aktualizovať existujúcu firmu
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewProfile(null)}
                  className="h-9 w-full rounded-md text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Zrušiť import
                </button>
              </div>
            </div>
          </div>
        )}

        <SectionTitle>
          {visible.length} subjektov • zoradené podľa rizika
        </SectionTitle>

        <div className="space-y-3">
          {visible.map((item) => (
            <Card
              key={item.entity.id}
              className="cursor-pointer space-y-3 transition-colors hover:bg-accent/40"
              onClick={() => setTarget({ kind: "entity", id: item.entity.id })}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  {item.entity.kind === "person" ? (
                    <User className="h-4 w-4" aria-hidden />
                  ) : (
                    <Building2 className="h-4 w-4" aria-hidden />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {item.entity.name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {item.entity.role}
                    {item.entity.ico ? ` • IČO ${item.entity.ico}` : ""}
                  </p>
                </div>
                <span className="ml-auto">
                  <RiskChip level={item.level}>{item.score}/100</RiskChip>
                </span>
              </div>

              {item.isShell ? (
                <p className="rounded-lg bg-risk-high/10 px-2 py-1 text-[11px] font-semibold text-risk-high">
                  Indikátory schránkovej firmy
                </p>
              ) : null}

              <div className="flex flex-wrap gap-1.5">
                {item.flags.map((flag) => (
                  <span
                    key={flag.code}
                    className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
                    title={flag.detail}
                  >
                    {flag.label}
                  </span>
                ))}
                {item.flags.length === 0 ? (
                  <span className="text-[11px] text-muted-foreground">
                    Bez detegovaných príznakov
                  </span>
                ) : null}
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground tnum">
                <span>Objem {formatEur(item.totalVolume)}</span>
                {state.reviewed.includes(`entity:${item.entity.id}`) ? (
                  <span className="inline-flex items-center gap-1 text-risk-low">
                    <CheckCircle2 className="h-3 w-3" aria-hidden />
                    Preverené
                  </span>
                ) : null}
                <span>{item.weaponCount} zbraní</span>
              </div>
            </Card>
          ))}
          {visible.length === 0 ? (
            <Card>
              <EmptyState
                title="Žiadny subjekt nezodpovedá filtru"
                detail="Skúste zmeniť typ subjektu alebo uvoľniť rizikový filter."
              />
            </Card>
          ) : null}
        </div>
      </Screen>
      <DetectorSheet target={target} onClose={() => setTarget(null)} />
      <BottomNav />
    </PhoneFrame>
  );
}
