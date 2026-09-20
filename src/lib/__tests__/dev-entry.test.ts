import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const signOut = vi.fn();
const idbClear = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSession(...args),
      signOut: (...args: unknown[]) => signOut(...args),
    },
  },
}));

vi.mock("@/lib/idb", () => ({
  idbClear: (...args: unknown[]) => idbClear(...args),
}));

import { beginDevFreeEntry, dropLeftoverSessionForDemo } from "@/lib/dev-entry";
import { DEV_FREE_ENTRY_KEY, isDevFreeEntryActive } from "@/lib/dev-auth";

class MockStorage {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

const mockStorage = new MockStorage();

describe("beginDevFreeEntry", () => {
  beforeEach(() => {
    mockStorage.clear();
    getSession.mockReset();
    signOut.mockReset();
    idbClear.mockReset();
    vi.stubGlobal("window", {
      location: { hostname: "localhost" },
      localStorage: mockStorage,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("odhlási lokálnu session, vyčistí cache a až potom zapne demo", async () => {
    mockStorage.setItem("malte:active-case", "live-case");
    getSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
    });
    signOut.mockResolvedValue({});
    idbClear.mockResolvedValue(undefined);
    const queryClient = {
      cancelQueries: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn(),
    };

    await beginDevFreeEntry(queryClient as never);

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(queryClient.cancelQueries).toHaveBeenCalled();
    expect(queryClient.clear).toHaveBeenCalled();
    expect(idbClear).toHaveBeenCalled();
    expect(mockStorage.getItem("malte:active-case")).toBeNull();
    expect(mockStorage.getItem(DEV_FREE_ENTRY_KEY)).toBe("true");
    expect(isDevFreeEntryActive()).toBe(true);
  });

  it("pri ostávajúcej session v demo režime vyčistí cache, nie demo flag", async () => {
    mockStorage.setItem(DEV_FREE_ENTRY_KEY, "true");
    mockStorage.setItem("malte:active-case", "live-case");
    getSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
    });
    signOut.mockResolvedValue({});
    const queryClient = { clear: vi.fn() };

    await dropLeftoverSessionForDemo(queryClient as never);

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(queryClient.clear).toHaveBeenCalled();
    expect(mockStorage.getItem(DEV_FREE_ENTRY_KEY)).toBe("true");
    expect(mockStorage.getItem("malte:active-case")).toBeNull();
  });

  it("bez session v demo režime cache nemení", async () => {
    mockStorage.setItem(DEV_FREE_ENTRY_KEY, "true");
    getSession.mockResolvedValue({ data: { session: null } });
    const queryClient = { clear: vi.fn() };

    await dropLeftoverSessionForDemo(queryClient as never);

    expect(signOut).not.toHaveBeenCalled();
    expect(queryClient.clear).not.toHaveBeenCalled();
  });
});
