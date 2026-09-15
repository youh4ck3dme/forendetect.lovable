import {
  Bot,
  Crosshair,
  CreditCard,
  FileUp,
  FolderKanban,
  LayoutGrid,
  LineChart,
  MoreHorizontal,
  Network,
  Plug,
  Radar,
  Scale,
  Share2,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Krátky opis — iba tam, kde samotný názov nestačí. */
  hint?: string;
};

/** Spodná sticky lišta na mobile — vždy presne päť položiek. */
export const navItems: NavItem[] = [
  { to: "/prehlad", label: "Prehľad", icon: LayoutGrid },
  { to: "/analyza-vypisov", label: "Analýza", icon: LineChart },
  { to: "/osoby", label: "Osoby", icon: Users },
  { to: "/vztahy", label: "Vzťahy", icon: Network },
  { to: "/viac", label: "Viac", icon: MoreHorizontal },
];

export type NavGroupId = "pripad" | "vysetrovanie" | "asistencia" | "system";

export type NavGroup = { id: NavGroupId; label: string; items: NavItem[] };

/** Štyri stabilné kategórie — rovnaké na mobile aj na desktope. */
export const navGroups: NavGroup[] = [
  {
    id: "pripad",
    label: "Prípad",
    items: [
      { to: "/prehlad", label: "Prehľad", icon: LayoutGrid },
      { to: "/pripady", label: "Prípady", icon: FolderKanban },
      { to: "/import-csv", label: "Import údajov", icon: FileUp, hint: "CSV výpisy" },
    ],
  },
  {
    id: "vysetrovanie",
    label: "Vyšetrovanie",
    items: [
      { to: "/analyza-vypisov", label: "Analýza transakcií", icon: LineChart },
      { to: "/osoby", label: "Osoby a firmy", icon: Users },
      { to: "/vztahy", label: "Vzťahy", icon: Network },
      { to: "/siet", label: "Sieť tokov", icon: Share2 },
      { to: "/zbrane", label: "Zbrane", icon: Crosshair },
    ],
  },
  {
    id: "asistencia",
    label: "Asistencia",
    items: [
      { to: "/asistent", label: "AI asistent", icon: Bot },
      { to: "/agent", label: "Vyšetrovací agent", icon: Radar },
      { to: "/pravny-kontext", label: "Právny kontext", icon: Scale },
    ],
  },
  {
    id: "system",
    label: "Účet a systém",
    items: [
      { to: "/viac", label: "Účet a systém", icon: ShieldCheck, hint: "Vzhľad, výstupy, odhlásenie" },
      { to: "/predplatne", label: "Predplatné", icon: CreditCard },
      { to: "/sukromie", label: "Súkromie a podmienky", icon: ShieldCheck },
      { to: "/mcp-info", label: "Agentné API", icon: Plug, hint: "Prepojenie s AI klientmi" },
      { to: "/connect", label: "Pripojiť AI asistenta", icon: Plug, hint: "Návod krok za krokom" },
    ],
  },
];

export function navGroup(id: NavGroupId): NavGroup {
  return navGroups.find((g) => g.id === id)!;
}

/** Plochý zoznam všetkých cieľov — pre príkazovú paletu a testy. */
export const allNavItems: NavItem[] = navGroups.flatMap((g) => g.items);
