export type SignupLookup = {
  allowed: boolean;
  registered: boolean;
};

export const ALLOWED_SIGNUP_EMAILS = [
  "erikbabcan@gmail.com",
  "larsenevans@gmail.com",
] as const;

export function normalizeSignupEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAllowedSignupEmail(email: string): boolean {
  return (ALLOWED_SIGNUP_EMAILS as readonly string[]).includes(
    normalizeSignupEmail(email),
  );
}

export function parseSignupLookup(data: unknown): SignupLookup {
  if (!data || typeof data !== "object") {
    return { allowed: false, registered: false };
  }
  const row = data as Record<string, unknown>;
  return {
    allowed: row.allowed === true,
    registered: row.registered === true,
  };
}

/** Ak RPC v databáze ešte nie je, dovolíme zapísané e-maily z kódu. */
export function resolveSignupLookup(
  email: string,
  rpcData: unknown,
  rpcError: unknown,
): SignupLookup {
  if (!rpcError) return parseSignupLookup(rpcData);
  return {
    allowed: isAllowedSignupEmail(email),
    registered: false,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message ?? "");
  }
  return String(error ?? "");
}

export function isAlreadyRegisteredAuthError(error: unknown): boolean {
  const msg = errorMessage(error).toLowerCase();
  return (
    msg.includes("already registered") ||
    msg.includes("user already exists") ||
    msg.includes("already been registered")
  );
}
