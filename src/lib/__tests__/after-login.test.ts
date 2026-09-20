import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AFTER_LOGIN_KEY,
  consumeAfterLoginPath,
  DEFAULT_AFTER_LOGIN,
  rememberAfterLogin,
} from "../after-login";

describe("after-login redirect", () => {
  const memory = new Map<string, string>();
  const originalWindow = globalThis.window;

  beforeEach(() => {
    memory.clear();
    const sessionStorage = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, v);
      },
      removeItem: (k: string) => {
        memory.delete(k);
      },
      clear: () => memory.clear(),
    };
    Object.defineProperty(globalThis, "window", {
      value: { sessionStorage },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "sessionStorage", {
      value: sessionStorage,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        configurable: true,
        writable: true,
      });
    }
  });

  it("uloží a spotrebuje relatívnu cestu", () => {
    rememberAfterLogin("/prehlad");
    expect(sessionStorage.getItem(AFTER_LOGIN_KEY)).toBe("/prehlad");
    expect(consumeAfterLoginPath()).toBe("/prehlad");
    expect(sessionStorage.getItem(AFTER_LOGIN_KEY)).toBeNull();
  });

  it("odmietne otvorený redirect", () => {
    sessionStorage.setItem(AFTER_LOGIN_KEY, "https://evil.example");
    expect(consumeAfterLoginPath()).toBe(DEFAULT_AFTER_LOGIN);
    sessionStorage.setItem(AFTER_LOGIN_KEY, "//evil.example");
    expect(consumeAfterLoginPath()).toBe(DEFAULT_AFTER_LOGIN);
  });
});
