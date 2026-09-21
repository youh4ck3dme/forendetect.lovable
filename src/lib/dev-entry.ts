import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { setDevFreeEntryActive } from "@/lib/dev-auth";
import { idbClear } from "@/lib/idb";
import { ACTIVE_CASE_STORAGE_KEY } from "@/lib/session-error";

async function signOutLocalSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) await supabase.auth.signOut({ scope: "local" });
}

function clearActiveCasePointer(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ACTIVE_CASE_STORAGE_KEY);
  } catch {
    /* localStorage nemusí byť dostupný */
  }
}

/** Prechod do demo režimu: odreže živú session a cache pred nastavením flagu. */
export async function beginDevFreeEntry(
  queryClient: QueryClient,
): Promise<void> {
  await signOutLocalSession();
  await queryClient.cancelQueries();
  queryClient.clear();
  clearActiveCasePointer();
  try {
    await idbClear();
  } catch {
    /* IndexedDB nemusí byť dostupné */
  }
  setDevFreeEntryActive();
}

/** Ak demo už beží a v prehliadači ostala živá session, odstráň ju bez mazania demo dát. */
export async function dropLeftoverSessionForDemo(
  queryClient: QueryClient,
): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  await supabase.auth.signOut({ scope: "local" });
  queryClient.clear();
  clearActiveCasePointer();
}
