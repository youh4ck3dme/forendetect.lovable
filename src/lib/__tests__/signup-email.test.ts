import { describe, expect, it } from "vitest";
import { normalizeSignupEmail, parseSignupLookup } from "../signup-email";

describe("signup-email", () => {
  it("normalizuje e-mail", () => {
    expect(normalizeSignupEmail("  ErikBabcan@gmail.com ")).toBe(
      "erikbabcan@gmail.com",
    );
  });

  it("parsuje RPC výsledok bez úniku iných polí", () => {
    expect(
      parseSignupLookup({ allowed: true, registered: false, extra: 1 }),
    ).toEqual({ allowed: true, registered: false });
    expect(parseSignupLookup({ allowed: true, registered: true })).toEqual({
      allowed: true,
      registered: true,
    });
    expect(parseSignupLookup(null)).toEqual({
      allowed: false,
      registered: false,
    });
    expect(parseSignupLookup({ allowed: "yes" })).toEqual({
      allowed: false,
      registered: false,
    });
  });
});
