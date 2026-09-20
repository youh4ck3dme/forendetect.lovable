import { describe, expect, it } from "vitest";
import { isLovableAuthHost } from "../lovable-host";

describe("isLovableAuthHost", () => {
  it("rozpozná Lovable preview a produkčné zóny", () => {
    expect(isLovableAuthHost("forendetect.lovable.app")).toBe(true);
    expect(isLovableAuthHost("id-preview--abc.lovable.app")).toBe(true);
    expect(isLovableAuthHost("project.lovableproject.com")).toBe(true);
    expect(isLovableAuthHost("app.lovableproject-dev.com")).toBe(true);
    expect(isLovableAuthHost("lovable.app")).toBe(true);
  });

  it("Vercel, custom domain a localhost idú cez Supabase OAuth", () => {
    expect(
      isLovableAuthHost("temporary-swift-hawthorn-7ac3v9k.vercel.app"),
    ).toBe(false);
    expect(isLovableAuthHost("forendo.example.com")).toBe(false);
    expect(isLovableAuthHost("localhost")).toBe(false);
    expect(isLovableAuthHost("notlovable.app.evil.com")).toBe(false);
  });
});
