import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Lock, Mail, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/malte/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { isDevFreeEntryActive } from "@/lib/dev-auth";
import { beginDevFreeEntry, dropLeftoverSessionForDemo } from "@/lib/dev-entry";
import { consumeAfterLoginPath } from "@/lib/after-login";
import {
  isAlreadyRegisteredAuthError,
  normalizeSignupEmail,
  resolveSignupLookup,
  type SignupLookup,
} from "@/lib/signup-email";

export const Route = createFileRoute("/auth")({
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
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"email" | "password">("email");
  const [lookup, setLookup] = useState<SignupLookup | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let active = true;
    setMounted(true);
    if (isDevFreeEntryActive()) {
      void dropLeftoverSessionForDemo(queryClient).then(() => {
        if (active) void navigate({ to: "/prehlad", replace: true });
      });
      return;
    }
    void supabase.auth.getUser().then((res: { data: { user: unknown } }) => {
      if (active && res.data.user)
        void navigate({ to: consumeAfterLoginPath(), replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange(
      (event: string, session: unknown) => {
        if (event === "SIGNED_IN" && session)
          void navigate({ to: consumeAfterLoginPath(), replace: true });
      },
    );
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate, queryClient]);

  async function handleDevEntry() {
    setBusy(true);
    try {
      await beginDevFreeEntry(queryClient);
      toast.success("Vývojársky prístup aktivovaný — free vstup");
      await navigate({ to: "/prehlad", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dev vstup zlyhal.");
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailContinue(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const normalized = normalizeSignupEmail(email);
      const { data, error } = await supabase.rpc("lookup_signup_email", {
        _email: normalized,
      });
      const result = resolveSignupLookup(normalized, data, error);
      if (!result.allowed) {
        toast.error("Tento e-mail nie je zaregistrovaný.");
        return;
      }
      setEmail(normalized);
      setLookup(result);
      setPassword("");
      setPasswordConfirm("");
      setStep("password");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Overenie e-mailu zlyhalo. Skúste to znova.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!lookup) return;
    if (!lookup.registered && password !== passwordConfirm) {
      toast.error("Heslá sa nezhodujú.");
      return;
    }
    setBusy(true);
    try {
      const signIn = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!signIn.error) return;

      if (lookup.registered) throw signIn.error;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });
      if (error) {
        if (isAlreadyRegisteredAuthError(error)) {
          throw new Error("Účet už existuje. Zadajte správne heslo.");
        }
        throw error;
      }
      if (!data.session) {
        toast.success(
          "Heslo je nastavené. V Supabase vypnite „Confirm email“, alebo otvorte potvrdzovací e-mail a prihláste sa znova.",
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Niečo sa pokazilo.",
      );
    } finally {
      setBusy(false);
    }
  }

  function resetToEmail() {
    setStep("email");
    setLookup(null);
    setPassword("");
    setPasswordConfirm("");
  }

  const firstLogin = lookup !== null && !lookup.registered;

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
      <div className="forenx-glass w-full max-w-sm space-y-6 p-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <img
            src="/favicon-32x32.png"
            alt="Forendo"
            width={40}
            height={40}
            className="h-10 w-10 drop-shadow-sm transition-transform hover:scale-105"
          />
          <h1 className="text-2xl font-extrabold tracking-tight">
            {firstLogin ? "Zvoľte heslo" : "Prihlásenie do Forendo"}
          </h1>
          <p className="text-caption">
            {step === "email"
              ? "Zadajte e-mail. Heslo si zvolíte pri prvom prihlásení."
              : firstLogin
                ? "Účet je pripravený. Nastavte si heslo a pokračujte."
                : "Vaše prípady sú súkromné a viditeľné len pre vás."}
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5 pt-0.5">
            <Button
              type="button"
              variant="default"
              className="group relative flex h-11 w-full items-center justify-between px-3 font-semibold"
              disabled={busy || !mounted}
              onClick={handleDevEntry}
            >
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[color:var(--forenx-color-text-button)] transition-transform group-hover:scale-125" />
                <span>Developer</span>
              </div>
              <span className="rounded-md border border-white/40 bg-black/10 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-[color:var(--forenx-color-text-button)]">
                Free vstup
              </span>
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Okamžitý bezplatný vývojársky vstup do aplikácie.
            </p>
          </div>
          <div className="flex items-center gap-3 text-caption">
            <span className="h-px flex-1 bg-border" />
            alebo
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>

        {step === "email" ? (
          <form className="space-y-3" onSubmit={handleEmailContinue}>
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
                className="h-11 w-full forenx-input text-sm outline-none transition-all"
              />
            </div>
            <Button
              type="submit"
              className="h-11 w-full rounded-xl font-semibold shadow-xs transition-all active:scale-[0.99]"
              disabled={busy || !mounted}
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Overujem e-mail...
                </>
              ) : (
                "Pokračovať"
              )}
            </Button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={handlePasswordSubmit}>
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-medium">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                E-mail
              </label>
              <div className="flex h-11 items-center justify-between rounded-xl border border-border bg-muted/40 px-3 text-sm">
                <span className="truncate">{email}</span>
                <button
                  type="button"
                  className="ml-2 shrink-0 text-xs font-semibold underline"
                  onClick={resetToEmail}
                >
                  Zmeniť
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label
                htmlFor="password"
                className="flex items-center gap-1.5 text-xs font-medium"
              >
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                {firstLogin ? "Zvoľte heslo" : "Heslo"}
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={firstLogin ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full forenx-input text-sm outline-none transition-all"
              />
            </div>
            {firstLogin && (
              <div className="space-y-1">
                <label
                  htmlFor="password-confirm"
                  className="flex items-center gap-1.5 text-xs font-medium"
                >
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  Potvrďte heslo
                </label>
                <input
                  id="password-confirm"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="h-11 w-full forenx-input text-sm outline-none transition-all"
                />
              </div>
            )}
            <Button
              type="submit"
              className="h-11 w-full rounded-xl font-semibold shadow-xs transition-all active:scale-[0.99]"
              disabled={busy || !mounted}
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {firstLogin ? "Nastavujem heslo..." : "Prihlasujem..."}
                </>
              ) : firstLogin ? (
                "Nastaviť heslo"
              ) : (
                "Prihlásiť sa"
              )}
            </Button>
          </form>
        )}

        <p className="text-center text-caption">
          <Link to="/" className="underline">
            Späť na úvod
          </Link>
        </p>
      </div>
    </main>
  );
}
