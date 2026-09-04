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
import { addEntity, createCase, deleteCase, deleteEntity } from "@/lib/case-data";

export const Route = createFileRoute("/_authenticated/pripady")({
  head: () => ({
    meta: [
      { title: "Prípady — Malte" },
      {
        name: "description",
        content: "Vytvárajte prípady, pridávajte osoby a firmy a prepínajte medzi vyšetrovaniami.",
      },
      { property: "og:title", content: "Prípady — Malte" },
      { property: "og:description", content: "Správa vašich forenzných prípadov v Malte." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cases,
});

const inputClass =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

function Cases() {
  const { cases, activeCaseId, setActiveCaseId, activeCase, hasCase, refresh } = useActiveCase();
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [entityName, setEntityName] = useState("");
  const [entityKind, setEntityKind] = useState<"person" | "company">("person");
  const [entityRole, setEntityRole] = useState("");
  const [busy, setBusy] = useState(false);

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

  async function handleDeleteCase(id: string) {
    setBusy(true);
    try {
      await deleteCase(id);
      if (activeCaseId === id) setActiveCaseId(null);
      refresh();
      toast.success("Prípad zmazaný.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mazanie zlyhalo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddEntity(event: React.FormEvent) {
    event.preventDefault();
    if (!activeCaseId || !entityName.trim()) return;
    setBusy(true);
    try {
      await addEntity(activeCaseId, {
        name: entityName.trim(),
        kind: entityKind,
        role: entityRole.trim(),
      });
      setEntityName("");
      setEntityRole("");
      refresh();
      toast.success("Subjekt pridaný.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pridanie zlyhalo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteEntity(id: string) {
    setBusy(true);
    try {
      await deleteEntity(id);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mazanie zlyhalo.");
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
        </Card>

        <SectionTitle>Vaše prípady</SectionTitle>
        {cases.length === 0 ? (
          <EmptyState
            icon={FolderPlus}
            title="Zatiaľ žiadne prípady"
            detail="Vytvorte prvý prípad a pridajte doň subjekty a transakcie."
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
                <button
                  type="button"
                  aria-label={`Zmazať prípad ${item.name}`}
                  disabled={busy}
                  onClick={() => handleDeleteCase(item.id)}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </Card>
            ))}
          </div>
        )}

        {hasCase ? (
          <>
            <SectionTitle>Subjekty v prípade {activeCase.name}</SectionTitle>
            <Card className="space-y-3">
              <form className="space-y-2" onSubmit={handleAddEntity}>
                <input
                  aria-label="Meno alebo názov"
                  placeholder="Meno osoby alebo názov firmy"
                  className={inputClass}
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                />
                <input
                  aria-label="Rola v prípade"
                  placeholder="Rola v prípade (nepovinné)"
                  className={inputClass}
                  value={entityRole}
                  onChange={(e) => setEntityRole(e.target.value)}
                />
                <div className="flex gap-2">
                  {(["person", "company"] as const).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      aria-pressed={entityKind === kind}
                      onClick={() => setEntityKind(kind)}
                      className={
                        entityKind === kind
                          ? "h-9 flex-1 rounded-xl border border-transparent gradient-brand text-xs font-medium"
                          : "h-9 flex-1 rounded-xl border border-border bg-card text-xs font-medium text-muted-foreground"
                      }
                    >
                      {kind === "person" ? "Osoba" : "Firma"}
                    </button>
                  ))}
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  Pridať subjekt
                </Button>
              </form>
            </Card>

            {activeCase.entities.length === 0 ? (
              <EmptyState
                title="Prípad je zatiaľ prázdny"
                detail="Pridajte prvý subjekt, aby sa spustili detektory."
              />
            ) : (
              <div className="space-y-2">
                {activeCase.entities.map((entity) => (
                  <Card key={entity.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{entity.name}</p>
                      <p className="text-caption">
                        {entity.kind === "company" ? "Firma" : "Osoba"}
                        {entity.role ? ` • ${entity.role}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Zmazať subjekt ${entity.name}`}
                      disabled={busy}
                      onClick={() => handleDeleteEntity(entity.id)}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : null}
      </Screen>
      <BottomNav />
    </PhoneFrame>
  );
}
