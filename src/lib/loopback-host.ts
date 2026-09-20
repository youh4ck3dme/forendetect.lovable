/** Loopback hostitelia, na ktorých smie existovať Dev Free Entry. */
export function normalizeHost(raw: string | null | undefined): string {
  const first = (raw ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("[") && first.includes("]")) {
    return first.slice(0, first.indexOf("]") + 1);
  }
  return first.replace(/:\d+$/, "");
}

export function isLoopbackHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}
