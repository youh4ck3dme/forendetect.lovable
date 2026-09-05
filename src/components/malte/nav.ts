import {
  Crosshair,
  FolderKanban,
  LayoutGrid,
  LineChart,
  MoreHorizontal,
  Network,
  FileUp,
  Plug,
  Bot,
  Scale,
  CreditCard,
  ShieldCheck,
  Share2,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { to: string; label: string; icon: LucideIcon };

export const navItems: NavItem[] = [
  { to: "/prehlad", label: "Prehľad", icon: LayoutGrid },
  { to: "/analyza-vypisov", label: "Analýza", icon: LineChart },
  { to: "/osoby", label: "Osoby", icon: Users },
  { to: "/vztahy", label: "Vzťahy", icon: Network },
  { to: "/viac", label: "Viac", icon: MoreHorizontal },
];

export const secondaryItems: NavItem[] = [
  { to: "/pripady", label: "Prípady", icon: FolderKanban },
  { to: "/import-csv", label: "Import CSV", icon: FileUp },
  { to: "/asistent", label: "AI asistent", icon: Bot },
  { to: "/siet", label: "Sieť tokov", icon: Share2 },
  { to: "/zbrane", label: "Zbrane", icon: Crosshair },
  { to: "/pravny-kontext", label: "Právny kontext", icon: Scale },
  { to: "/predplatne", label: "Predplatné", icon: CreditCard },
  { to: "/sukromie", label: "Súkromie a podmienky", icon: ShieldCheck },
  { to: "/mcp-info", label: "Agentné API", icon: Plug },
];
