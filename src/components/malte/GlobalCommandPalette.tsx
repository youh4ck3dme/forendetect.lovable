import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  FileText,
  Users,
  ShieldAlert,
  Printer,
  Sparkles,
  SunMoon,
  FolderPlus,
  Scale,
  Crosshair,
  Building2,
  Lock,
} from "lucide-react";

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { useCaseStore } from "@/hooks/useCaseStore";
import { ARMIVEX_CASE_DOSSIER } from "@/lib/demo-dossier";

export function GlobalCommandPalette() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const { setTheme, state } = useCaseStore();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      {/* Trigger Button in Header */}
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center justify-between w-full max-w-xs px-3 py-1.5 text-xs text-muted-foreground bg-muted/40 hover:bg-muted/70 border border-border/60 rounded-lg transition-colors cursor-pointer shadow-xs"
        aria-label="Vyhľadať v spise (Ctrl+K)"
      >
        <span className="flex items-center gap-2 truncate">
          <Search className="h-3.5 w-3.5 text-primary/70 shrink-0" />
          <span className="truncate">Vyhľadať v spise a prípadov...</span>
        </span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border/80 bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground shadow-2xs">
          <span className="text-[9px]">Ctrl</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Zadajte meno, firmu, zbraň, paragraf alebo príkaz..." />
        <CommandList className="max-h-80 overflow-y-auto p-1">
          <CommandEmpty>Žiadne výsledky pre vyhľadávaný výraz.</CommandEmpty>

          {/* Sekcia: Osoby a Aktéri spisu */}
          <CommandGroup heading="Osoby a aktéri (Kauza Armivex)">
            <CommandItem
              onSelect={() =>
                runCommand(() =>
                  navigate({
                    to: "/asistent",
                  }),
                )
              }
              className="flex items-center gap-2 cursor-pointer"
            >
              <Users className="h-4 w-4 text-amber-500" />
              <div>
                <div className="font-semibold text-xs">Peter Novák</div>
                <div className="text-[10px] text-muted-foreground">
                  Konateľ VELTRA s.r.o. · Zbrojná licencia LA 002318 · Vkladateľ
                  v Dunajskej banke
                </div>
              </div>
            </CommandItem>

            <CommandItem
              onSelect={() =>
                runCommand(() =>
                  navigate({
                    to: "/asistent",
                  }),
                )
              }
              className="flex items-center gap-2 cursor-pointer"
            >
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <div className="font-semibold text-xs">Denis Koval</div>
                <div className="text-[10px] text-muted-foreground">
                  Sprostredkovateľ · Tavira s.r.o. · Odpočívadlá D1 · BMW 7
                  (BA-733-CM)
                </div>
              </div>
            </CommandItem>

            <CommandItem
              onSelect={() =>
                runCommand(() =>
                  navigate({
                    to: "/asistent",
                  }),
                )
              }
              className="flex items-center gap-2 cursor-pointer"
            >
              <Building2 className="h-4 w-4 text-emerald-500" />
              <div>
                <div className="font-semibold text-xs">Marek Hruška</div>
                <div className="text-[10px] text-muted-foreground">
                  Konateľ ARMIVEX s.r.o. · Žilina · Svedok predaja 242 zbraní
                </div>
              </div>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Sekcia: Zaistené zbrane a Dôkazy */}
          <CommandGroup heading="Zaistené zbrane a balistické dôkazy">
            <CommandItem
              onSelect={() =>
                runCommand(() =>
                  navigate({
                    to: "/asistent",
                  }),
                )
              }
              className="flex items-center gap-2 cursor-pointer"
            >
              <Crosshair className="h-4 w-4 text-rose-500" />
              <div>
                <div className="font-semibold text-xs">
                  Glock 19 Gen 5 (CGDV051)
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Europol Španielsko · LR &gt; 1 000 000 · Dôkaz 01 (§ 119 TP)
                </div>
              </div>
            </CommandItem>

            <CommandItem
              onSelect={() =>
                runCommand(() =>
                  navigate({
                    to: "/asistent",
                  }),
                )
              }
              className="flex items-center gap-2 cursor-pointer"
            >
              <Crosshair className="h-4 w-4 text-amber-500" />
              <div>
                <div className="font-semibold text-xs">
                  Grand Power K100 (K055902, K055904)
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Balistika KEÚ PZ · LR 1:25 000 · Zaistené v gangu
                </div>
              </div>
            </CommandItem>

            <CommandItem
              onSelect={() =>
                runCommand(() =>
                  navigate({
                    to: "/asistent",
                  }),
                )
              }
              className="flex items-center gap-2 cursor-pointer"
            >
              <Lock className="h-4 w-4 text-rose-400" />
              <div>
                <div className="font-semibold text-xs">
                  Evidenčná kniha LA 002318 (Stratená)
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Procesná mína (§ 98 TP) · Chýba písmoznalecký posudok (§ 142
                  TP)
                </div>
              </div>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Sekcia: Navigácia & Rýchle akcie */}
          <CommandGroup heading="Rýchla navigácia a akcie">
            <CommandItem
              onSelect={() =>
                runCommand(() =>
                  navigate({
                    to: "/asistent",
                  }),
                )
              }
              className="flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span>Forenzný Autopilot &amp; Spis Armivex</span>
            </CommandItem>

            <CommandItem
              onSelect={() =>
                runCommand(() =>
                  navigate({
                    to: "/pripady",
                  }),
                )
              }
              className="flex items-center gap-2 cursor-pointer"
            >
              <FileText className="h-4 w-4 text-blue-500" />
              <span>Zoznam prípadov a spisy</span>
            </CommandItem>

            <CommandItem
              onSelect={() =>
                runCommand(() =>
                  navigate({
                    to: "/vztahy",
                  }),
                )
              }
              className="flex items-center gap-2 cursor-pointer"
            >
              <Scale className="h-4 w-4 text-emerald-500" />
              <span>Mapa vzťahov &amp; Sieť entít</span>
            </CommandItem>

            <CommandItem
              onSelect={() =>
                runCommand(() =>
                  setTheme(state.theme === "dark" ? "light" : "dark"),
                )
              }
              className="flex items-center gap-2 cursor-pointer"
            >
              <SunMoon className="h-4 w-4 text-amber-400" />
              <span>
                Prepnúť tému (Svetlá / Tmavá - aktuálna: {state.theme})
              </span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
