/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { idbClear, idbGet, idbSet } from "@/lib/idb";
import type { Severity } from "@/forensic";

export type RunLogEntry = {
  id: string;
  at: number;
  target: string;
  detector: string;
  score: number;
  level: Severity;
  flagCount: number;
};

export type ThemeMode = "light" | "dark" | "system";

export type CaseState = {
  riskFilter: Severity[];
  reviewed: string[];
  runLog: RunLogEntry[];
  exports: number;
  theme: ThemeMode;
};

export const THEME_STORAGE_KEY = "malte:theme";

export function readStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system")
      return saved;
  } catch {
    // ignore
  }
  return null;
}

export function applyDocumentTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  let systemDark = false;
  try {
    systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    // ignore
  }
  const dark = theme === "dark" || (theme === "system" && systemDark);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

function getInitialTheme(): ThemeMode {
  return readStoredTheme() ?? "system";
}

const EMPTY: CaseState = {
  riskFilter: [],
  reviewed: [],
  runLog: [],
  exports: 0,
  theme: getInitialTheme(),
};
const KEY = "malte:case-state";

type Ctx = {
  state: CaseState;
  ready: boolean;
  toggleRisk: (level: Severity) => void;
  clearRisk: () => void;
  toggleReviewed: (id: string) => void;
  markAllReviewed: (ids: string[]) => void;
  clearReviewed: () => void;
  logRun: (entry: Omit<RunLogEntry, "at">) => void;
  countExport: () => void;
  setTheme: (theme: ThemeMode) => void;
  reset: () => void;
};

const CaseStoreContext = createContext<Ctx | null>(null);

export function CaseStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CaseState>(EMPTY);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    let active = true;
    idbGet<CaseState>(KEY)
      .then((stored) => {
        if (!active) return;
        const lsTheme = readStoredTheme();
        if (stored) {
          const theme = lsTheme ?? stored.theme ?? "system";
          if (!lsTheme && stored.theme) {
            try {
              localStorage.setItem(THEME_STORAGE_KEY, stored.theme);
            } catch {
              // ignore
            }
          }
          setState({ ...EMPTY, ...stored, theme });
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const update = useCallback((next: (prev: CaseState) => CaseState) => {
    setState((prev) => {
      const value = next(prev);
      void idbSet(KEY, value).catch(() => undefined);
      return value;
    });
  }, []);

  useLayoutEffect(() => {
    applyDocumentTheme(state.theme);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyDocumentTheme(state.theme);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [state.theme]);

  const value = useMemo<Ctx>(
    () => ({
      state,
      ready,
      toggleRisk: (level) =>
        update((prev) => ({
          ...prev,
          riskFilter: prev.riskFilter.includes(level)
            ? prev.riskFilter.filter((l) => l !== level)
            : [...prev.riskFilter, level],
        })),
      clearRisk: () => update((prev) => ({ ...prev, riskFilter: [] })),
      toggleReviewed: (id) =>
        update((prev) => ({
          ...prev,
          reviewed: prev.reviewed.includes(id)
            ? prev.reviewed.filter((r) => r !== id)
            : [...prev.reviewed, id],
        })),
      markAllReviewed: (ids) =>
        update((prev) => ({
          ...prev,
          reviewed: Array.from(new Set([...prev.reviewed, ...ids])),
        })),
      clearReviewed: () => update((prev) => ({ ...prev, reviewed: [] })),
      logRun: (entry) =>
        update((prev) => ({
          ...prev,
          runLog: [
            { ...entry, at: Date.now() },
            ...prev.runLog.filter((r) => r.id !== entry.id),
          ].slice(0, 30),
        })),
      countExport: () =>
        update((prev) => ({ ...prev, exports: prev.exports + 1 })),
      setTheme: (theme) => {
        try {
          localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch {
          // ignore
        }
        update((prev) => ({ ...prev, theme }));
      },
      reset: () => {
        void idbClear().catch(() => undefined);
        setState(EMPTY);
      },
    }),
    [state, ready, update],
  );

  return (
    <CaseStoreContext.Provider value={value}>
      {children}
    </CaseStoreContext.Provider>
  );
}

export function useCaseStore(): Ctx {
  const ctx = useContext(CaseStoreContext);
  if (!ctx)
    throw new Error("useCaseStore musí byť použitý v CaseStoreProvider");
  return ctx;
}

/** Vráti true, ak položka prejde aktívnym rizikovým filtrom. */
export function passesFilter(filter: Severity[], level: Severity): boolean {
  return filter.length === 0 || filter.includes(level);
}
