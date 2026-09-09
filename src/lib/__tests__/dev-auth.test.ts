import { beforeEach, describe, expect, it } from "vitest";
import {
  clearDevFreeEntry,
  DEV_FREE_ENTRY_KEY,
  DEV_MOCK_USER,
  isDevFreeEntryActive,
  isLocalDevEnvironment,
  setDevFreeEntryActive,
} from "@/lib/dev-auth";

class MockStorage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

const mockStorage = new MockStorage();

// Mock window and localStorage for node test runner
if (typeof window === "undefined") {
  Object.defineProperty(globalThis, "window", {
    value: {
      location: {
        hostname: "localhost",
      } as Location,
      localStorage: mockStorage as unknown as Storage,
    } as unknown as Window & typeof globalThis,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, "localStorage", {
    value: mockStorage as unknown as Storage,
    writable: true,
    configurable: true,
  });
}

describe("dev-auth (Lokálny vývojársky prístup)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.hostname = "localhost";
  });

  it("deteguje vývojové prostredie na localhost", () => {
    expect(isLocalDevEnvironment()).toBe(true);
  });

  it("deteguje produkčné prostredie (nie localhost)", () => {
    const env = import.meta.env as { DEV: boolean };
    const originalDev = env.DEV;
    try {
      env.DEV = false;
      window.location.hostname = "app.forendetect.com";
      expect(isLocalDevEnvironment()).toBe(false);
    } finally {
      env.DEV = originalDev;
      window.location.hostname = "localhost";
    }
  });

  it("správne inicializuje dev mock používateľa s validnými atribútmi", () => {
    expect(DEV_MOCK_USER.id).toBe("00000000-0000-0000-0000-000000000001");
    expect(DEV_MOCK_USER.email).toBe("dev@forendo.local");
    expect(DEV_MOCK_USER.role).toBe("authenticated");
    expect(DEV_MOCK_USER.user_metadata["name"]).toContain("Dev");
  });

  it("správne aktivuje a overí dev free entry", () => {
    expect(isDevFreeEntryActive()).toBe(false);
    setDevFreeEntryActive();
    expect(window.localStorage.getItem(DEV_FREE_ENTRY_KEY)).toBe("true");
    expect(isDevFreeEntryActive()).toBe(true);
  });

  it("správne zmaže dev free entry pri odhlásení", () => {
    setDevFreeEntryActive();
    expect(isDevFreeEntryActive()).toBe(true);
    clearDevFreeEntry();
    expect(window.localStorage.getItem(DEV_FREE_ENTRY_KEY)).toBeNull();
    expect(isDevFreeEntryActive()).toBe(false);
  });
});
