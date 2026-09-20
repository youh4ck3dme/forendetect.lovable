export const AFTER_LOGIN_KEY = "forendo:after-login";
export const DEFAULT_AFTER_LOGIN = "/prehlad";

function isSafeAppPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\");
}

export function rememberAfterLogin(path = DEFAULT_AFTER_LOGIN): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(AFTER_LOGIN_KEY, path);
  } catch {
    /* sessionStorage nemusí byť dostupné */
  }
}

export function consumeAfterLoginPath(): string {
  if (typeof window === "undefined") return DEFAULT_AFTER_LOGIN;
  try {
    const path = sessionStorage.getItem(AFTER_LOGIN_KEY);
    sessionStorage.removeItem(AFTER_LOGIN_KEY);
    if (path && isSafeAppPath(path)) return path;
  } catch {
    /* sessionStorage nemusí byť dostupné */
  }
  return DEFAULT_AFTER_LOGIN;
}
