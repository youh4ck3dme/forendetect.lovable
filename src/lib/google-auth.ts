import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { isLovableAuthHost } from "@/lib/lovable-host";

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
