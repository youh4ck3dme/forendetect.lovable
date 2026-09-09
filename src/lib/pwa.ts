/**
 * Jediné miesto registrácie service workera.
 * Nikdy sa neregistruje vo vývoji, v náhľade Lovable, v iframe ani pri ?sw=off.
 * Aktualizácia nikdy nevynúti reload — rozpracovaný formulár sa nestratí.
 */
const SW_URL = "/sw.js";

function isPreviewHost(hostname: string): boolean {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

async function unregisterExisting() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((r) =>
        (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").endsWith(SW_URL),
      )
      .map((r) => r.unregister()),
  );
}

export async function registerServiceWorker(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const refuse =
    !import.meta.env.PROD ||
    window.self !== window.top ||
    isPreviewHost(window.location.hostname) ||
    new URLSearchParams(window.location.search).get("sw") === "off";

  if (refuse) {
    await unregisterExisting();
    return;
  }

  try {
    await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  } catch {
    // Registrácia je doplnková; jej zlyhanie nesmie ovplyvniť aplikáciu.
  }
}

/** Pri odhlásení: zmaž lokálny stav aj cache, aby ďalší účet nevidel cudzie dáta. */
export async function clearClientState(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.clear();
    window.sessionStorage.clear();
  } catch {
    /* prázdne */
  }
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.allSettled(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* prázdne */
  }
  try {
    const anyIdb = indexedDB as IDBFactory & {
      databases?: () => Promise<{ name?: string }[]>;
    };
    const dbs = (await anyIdb.databases?.()) ?? [];
    await Promise.allSettled(
      dbs
        .filter((d) => d.name)
        .map((d) => indexedDB.deleteDatabase(d.name as string)),
    );
  } catch {
    /* prázdne */
  }
}
