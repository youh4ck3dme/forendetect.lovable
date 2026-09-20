/** Hostitelia, na ktorých existuje Lovable OAuth broker (`/~oauth/initiate`). */
export function isLovableAuthHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  return (
    host === "lovable.app" ||
    host.endsWith(".lovable.app") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com")
  );
}
