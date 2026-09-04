import { Link } from "@tanstack/react-router";
import { Bell, ChevronLeft } from "lucide-react";
import type React from "react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import malteMark from "@/assets/malte-mark.png";
import { CommandPalette, CommandPaletteTrigger } from "@/components/malte/CommandPalette";
import { ThemeToggle } from "@/components/malte/ThemeToggle";
import { navItems, secondaryItems } from "@/components/malte/nav";
import { severityLabel } from "@/forensic";
import { useActiveCase } from "@/hooks/useActiveCase";

function DesktopSidebar() {
  const { activeCase, analysis } = useActiveCase();
  const shellAnalysis = analysis;
  const criticalCount = analysis.alerts.filter((a) => a.severity === "critical").length;

  return (
    <aside className="sticky top-0 hidden h-screen w-[288px] shrink-0 flex-col border-r border-border bg-card px-4 py-6 lg:flex">
      <div className="flex items-center gap-2 px-2">
        <img src={malteMark} alt="" width={30} height={30} className="h-7 w-7" aria-hidden />
        <span className="text-lg font-extrabold tracking-tight">Malte</span>
        <span className="ml-auto">
          <ThemeToggle />
        </span>
      </div>

      <div className="mt-6 rounded-2xl gradient-brand p-4 text-foreground shadow-glow">
        <p className="text-[10px] tracking-wide uppercase opacity-80">Prebiehajúci prípad</p>
        <p className="mt-1 text-sm font-semibold">{activeCase.name}</p>
        <div className="mt-3 flex items-end justify-between">
          <span className="text-xs font-semibold">
            {severityLabel[shellAnalysis.caseLevel].toUpperCase()}
          </span>
          <span className="text-sm font-bold tnum">
            {shellAnalysis.caseScore}
            <span className="opacity-70">/100</span>
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-foreground/20">
          <div
            className="h-full rounded-full bg-risk-high transition-[width] duration-700"
            style={{ width: `${shellAnalysis.caseScore}%` }}
          />
        </div>
      </div>

      <div className="mt-5">
        <CommandPaletteTrigger />
      </div>

      <nav className="mt-5 flex-1 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            activeProps={{ className: "bg-accent text-accent-foreground font-semibold" }}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
            {to === "/prehlad" && criticalCount > 0 ? (
              <span className="ml-auto rounded-full bg-risk-high px-1.5 text-[10px] font-bold text-risk-high-foreground tnum">
                {criticalCount}
              </span>
            ) : null}
          </Link>
        ))}

        <p className="px-3 pt-5 pb-1 text-label">Nástroje</p>
        {secondaryItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeProps={{ className: "bg-accent text-accent-foreground font-semibold" }}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>

      <p className="px-3 pt-4 text-[10px] text-muted-foreground">
        Malte v1.0 • vaše prípady sú súkromné
      </p>
    </aside>
  );
}

/** Responzívny shell: telefónny rám na mobile, pracovná plocha na desktope. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background lg:flex">
      <DesktopSidebar />
      <div className="flex min-w-0 flex-1 justify-center py-0 sm:px-4 sm:py-10 lg:px-6 lg:py-8">
        <div className="w-full min-w-0 max-w-[min(100%,560px)] sm:overflow-hidden sm:rounded-[2.5rem] sm:border sm:border-border sm:bg-card sm:shadow-elevated lg:max-w-[min(100%,1180px)] lg:rounded-3xl xl:max-w-[min(100%,1320px)] 2xl:max-w-[min(100%,1480px)]">
          <div className="relative flex min-h-screen flex-col sm:min-h-[860px] lg:min-h-[calc(100vh-4rem)]">
            {children}
          </div>
        </div>
      </div>
      <CommandPalette />
    </div>
  );
}

export function StatusBar() {
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const tick = () =>
      setNow(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold text-foreground/90 tnum lg:hidden">
      <span suppressHydrationWarning>{now || "\u00a0"}</span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-2 w-3 rounded-[2px] bg-foreground/70" />
        <span className="inline-block h-2 w-2 rounded-full bg-foreground/70" />
        <span className="inline-block h-2 w-5 rounded-[3px] border border-foreground/70" />
      </span>
    </div>
  );
}

export function AppHeader({
  title,
  brand,
  actions,
  back,
  children,
}: {
  title: string;
  brand?: boolean;
  actions?: ReactNode;
  back?: boolean;
  children?: ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "gradient-brand sticky top-0 z-20 rounded-b-[1.75rem] text-foreground transition-[padding,box-shadow] duration-300",
        scrolled ? "pb-3 shadow-elevated" : "pb-5",
      )}
    >
      <StatusBar />
      <div className="flex items-center gap-3 px-5 pt-2 pb-3 lg:pt-4">
        {back ? <ChevronLeft className="h-5 w-5 opacity-90" role="img" aria-label="Späť" /> : null}
        {brand ? (
          <img src={malteMark} alt="Malte" width={28} height={28} className="h-7 w-7 lg:hidden" />
        ) : null}
        <h1
          className={cn(
            "font-semibold tracking-tight transition-all duration-300",
            scrolled ? "text-base" : "text-lg lg:text-xl",
          )}
        >
          {title}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="lg:hidden">
            <ThemeToggle />
          </span>
          {actions ?? <Bell className="h-5 w-5 opacity-90" role="img" aria-label="Upozornenia" />}
        </div>
      </div>
      <div
        className={cn(
          "origin-top transition-all duration-300",
          scrolled
            ? "pointer-events-none max-h-0 scale-y-95 opacity-0"
            : "max-h-[420px] opacity-100",
        )}
      >
        {children}
      </div>
    </header>
  );
}

export function BottomNav() {
  const { analysis } = useActiveCase();
  const criticalCount = analysis.alerts.filter((a) => a.severity === "critical").length;


    <nav className="sticky bottom-0 z-10 mt-auto border-t border-border surface-glass px-2 pt-2 pb-5 lg:hidden">
      <ul className="flex items-stretch justify-between">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="group relative flex flex-col items-center gap-1 rounded-xl py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "text-primary [&_[data-ind]]:opacity-100" }}
            >
              <span className="relative">
                <Icon
                  className="h-5 w-5 transition-transform duration-200 group-active:scale-90"
                  aria-hidden
                />
                {to === "/prehlad" && criticalCount > 0 ? (
                  <span className="absolute -top-1 -right-2 rounded-full bg-risk-high px-1 text-[9px] font-bold text-risk-high-foreground tnum">
                    {criticalCount}
                  </span>
                ) : null}
              </span>
              {label}
              <span
                data-ind
                className="absolute -top-2 h-1 w-8 rounded-full bg-primary opacity-0 transition-opacity duration-300"
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="stagger-children min-w-0 flex-1 space-y-4 overflow-x-hidden px-4 py-4 sm:px-5 lg:px-8 lg:py-6">
      {children}
    </main>
  );
}

export function Card({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border gradient-surface p-4 shadow-card transition-shadow duration-200",
        onClick && "cursor-pointer hover:shadow-elevated",
        className,
      )}
      {...(onClick
        ? {
            onClick,
            role: "button",
            tabIndex: 0,
            onKeyDown: (event: React.KeyboardEvent) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            },
          }
        : {})}
    >
      {children}
    </section>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1 pt-1">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">{children}</h2>
      {action}
    </div>
  );
}

export function RiskChip({
  level = "muted",
  children,
}: {
  level?: "critical" | "high" | "medium" | "low" | "muted";
  children: ReactNode;
}) {
  const styles = {
    critical: "bg-risk-high text-risk-high-foreground",
    high: "bg-risk-high/12 text-risk-high",
    medium: "bg-risk-medium/15 text-risk-medium",
    low: "bg-risk-low/15 text-risk-low",
    muted: "bg-foreground/15 text-foreground",
  }[level];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap",
        styles,
      )}
    >
      {children}
    </span>
  );
}
