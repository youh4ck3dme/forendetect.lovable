export type SignupLookup = {
  allowed: boolean;
  registered: boolean;
};

export function normalizeSignupEmail(email: string): string {
  return email.trim().toLowerCase();
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
