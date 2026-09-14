import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, X } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import forendoPegasus from "@/assets/forendo-pegasus.png.asset.json";
import {
  CommandPalette,
  CommandPaletteTrigger,
} from "@/components/malte/CommandPalette";
import { ThemeToggle } from "@/components/malte/ThemeToggle";
import { NotificationsBell } from "@/components/malte/NotificationsBell";
import { navItems, secondaryItems } from "@/components/malte/nav";
import { severityLabel } from "@/forensic";
import { useActiveCase } from "@/hooks/useActiveCase";

function DesktopSidebar() {
  const { activeCase, analysis } = useActiveCase();
  const shellAnalysis = analysis;
  const criticalCount = analysis.alerts.filter(
    (a) => a.severity === "critical",
  ).length;

  return (
    <aside className="sticky top-0 hidden h-screen w-[288px] shrink-0 flex-col border-r border-border bg-card px-4 py-6 lg:flex">
      <div className="flex items-center gap-2 px-2">
        <img
          src={forendoPegasus.url}
          alt=""
          width={30}
          height={30}
          className="h-7 w-7 object-contain"
          aria-hidden
        />
        <span className="text-lg font-extrabold tracking-tight">Forendo</span>
        <span className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <NotificationsBell />
        </span>
      </div>

      <div className="mt-6 rounded-2xl liquid-glass-header p-4 text-white shadow-glow">
        <p className="text-[10px] tracking-wide uppercase font-semibold text-blue-200">
          Prebiehajúci prípad
        </p>
        <p className="mt-1 text-sm font-bold text-white">{activeCase.name}</p>
        <div className="mt-3 flex items-end justify-between">
          <span className="text-xs font-semibold text-blue-100">
            {severityLabel[shellAnalysis.caseLevel].toUpperCase()}
          </span>
          <span className="text-sm font-bold tnum text-white">
            {shellAnalysis.caseScore}
            <span className="text-blue-200">/100</span>
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-amber-400 shadow-xs transition-[width] duration-700"
            style={{ width: `${shellAnalysis.caseScore}%` }}
          />
        </div>
      </div>

      <div className="mt-5">
        <CommandPaletteTrigger />
      </div>

      <nav aria-label="Hlavná navigácia" className="mt-5 flex-1 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            activeProps={{
              className: "bg-accent text-accent-foreground font-semibold",
            }}
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
            activeProps={{
              className: "bg-accent text-accent-foreground font-semibold",
            }}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>

      <p className="px-3 pt-4 text-[10px] text-muted-foreground">
        Forendo v1.0 • vaše prípady sú súkromné
      </p>
    </aside>
  );
}

/** Responzívny shell: telefónny rám na mobile, pracovná plocha na desktope. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isFirstRender = useRef(true);

  /**
   * Po zmene stránky presunie fokus na hlavný obsah (nie do sticky menu),
   * aby tabulátor pokračoval od obsahu a nezacyklil sa v navigácii.
   * Pri prvom načítaní fokus nemení — necháme ho na dokumente.
   */
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const main = document.getElementById("main-content");
    main?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background lg:flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-100 focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-elevated focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
      >
        Preskočiť na hlavný obsah
      </a>
      <DesktopSidebar />
      <div className="flex min-w-0 flex-1 justify-center py-0 sm:px-4 sm:py-10 lg:px-6 lg:py-8">
        <div className="w-full min-w-0 max-w-[min(100%,560px)] sm:overflow-hidden sm:rounded-[2.5rem] sm:border sm:border-border sm:bg-card sm:shadow-elevated lg:max-w-[min(100%,1180px)] lg:rounded-3xl xl:max-w-[min(100%,1320px)] 2xl:max-w-[min(100%,1480px)]">
          <div className="relative flex min-h-screen flex-col sm:min-h-215 lg:min-h-[calc(100vh-4rem)]">
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
      setNow(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold text-primary-foreground tnum lg:hidden">
      <span suppressHydrationWarning>{now || "\u00a0"}</span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-2 w-3 rounded-[2px] bg-primary-foreground/80" />
        <span className="inline-block h-2 w-2 rounded-full bg-primary-foreground/80" />
        <span className="inline-block h-2 w-5 rounded-[3px] border border-primary-foreground/80" />
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
        "liquid-glass-header sticky top-0 z-20 rounded-b-[1.75rem] text-white transition-[padding,box-shadow] duration-300",
        scrolled ? "pb-3 shadow-elevated" : "pb-5",
      )}
    >
      <StatusBar />
      <div className="flex items-center gap-3 px-5 pt-2 pb-3 lg:pt-4">
        {back ? (
          <button
            type="button"
            onClick={() => window.history.back()}
            aria-label="Späť"
            className="flex h-11 w-11 items-center justify-center rounded-full text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/15 active:scale-90 transition-all"
          >
            <ChevronLeft className="h-5 w-5 opacity-90" aria-hidden />
          </button>
        ) : null}
        {brand ? (
          <img
            src={forendoPegasus.url}
            alt="Forendo"
            width={28}
            height={28}
            className="h-7 w-7 object-contain lg:hidden"
          />
        ) : null}
        <h1
          className={cn(
            "font-semibold tracking-tight text-white transition-all duration-300",
            scrolled ? "text-base" : "text-lg lg:text-xl",
          )}
        >
          {title}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <span className="lg:hidden">
            <ThemeToggle />
          </span>
          {actions ?? <NotificationsBell />}
        </div>
      </div>
      <div
        className={cn(
          "origin-top transition-all duration-300",
          scrolled
            ? "pointer-events-none max-h-0 scale-y-95 opacity-0"
            : "max-h-105 opacity-100",
        )}
      >
        {children}
      </div>
    </header>
  );
}

/** Vysúvací panel zospodu s nástrojmi — mobilná náhrada desktopového sidebaru. */
function MobileMoreSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Zavrieť panel nástrojov"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nástroje"
        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-lg rounded-t-[1.75rem] border-t border-border bg-card shadow-elevated animate-[sheet-up_0.25s_ease-out] max-h-[80vh] overflow-y-auto"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h2 className="text-base font-bold tracking-tight">Nástroje</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Zavrieť"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground active:scale-90 transition-all"
          >
            <X className="h-4.5 w-4.5" aria-hidden />
          </button>
        </div>
        <ul className="grid grid-cols-3 gap-2 px-4 pb-6 pt-1">
          {secondaryItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate({ to });
                }}
                className="group flex w-full flex-col items-center gap-2 rounded-2xl border border-border/60 liquid-glass-card px-2 py-4 text-center transition-all hover:border-primary/40 hover:shadow-card active:scale-95"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon
                    className="h-5 w-5 transition-transform duration-200 group-active:scale-90"
                    aria-hidden
                  />
                </span>
                <span className="text-[11px] font-semibold leading-tight">
                  {label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function BottomNav() {
  const { analysis } = useActiveCase();
  const [moreOpen, setMoreOpen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const criticalCount = analysis.alerts.filter(
    (a) => a.severity === "critical",
  ).length;

  /** Šípky/Home/End presúvajú fokus medzi položkami spodného menu. */
  const onKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>("[data-navitem]") ?? [],
    );
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    let next = current;
    if (event.key === "ArrowRight") next = (current + 1) % items.length;
    if (event.key === "ArrowLeft")
      next = (current - 1 + items.length) % items.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = items.length - 1;
    if (next < 0) next = 0;
    event.preventDefault();
    items[next]?.focus();
  };

  const itemClass =
    "group relative flex w-full min-h-11 flex-col items-center justify-center gap-1 rounded-xl py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

  return (
    <>
      <nav
        aria-label="Spodná navigácia"
        className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[560px] border-t border-border surface-glass px-2 pt-2 shadow-elevated lg:hidden"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <ul
          ref={listRef}
          onKeyDown={onKeyDown}
          className="flex items-stretch justify-between"
        >
          {navItems.map(({ to, label, icon: Icon }) =>
            to === "/viac" ? (
              <li key={to} className="flex-1">
                <button
                  type="button"
                  data-navitem
                  onClick={() => setMoreOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={moreOpen}
                  aria-label={`${label} — ďalšie nástroje`}
                  className={itemClass}
                >
                  <span className="relative">
                    <Icon
                      className="h-5 w-5 transition-transform duration-200 group-active:scale-90"
                      aria-hidden
                    />
                  </span>
                  {label}
                </button>
              </li>
            ) : (
              <li key={to} className="flex-1">
                <Link
                  to={to}
                  data-navitem
                  className={itemClass}
                  activeOptions={{ exact: to === "/" }}
                  activeProps={{
                    className:
                      "!text-foreground font-semibold [&_[data-ind]]:opacity-100",
                    "aria-current": "page",
                  }}
                >
                  <span className="relative">
                    <Icon
                      className="h-5 w-5 transition-transform duration-200 group-active:scale-90"
                      aria-hidden
                    />
                    {to === "/prehlad" && criticalCount > 0 ? (
                      <span
                        className="absolute -top-1 -right-2 rounded-full bg-risk-high px-1 text-[9px] font-bold text-risk-high-foreground tnum"
                        aria-label={`${criticalCount} kritických nálezov`}
                      >
                        {criticalCount}
                      </span>
                    ) : null}
                  </span>
                  {label}
                  <span
                    data-ind
                    aria-hidden
                    className="absolute -top-2 h-1 w-8 rounded-full bg-foreground opacity-0 transition-opacity duration-300"
                  />
                </Link>
              </li>
            ),
          )}
        </ul>
      </nav>
      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}


export function Screen({ children }: { children: ReactNode }) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="stagger-children min-w-0 flex-1 space-y-4 overflow-x-hidden px-4 py-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] outline-none sm:px-5 lg:px-8 lg:py-6 lg:pb-6"
    >
      {children}
    </main>
  );
}

export function Card({
  children,
  className,
  onClick,
  id,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-2xl border border-border/80 liquid-glass-card p-4 shadow-card transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-elevated hover:border-primary/40",
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

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-1 pt-1">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">
        {children}
      </h2>
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
