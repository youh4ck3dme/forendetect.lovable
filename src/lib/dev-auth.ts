import { isLoopbackHost } from "@/lib/loopback-host";

export const DEV_FREE_ENTRY_KEY = "forendo:dev-free-entry";

/**
 * Loopback — len informácia pre UI. Free vstup developera funguje na každom hostiteľovi.
 */
export function isLocalDevEnvironment(): boolean {
  if (typeof window !== "undefined") {
    return isLoopbackHost(window.location.hostname);
  }
  return false;
}

/**
 * Overí, či je aktivovaný vývojársky bezplatný vstup (client-side demo režim).
 */
export function isDevFreeEntryActive(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DEV_FREE_ENTRY_KEY) === "true";
}

/**
 * Aktivuje vývojársky bezplatný vstup.
 */
export function setDevFreeEntryActive(): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DEV_FREE_ENTRY_KEY, "true");
  }
}

/**
 * Zruší vývojársky bezplatný vstup (napr. pri odhlásení).
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
 * Mock používateľ pre vývojársky free vstup bez Supabase Auth.
 */
export const DEV_MOCK_USER: DevUser = {
  id: "00000000-0000-0000-0000-000000000001",
  app_metadata: { provider: "dev_local" },
  user_metadata: {
    name: "Developer (Free vstup)",
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
