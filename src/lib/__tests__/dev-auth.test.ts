import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

describe("dev-auth (Lokálny vývojársky prístup)", () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.stubGlobal("window", {
      location: { hostname: "localhost" },
      localStorage: mockStorage,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each(["localhost", "127.0.0.1", "[::1]"])(
    "povolí lokálny vstup na %s",
    (hostname) => {
      vi.stubEnv("DEV", false);
      window.location.hostname = hostname;
      expect(isLocalDevEnvironment()).toBe(true);
      expect(isDevFreeEntryActive()).toBe(false);
      setDevFreeEntryActive();
      expect(isDevFreeEntryActive()).toBe(true);
    },
  );

  it.each([
    ["app.forendetect.com", false],
    ["temporary-swift-hawthorn-7ac3v9k.vercel.app", true],
  ] as const)(
    "free vstup sa dá zapnúť aj mimo loopback (%s)",
    (hostname, dev) => {
      vi.stubEnv("DEV", dev);
      window.location.hostname = hostname;
      expect(isLocalDevEnvironment()).toBe(false);
      expect(isDevFreeEntryActive()).toBe(false);
      setDevFreeEntryActive();
      expect(mockStorage.getItem(DEV_FREE_ENTRY_KEY)).toBe("true");
      expect(isDevFreeEntryActive()).toBe(true);
    },
  );

  it("na serveri nepovolí ani neaktivuje dev vstup", () => {
    vi.stubGlobal("window", undefined);
    vi.stubEnv("DEV", true);
    expect(isLocalDevEnvironment()).toBe(false);
    expect(isDevFreeEntryActive()).toBe(false);
    expect(() => setDevFreeEntryActive()).not.toThrow();
    expect(() => clearDevFreeEntry()).not.toThrow();
    expect(mockStorage.getItem(DEV_FREE_ENTRY_KEY)).toBeNull();
  });

  it("správne inicializuje dev mock používateľa s validnými atribútmi", () => {
    expect(DEV_MOCK_USER.id).toBe("00000000-0000-0000-0000-000000000001");
    expect(DEV_MOCK_USER.email).toBe("dev@forendo.local");
    expect(DEV_MOCK_USER.role).toBe("authenticated");
    expect(DEV_MOCK_USER.user_metadata["name"]).toContain("Developer");
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
