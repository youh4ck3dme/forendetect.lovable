import { describe, expect, it } from "vitest";
import {
  GOOGLE_SIGN_IN_ENABLED,
  googleOAuthReturnUrl,
  googleSignInErrorMessage,
  signInWithGoogle,
} from "../google-auth";

describe("google-auth helpers", () => {
  it("má Google prihlásenie vypnuté", () => {
    expect(GOOGLE_SIGN_IN_ENABLED).toBe(false);
  });

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

  it("signInWithGoogle pri vypnutí nič nespustí", async () => {
    const result = await signInWithGoogle("https://example.com/auth");
    expect(result.redirected).toBe(false);
    expect(result.error?.message).toMatch(/vypnuté/);
  });
});

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
