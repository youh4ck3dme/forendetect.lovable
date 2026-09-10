import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Lock, Mail, Zap } from "lucide-react";
import malteMark from "@/assets/malte-mark.png";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/malte/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import {
  isDevFreeEntryActive,
  isLocalDevEnvironment,
  setDevFreeEntryActive,
} from "@/lib/dev-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Prihlásenie — Forendo" },
      {
        name: "description",
        content:
          "Prihláste sa do Forendo cez Google alebo e-mail a pracujte na vlastných prípadoch.",
      },
      { property: "og:title", content: "Prihlásenie — Forendo" },
      {
        property: "og:description",
        content: "Prístup k vašim forenzným prípadom v Forendo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthScreen,
});

function AuthScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const isLocal = isLocalDevEnvironment();

  useEffect(() => {
    let active = true;
    if (isDevFreeEntryActive()) {
      void navigate({ to: "/prehlad", replace: true });
      return;
    }
    void supabase.auth.getUser().then((res: { data: { user: unknown } }) => {
      if (active && res.data.user)
        void navigate({ to: "/prehlad", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange(
      (event: string, session: unknown) => {
        if (event === "SIGNED_IN" && session)
          void navigate({ to: "/prehlad", replace: true });
      },
    );
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  async function handleGoogle() {
    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}/prehlad`;
      const host = window.location.hostname;
      const onLovablePreview =
        host.endsWith(".lovable.app") ||
        host.endsWith(".lovableproject.com") ||
        host.endsWith(".lovableproject-dev.com");

      // Na Lovable preview existuje broker /~oauth/initiate.
      // Na Vercel/localhost ten path nie je — Google musí ísť cez Supabase OAuth.
      if (onLovablePreview) {
        const result = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: redirectTo,
        });
        if ("error" in result && result.error) {
          throw result.error instanceof Error
            ? result.error
            : new Error(String(result.error));
        }
        if ("redirected" in result && result.redirected) return;
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Prihlásenie zlyhalo.",
      );
      setBusy(false);
    }
  }

  async function handleDevEntry() {
    setBusy(true);
    try {
      setDevFreeEntryActive();
      try {
        await supabase.auth.signInWithPassword({
          email: "dev@forendo.local",
          password: "DevPassword123!",
        });
      } catch {
        /* V lokálnom režime stačí lokálny dev bypass */
      }
      toast.success("⚡ Vývojársky prístup aktivovaný (lokálny režim)");
      void navigate({ to: "/prehlad", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dev vstup zlyhal.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/prehlad` },
        });
        if (error) throw error;
        toast.success("Účet vytvorený. Skontrolujte e-mail pre potvrdenie.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Niečo sa pokazilo.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-background px-5 py-12">
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link to="/">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Späť
          </Link>
        </Button>
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <img
            src={malteMark}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 drop-shadow-sm transition-transform hover:scale-105"
            aria-hidden
          />
          <h1 className="text-2xl font-extrabold tracking-tight">
            {mode === "signin" ? "Prihlásenie do Forendo" : "Vytvorenie účtu"}
          </h1>
          <p className="text-caption">
            Vaše prípady sú súkromné a viditeľné len pre vás.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="relative flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-border/80 bg-card font-medium shadow-xs transition-all hover:bg-accent/40 hover:border-primary/40 active:scale-[0.99]"
            disabled={busy}
            onClick={handleGoogle}
          >
            <svg
              className="h-4 w-4 shrink-0"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Pokračovať cez Google</span>
          </Button>

          {isLocal && (
            <div className="space-y-1.5 pt-0.5">
              <Button
                type="button"
                variant="secondary"
                className="group relative flex h-11 w-full items-center justify-between rounded-xl border border-dashed border-amber-500/60 bg-amber-500/10 px-3 font-semibold text-amber-600 shadow-xs transition-all hover:border-amber-500 hover:bg-amber-500/20 active:scale-[0.99] dark:text-amber-400"
                disabled={busy}
                onClick={handleDevEntry}
              >
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500 transition-transform group-hover:scale-125" />
                  <span>Dev Free Entry</span>
                </div>
                <span className="rounded-md border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-300">
                  lokál
                </span>
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                ⚡ Okamžitý bezplatný vstup pre testovanie (len na localhost).
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 text-caption">
          <span className="h-px flex-1 bg-border" />
          alebo
          <span className="h-px flex-1 bg-border" />
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="flex items-center gap-1.5 text-xs font-medium"
            >
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="password"
              className="flex items-center gap-1.5 text-xs font-medium"
            >
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              Heslo
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button
            type="submit"
            className="h-11 w-full rounded-xl font-semibold shadow-xs transition-all active:scale-[0.99]"
            disabled={busy}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "signin" ? "Prihlasujem..." : "Vytváram účet..."}
              </>
            ) : mode === "signin" ? (
              "Prihlásiť sa"
            ) : (
              "Zaregistrovať sa"
            )}
          </Button>
        </form>

        <p className="text-center text-caption">
          {mode === "signin" ? "Nemáte účet?" : "Už máte účet?"}{" "}
          <button
            type="button"
            className="font-semibold text-foreground underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Zaregistrovať sa" : "Prihlásiť sa"}
          </button>
        </p>

        <p className="text-center text-caption">
          <Link to="/" className="underline">
            Späť na úvod
          </Link>
        </p>
      </div>
    </main>
  );
}
