export const DEV_FREE_ENTRY_KEY = "forendo:dev-free-entry";

/**
 * Zistí, či beží aplikácia v lokálnom vývojovom prostredí (localhost, 127.0.0.1, dev mode).
 */
export function isLocalDevEnvironment(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      host.endsWith(".local")
    );
  }
  return false;
}

/**
 * Overí, či používateľ aktivoval lokálny vývojársky bezplatný vstup.
 */
export function isDevFreeEntryActive(): boolean {
  if (!isLocalDevEnvironment()) return false;
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DEV_FREE_ENTRY_KEY) === "true";
}

/**
 * Aktivuje lokálny vývojársky bezplatný vstup.
 */
export function setDevFreeEntryActive(): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DEV_FREE_ENTRY_KEY, "true");
  }
}

/**
 * Zruší lokálny vývojársky bezplatný vstup (napr. pri odhlásení).
 */
export function clearDevFreeEntry(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(DEV_FREE_ENTRY_KEY);
  }
}

export type DevUser = {
  id: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  aud: string;
  confirmation_sent_at?: string;
  confirmed_at?: string;
  created_at: string;
  email?: string;
  phone?: string;
  role?: string;
  updated_at?: string;
};

/**
 * Mock používateľ pre lokálny beh bez nutnosti pripojenia na živý Supabase Auth.
 */
export const DEV_MOCK_USER: DevUser = {
  id: "00000000-0000-0000-0000-000000000001",
  app_metadata: { provider: "dev_local" },
  user_metadata: {
    name: "Dev Vyšetrovateľ (Lokál)",
    email: "dev@forendo.local",
  },
  aud: "authenticated",
  confirmation_sent_at: new Date().toISOString(),
  confirmed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  email: "dev@forendo.local",
  phone: "",
  role: "authenticated",
  updated_at: new Date().toISOString(),
};
