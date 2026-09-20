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
import { idbDelete, idbGet, idbSet, caseStateKey } from "@/lib/idb";
import { supabase } from "@/integrations/supabase/client";
import { DEV_MOCK_USER, isDevFreeEntryActive } from "@/lib/dev-auth";
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
export const DEFAULT_THEME: ThemeMode = "light";

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

/** Predvolená téma je svetlá; uložené "system" sa správa ako light. */
export function resolveTheme(theme: ThemeMode | null | undefined): ThemeMode {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  return DEFAULT_THEME;
}

export function applyDocumentTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const dark = resolveTheme(theme) === "dark";
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

function persistResolvedTheme(theme: ThemeMode) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

function getInitialTheme(): ThemeMode {
  const stored = readStoredTheme();
  const theme = resolveTheme(stored);
  if (stored === "system") persistResolvedTheme(theme);
  return theme;
}

const EMPTY: CaseState = {
  riskFilter: [],
  reviewed: [],
  runLog: [],
  exports: 0,
  theme: getInitialTheme(),
};

function resolveStoreUserId(): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (isDevFreeEntryActive()) return Promise.resolve(DEV_MOCK_USER.id);
  return supabase.auth
    .getUser()
    .then(({ data }) => data.user?.id ?? null)
    .catch(() => null);
}

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
  const [userId, setUserId] = useState<string | null>(null);
  const storageKey = userId ? caseStateKey(userId) : null;

  useLayoutEffect(() => {
    let active = true;
    void resolveStoreUserId().then((id) => {
      if (active) setUserId(id);
    });
    if (isDevFreeEntryActive()) {
      return () => {
        active = false;
      };
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useLayoutEffect(() => {
    let active = true;
    if (!storageKey) {
      setState((prev) => ({ ...EMPTY, theme: prev.theme }));
      setReady(true);
      return () => {
        active = false;
      };
    }
    setReady(false);
    idbGet<CaseState>(storageKey)
      .then((stored) => {
        if (!active) return;
        const lsTheme = readStoredTheme();
        if (stored) {
          const theme = resolveTheme(lsTheme ?? stored.theme);
          if (!lsTheme || lsTheme === "system") {
            persistResolvedTheme(theme);
          }
          setState({ ...EMPTY, ...stored, theme });
        } else {
          setState((prev) => {
            const theme = resolveTheme(lsTheme ?? prev.theme);
            if (lsTheme === "system") persistResolvedTheme(theme);
            return { ...EMPTY, theme };
          });
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [storageKey]);

  const update = useCallback(
    (next: (prev: CaseState) => CaseState) => {
      setState((prev) => {
        const value = next(prev);
        if (storageKey) {
          void idbSet(storageKey, value).catch(() => undefined);
        }
        return value;
      });
    },
    [storageKey],
  );

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
        if (storageKey) {
          void idbDelete(storageKey).catch(() => undefined);
        }
        setState(EMPTY);
      },
    }),
    [state, ready, update, storageKey],
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
