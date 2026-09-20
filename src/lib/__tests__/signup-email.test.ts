import { describe, expect, it } from "vitest";
import {
  isAllowedSignupEmail,
  isAlreadyRegisteredAuthError,
  normalizeSignupEmail,
  parseSignupLookup,
  resolveSignupLookup,
} from "../signup-email";

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

  it("dovolí zapísané e-maily aj keď RPC chýba", () => {
    expect(isAllowedSignupEmail("erikbabcan@gmail.com")).toBe(true);
    expect(isAllowedSignupEmail("larsenevans@gmail.com")).toBe(true);
    expect(isAllowedSignupEmail("random@example.com")).toBe(false);
    expect(
      resolveSignupLookup("erikbabcan@gmail.com", null, {
        message: "Could not find the function",
      }),
    ).toEqual({ allowed: true, registered: false });
    expect(
      resolveSignupLookup("random@example.com", null, { message: "missing" }),
    ).toEqual({ allowed: false, registered: false });
    expect(
      resolveSignupLookup(
        "erikbabcan@gmail.com",
        {
          allowed: true,
          registered: true,
        },
        null,
      ),
    ).toEqual({ allowed: true, registered: true });
  });

  it("rozpozná už existujúci účet", () => {
    expect(
      isAlreadyRegisteredAuthError({ message: "User already registered" }),
    ).toBe(true);
  });
});
