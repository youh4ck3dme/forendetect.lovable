import { describe, expect, it } from "vitest";
import { googleOAuthReturnUrl, googleSignInErrorMessage } from "../google-auth";

describe("google-auth helpers", () => {
  it("vracia verejnú /auth adresu, nie chránený /prehlad", () => {
    expect(
      googleOAuthReturnUrl("https://placeholder-design-dream.vercel.app"),
    ).toBe("https://placeholder-design-dream.vercel.app/auth");
  });

  it("vysvetlí chýbajúci Google OAuth secret", () => {
    expect(
      googleSignInErrorMessage({
        message: "Unsupported provider: missing OAuth secret",
      }),
    ).toMatch(/Client ID a Secret/);
  });
});
