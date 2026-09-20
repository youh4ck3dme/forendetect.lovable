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
import { isDevFreeEntryActive } from "@/lib/dev-auth";

const DEV_REGISTRY_MESSAGE =
  "IČO Atlas v demo režime nie je pripojený na živý register. Prihláste sa e-mailom.";

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
  const [isSearchingIco, setIsSearchingIco] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] = useState<{
    snapshotId: string;
    profile: import("@/forensic").CompanyRegistryProfile;
  } | null>(null);

  const handleIcoSearch = async () => {
    const trimmed = icoInput.trim();
    if (!trimmed) {
      const { toast } = await import("sonner");
      toast.error("Zadajte platné IČO.");
      return;
    }
    if (!activeCase?.id) {
      const { toast } = await import("sonner");
      toast.error("Nie je vybratý aktívny prípad.");
      return;
    }
    if (isDevFreeEntryActive()) {
      const { toast } = await import("sonner");
      toast.error(DEV_REGISTRY_MESSAGE);
      return;
    }
    setIsSearchingIco(true);
    try {
      const { lookupCompanyRegistryByIco } =
        await import("@/lib/registry.functions");
      const res = await lookupCompanyRegistryByIco({
        data: { caseId: activeCase.id, ico: trimmed, country: "SK" },
      });
      if (res.ok && res.profile && res.snapshotId) {
        setPreviewSnapshot({
          snapshotId: res.snapshotId,
          profile: res.profile,
        });
        const { toast } = await import("sonner");
        toast.success(
          "Profil subjektu bol overený a načítaný ako nemenný snapshot.",
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "neznáma chyba";
      const { toast } = await import("sonner");
      toast.error(`Vyhľadanie zlyhalo: ${message}`);
    } finally {
      setIsSearchingIco(false);
    }
  };

  const confirmImport = async (mode: "new" | "update") => {
    if (!previewSnapshot || !activeCase?.id) return;
    if (isDevFreeEntryActive()) {
      const { toast } = await import("sonner");
      toast.error(DEV_REGISTRY_MESSAGE);
      return;
    }
    setIsImporting(true);
    try {
      const { confirmCompanyRegistryImport } =
        await import("@/lib/registry.functions");
      const { findEntityByIco } = await import("@/forensic");
      const existingComp = findEntityByIco(
        analysis.entities.map((e) => e.entity),
        previewSnapshot.profile.ico,
      );

      await confirmCompanyRegistryImport({
        data: {
          caseId: activeCase.id,
          snapshotId: previewSnapshot.snapshotId,
          mode,
          existingEntityId:
            mode === "update" && existingComp ? existingComp.id : undefined,
        },
      });
      const { toast } = await import("sonner");
      toast.success(
        mode === "new"
          ? "Nová firma bola úspešne pridaná z registra"
          : "Firma bola aktualizovaná dátami z registra",
      );
      setPreviewSnapshot(null);
      setIcoInput("");
      refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "neznáma chyba";
      const { toast } = await import("sonner");
      toast.error(`Zápis zlyhal: ${message}`);
    } finally {
      setIsImporting(false);
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
                  ? "gradient-brand border-transparent text-white"
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
                placeholder="Zadajte IČO (napr. 31322832)"
                value={icoInput}
                disabled={isSearchingIco}
                onChange={(e) => setIcoInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleIcoSearch();
                  }
                }}
                className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              <button
                type="button"
                disabled={isSearchingIco}
                onClick={handleIcoSearch}
                className="h-9 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-opacity"
              >
                {isSearchingIco ? "Vyhľadávam..." : "Importovať z ICO Atlas"}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Zadajte IČO a importujte overený profil z registra cez Laravel ICO
              Atlas API s preverením štatutárov.
            </p>
          </div>
        </Card>

        {/* Modal Náhľadu ICO Atlas Profilu */}
        {previewSnapshot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h4 className="text-base font-bold">
                    {previewSnapshot.profile.legalName}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    IČO: {previewSnapshot.profile.ico} •{" "}
                    {previewSnapshot.profile.legalForm || "s.r.o."}
                  </p>
                </div>
                <RiskChip level="low">Overený profil</RiskChip>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground">
                    Snapshot ID:{" "}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground break-all">
                    {previewSnapshot.snapshotId}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">
                    Adresa:{" "}
                  </span>
                  <span>
                    {previewSnapshot.profile.registeredAddress || "Neuvedená"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">
                    Krajina:{" "}
                  </span>
                  <span>{previewSnapshot.profile.country}</span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">
                    Status:{" "}
                  </span>
                  <span className="font-medium text-primary">
                    {previewSnapshot.profile.status || "Aktívny"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">
                    Čas získania:{" "}
                  </span>
                  <span>
                    {new Date(
                      previewSnapshot.profile.source.capturedAt,
                    ).toLocaleString("sk-SK")}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">
                    Zdroj:{" "}
                  </span>
                  <span>
                    {previewSnapshot.profile.source.source.toUpperCase()}{" "}
                    {previewSnapshot.profile.source.sourceUrl ? (
                      <a
                        href={previewSnapshot.profile.source.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-primary ml-1"
                      >
                        (zobraziť originál)
                      </a>
                    ) : null}
                  </span>
                </div>
                {previewSnapshot.profile.source.sourceHash && (
                  <div>
                    <span className="font-semibold text-muted-foreground">
                      Hash obsahu (SHA-256):{" "}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground break-all">
                      {previewSnapshot.profile.source.sourceHash}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-border">
                  <p className="font-semibold mb-1">
                    Štatutárne orgány (
                    {previewSnapshot.profile.statutoryPersons.length}
                    ):
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                    {previewSnapshot.profile.statutoryPersons.map((sp, idx) => (
                      <li key={sp.sourcePersonId || `${sp.name}-${idx}`}>
                        <strong className="text-foreground">{sp.name}</strong> (
                        {sp.role || "konateľ"})
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="font-semibold mb-1">
                    Predmety činnosti (
                    {previewSnapshot.profile.businessActivities.length}):
                  </p>
                  <p className="text-muted-foreground">
                    {previewSnapshot.profile.businessActivities
                      .slice(0, 3)
                      .join(", ")}
                    {previewSnapshot.profile.businessActivities.length > 3
                      ? "..."
                      : ""}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex flex-col gap-2">
                <p className="text-[11px] font-semibold text-foreground text-center">
                  Potvrďte akciu s importovaným profilom:
                </p>
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => confirmImport("new")}
                  className="h-9 w-full rounded-md gradient-brand font-medium text-foreground text-xs disabled:opacity-50"
                >
                  {isImporting ? "Ukladám..." : "Vytvoriť novú firmu v prípade"}
                </button>
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => confirmImport("update")}
                  className="h-9 w-full rounded-md border border-border bg-secondary font-medium text-secondary-foreground text-xs hover:bg-secondary/80 disabled:opacity-50"
                >
                  {isImporting ? "Ukladám..." : "Aktualizovať existujúcu firmu"}
                </button>
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => setPreviewSnapshot(null)}
                  className="h-9 w-full rounded-md text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
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
