import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { isLovableAuthHost } from "@/lib/lovable-host";

export function googleOAuthReturnUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/auth`;
}

export function googleSignInErrorMessage(error: unknown): string {
  const msg =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message ?? "")
        : String(error ?? "");
  if (/missing oauth secret/i.test(msg) || /unsupported provider/i.test(msg)) {
    return "Google v tomto projekte ešte nemá Client ID a Secret. Prihláste sa e-mailom a heslom.";
  }
  return msg || "Prihlásenie zlyhalo.";
}

export async function signInWithGoogle(redirectTo: string): Promise<{
  error: Error | null;
  redirected: boolean;
}> {
  const host = typeof window !== "undefined" ? window.location.hostname : "";

  if (isLovableAuthHost(host)) {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: redirectTo,
    });
    if (result.error) {
      const error =
        result.error instanceof Error
          ? result.error
          : new Error(String(result.error));
      return { error, redirected: false };
    }
    return { error: null, redirected: Boolean(result.redirected) };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) return { error, redirected: false };
  return { error: null, redirected: true };
}
