import { describe, expect, it } from "vitest";
import {
  isAuthSessionError,
  SessionExpiredError,
  SESSION_EXPIRED_MESSAGE,
  toSessionAwareError,
} from "../session-error";

describe("session-error", () => {
  it("rozpozná vypršaný JWT a chýbajúcu reláciu", () => {
    expect(isAuthSessionError({ message: "JWT expired", status: 401 })).toBe(
      true,
    );
    expect(isAuthSessionError({ name: "AuthSessionMissingError" })).toBe(true);
    expect(isAuthSessionError({ code: "PGRST301" })).toBe(true);
    expect(isAuthSessionError(new SessionExpiredError())).toBe(true);
  });

  it("prázdny zoznam prípadov ani bežnú DB chybu nepovažuje za reláciu", () => {
    expect(isAuthSessionError(null)).toBe(false);
    expect(isAuthSessionError({ message: "relation does not exist" })).toBe(
      false,
    );
    expect(isAuthSessionError({ code: "42501", message: "permission" })).toBe(
      false,
    );
  });

  it("mapuje auth chybu na SessionExpiredError so slovenským textom", () => {
    const mapped = toSessionAwareError({ status: 401, message: "JWT expired" });
    expect(mapped).toBeInstanceOf(SessionExpiredError);
    expect(mapped.message).toBe(SESSION_EXPIRED_MESSAGE);
  });
});
