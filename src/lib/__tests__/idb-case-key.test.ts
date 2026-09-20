import { describe, expect, it } from "vitest";
import { caseStateKey } from "../idb";

describe("caseStateKey", () => {
  it("oddeľuje stav podľa user id", () => {
    expect(caseStateKey("user-a")).toBe("malte:case-state:user-a");
    expect(caseStateKey("user-b")).not.toBe(caseStateKey("user-a"));
  });
});
