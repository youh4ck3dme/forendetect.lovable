import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Lock, Mail, Zap } from "lucide-react";
import malteMark from "@/assets/malte-mark.png";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/malte/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import {
  isDevFreeEntryActive,
  isLocalDevEnvironment,
  setDevFreeEntryActive,
} from "@/lib/dev-auth";

export const Route = createFileRoute("/auth")({
  // Supabase auth and the local development bypass both depend on browser storage.
  ssr: false,
  head: () => ({
    meta: [
      { title: "Prihlásenie — Forendo" },
      {
        name: "description",
        content:
          "Prihláste sa do Forendo e-mailom a pracujte na vlastných prípadoch.",
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

  async function handleDevEntry() {
    setBusy(true);
    try {
      setDevFreeEntryActive();
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
