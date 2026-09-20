import { describe, expect, it } from "vitest";
import {
  isAuthSessionError,
  SessionExpiredError,
  SESSION_EXPIRED_MESSAGE,
  toSessionAwareError,
  clearExpiredSessionArtifacts,
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

  it("sieťový AuthRetryableFetchError nepovažuje za vypršanie relácie", () => {
    expect(isAuthSessionError({ name: "AuthRetryableFetchError" })).toBe(false);
  });

  it("pri expiry zmaže aktívny prípad z localStorage", () => {
    const memory = new Map<string, string>();
    const originalWindow = globalThis.window;
    const localStorage = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, v);
      },
      removeItem: (k: string) => {
        memory.delete(k);
      },
    };
    Object.defineProperty(globalThis, "window", {
      value: { localStorage },
      configurable: true,
      writable: true,
    });
    try {
      window.localStorage.setItem("malte:active-case", "case-1");
      let cleared = false;
      clearExpiredSessionArtifacts(() => {
        cleared = true;
      });
      expect(cleared).toBe(true);
      expect(window.localStorage.getItem("malte:active-case")).toBeNull();
    } finally {
      if (originalWindow) {
        Object.defineProperty(globalThis, "window", {
          value: originalWindow,
          configurable: true,
          writable: true,
        });
      }
    }
  });
});
