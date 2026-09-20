import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDevCase,
  createDevDemoCase,
  deleteDevRecord,
  describeDevDeleteImpact,
  listDevCases,
  loadDevCase,
} from "@/lib/dev-cases";

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

describe("dev delete impact", () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.stubGlobal("window", {
      location: { hostname: "localhost" },
      localStorage: mockStorage,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("allows deleting an empty case without blockers", () => {
    const id = createDevCase({ name: "Prázdny" });
    const impact = describeDevDeleteImpact("case", id);
    expect(impact.canDelete).toBe(true);
    expect(impact.blockers).toEqual([]);
    expect(impact.cascades).toEqual([]);
  });

  it("lists cascades when deleting a demo case with data", () => {
    const id = createDevDemoCase();
    const impact = describeDevDeleteImpact("case", id);
    expect(impact.canDelete).toBe(true);
    expect(impact.cascades.some((item) => item.includes("subjektov"))).toBe(
      true,
    );
    expect(impact.cascades.some((item) => item.includes("transakcií"))).toBe(
      true,
    );
  });

  it("blocks deleting an entity that still has transactions", () => {
    const id = createDevDemoCase();
    const entityId = loadDevCase(id).entities[0]?.id;
    expect(entityId).toBeTruthy();
    const impact = describeDevDeleteImpact("entity", entityId as string);
    expect(impact.canDelete).toBe(false);
    expect(impact.blockers.length).toBeGreaterThan(0);
  });

  it("removes a case from local storage", () => {
    const id = createDevCase({ name: "Na zmazanie" });
    deleteDevRecord("case", id);
    expect(listDevCases().some((item) => item.id === id)).toBe(false);
  });
});
