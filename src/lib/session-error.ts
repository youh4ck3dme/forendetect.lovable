export const SESSION_EXPIRED_MESSAGE = "Relácia vypršala. Prihláste sa znova.";

export class SessionExpiredError extends Error {
  constructor(message = SESSION_EXPIRED_MESSAGE) {
    super(message);
    this.name = "SessionExpiredError";
  }
}

type ErrorShape = {
  name?: string;
  message?: string;
  code?: string | number;
  status?: number;
  statusCode?: number;
};

function asShape(error: unknown): ErrorShape {
  if (!error || typeof error !== "object") {
    return { message: typeof error === "string" ? error : String(error) };
  }
  return error as ErrorShape;
}

/** 401/JWT/session — nie prázdny zoznam prípadov a nie bežná RLS/sieťová chyba. */
export function isAuthSessionError(error: unknown): boolean {
  if (error instanceof SessionExpiredError) return true;
  const e = asShape(error);
  if (
    e.name === "AuthSessionMissingError" ||
    e.name === "AuthApiError" ||
    e.name === "AuthRetryableFetchError"
  ) {
    return true;
  }
  if (e.status === 401 || e.statusCode === 401) return true;
  const code = String(e.code ?? "");
  if (code === "401" || code === "PGRST301") return true;
  const msg = (e.message ?? "").toLowerCase();
  if (msg.includes("jwt expired") || msg.includes("invalid jwt")) return true;
  if (msg.includes("session missing") || msg.includes("refresh token"))
    return true;
  if (msg.includes("not authenticated") || msg.includes("unauthorized"))
    return true;
  return false;
}

export function toSessionAwareError(error: unknown): Error {
  if (isAuthSessionError(error)) return new SessionExpiredError();
  if (error instanceof Error) return error;
  return new Error(typeof error === "string" ? error : "Neznáma chyba.");
}
