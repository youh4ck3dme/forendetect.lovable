import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Building2, Crosshair, Receipt, Search, User } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { navItems } from "@/components/malte/nav";
import { formatEur } from "@/forensic";
import { useActiveCase } from "@/hooks/useActiveCase";

const OPEN_EVENT = "malte:command-open";

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      onClick={openCommandPalette}
      className="flex w-full items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Search className="h-3.5 w-3.5" aria-hidden />
      Hľadať v prípade…
      <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px]">
        ⌘K
      </kbd>
    </button>
  );
}

export function CommandPalette() {
  const { activeCase } = useActiveCase();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  const go = (to: string) => {
    setOpen(false);
    void navigate({ to });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Hľadať subjekt, transakciu, zbraň…" />
      <CommandList>
        <CommandEmpty>Nič sa nenašlo.</CommandEmpty>

        <CommandGroup heading="Obrazovky">
          {[
            ...navItems,
            { to: "/siet", label: "Sieť tokov", icon: Search },
          ].map(({ to, label, icon: Icon }) => (
            <CommandItem
              key={to}
              value={`obrazovka ${label}`}
              onSelect={() => go(to)}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Subjekty">
          {activeCase.entities.map((e) => (
            <CommandItem
              key={e.id}
              value={`${e.name} ${e.role}`}
              onSelect={() => go("/osoby")}
            >
              {e.kind === "person" ? (
                <User className="h-4 w-4" aria-hidden />
              ) : (
                <Building2 className="h-4 w-4" aria-hidden />
              )}
              <span>{e.name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {e.role}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Transakcie">
          {activeCase.transactions.slice(0, 12).map((t) => (
            <CommandItem
              key={t.id}
              value={`${t.description} ${t.id}`}
              onSelect={() => go("/analyza-vypisov")}
            >
              <Receipt className="h-4 w-4" aria-hidden />
              <span className="truncate">{t.description}</span>
              <span className="ml-auto text-[10px] tnum text-muted-foreground">
                {formatEur(t.amount)}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Zbrane">
          {activeCase.weapons.map((w) => (
            <CommandItem
              key={w.id}
              value={`${w.brand} ${w.model} ${w.serial}`}
              onSelect={() => go("/zbrane")}
            >
              <Crosshair className="h-4 w-4" aria-hidden />
              <span>
                {w.brand} {w.model}
              </span>
              <span className="ml-auto text-[10px] tnum text-muted-foreground">
                {w.serial}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
