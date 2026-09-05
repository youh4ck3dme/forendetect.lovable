import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, FolderPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AppHeader,
  BottomNav,
  Card,
  PhoneFrame,
  Screen,
  SectionTitle,
} from "@/components/malte/Shell";
import { EmptyState } from "@/components/malte/EmptyState";
import { Button } from "@/components/ui/button";
import { useActiveCase } from "@/hooks/useActiveCase";
import { createCase } from "@/lib/case-data";
import { createDemoCase } from "@/lib/case-write.functions";
import { useServerFn } from "@tanstack/react-start";
import { BRAND } from "@/config/brand";
import { EntityForm } from "@/components/malte/CaseForms";
import { EntityList } from "@/components/malte/RecordLists";
import { DeleteRecordButton } from "@/components/malte/DeleteRecordButton";

export const Route = createFileRoute("/_authenticated/pripady")({
  head: () => ({
    meta: [
      { title: "Prípady — Forendo" },
      {
        name: "description",
        content: "Vytvárajte prípady, pridávajte osoby a firmy a prepínajte medzi vyšetrovaniami.",
      },
      { property: "og:title", content: "Prípady — Forendo" },
      { property: "og:description", content: "Správa vašich prípadov a analýz finančných tokov." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cases,
});

const inputClass =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

function Cases() {
  const { cases, activeCaseId, setActiveCaseId, activeCase, hasCase, refresh, revisions } =
    useActiveCase();
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [busy, setBusy] = useState(false);
  const makeDemo = useServerFn(createDemoCase);

  async function handleCreateDemo() {
    setBusy(true);
    try {
      const { id } = await makeDemo({ data: undefined });
      refresh();
      setActiveCaseId(id);
      toast.success("Ukážkový prípad so syntetickými dátami bol vytvorený.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ukážku sa nepodarilo vytvoriť.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateCase(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const id = await createCase({ name: name.trim(), subtitle: subtitle.trim() });
      setName("");
      setSubtitle("");
      refresh();
      setActiveCaseId(id);
      toast.success("Prípad vytvorený.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Prípad sa nepodarilo vytvoriť.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PhoneFrame>
      <AppHeader
        title="Prípady"
        actions={<FolderPlus className="h-5 w-5 opacity-90" aria-hidden />}
      />
      <Screen>
        <Card className="space-y-3">
          <h1 className="text-base font-semibold tracking-tight">Nový prípad</h1>
          <form className="space-y-2" onSubmit={handleCreateCase}>
            <input
              aria-label="Názov prípadu"
              placeholder="Názov prípadu"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              aria-label="Krátky popis"
              placeholder="Krátky popis (nepovinné)"
              className={inputClass}
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
            <Button type="submit" className="w-full" disabled={busy}>
              Vytvoriť prípad
            </Button>
          </form>
          <p className="text-[11px] text-muted-foreground">{BRAND.tagline}</p>
        </Card>

        <Card className="space-y-2">
          <p className="text-sm font-semibold">Ukážkový prípad</p>
          <p className="text-[11px] text-muted-foreground">
            Syntetické dáta bez osobných údajov, výslovne označené ako ukážka. Do vašich reálnych
            prípadov sa nikdy nepridávajú automaticky.
          </p>
          <Button variant="outline" size="sm" disabled={busy} onClick={handleCreateDemo}>
            Vytvoriť ukážkový prípad
          </Button>
        </Card>

        <SectionTitle>Vaše prípady</SectionTitle>
        {cases.length === 0 ? (
          <EmptyState
            icon={FolderPlus}
            title="Zatiaľ žiadne prípady"
            detail="Vytvorte prvý prípad a pridajte doň subjekty a transakcie — alebo si najprv pozrite ukážkový prípad."
          />
        ) : (
          <div className="space-y-2">
            {cases.map((item) => (
              <Card key={item.id} className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex-1 text-left"
                  onClick={() => setActiveCaseId(item.id)}
                >
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-caption">{item.subtitle || item.referenceDate}</p>
                </button>
                {activeCaseId === item.id ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-label="Aktívny prípad" />
                ) : null}
                <DeleteRecordButton
                  type="case"
                  id={item.id}
                  label={item.name}
                  onDeleted={() => {
                    if (activeCaseId === item.id) setActiveCaseId(null);
                    refresh();
                  }}
                />
              </Card>
            ))}
          </div>
        )}

        {hasCase ? (
          <>
            <SectionTitle>Subjekty v prípade {activeCase.name}</SectionTitle>
            <EntityForm caseId={activeCase.id} onSaved={refresh} />

            {activeCase.entities.length === 0 ? (
              <EmptyState
                title="Prípad je zatiaľ prázdny"
                detail="Pridajte prvý subjekt, aby sa spustili detektory."
              />
            ) : (
              <EntityList
                caseId={activeCase.id}
                entities={activeCase.entities}
                revisions={revisions}
                onChanged={refresh}
              />
            )}
          </>
        ) : null}
      </Screen>
      <BottomNav />
    </PhoneFrame>
  );
}
