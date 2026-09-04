import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import malteMark from "@/assets/malte-mark.png";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Prihlásenie — Malte" },
      {
        name: "description",
        content: "Prihláste sa do Malte cez Google alebo e-mail a pracujte na vlastných prípadoch.",
      },
      { property: "og:title", content: "Prihlásenie — Malte" },
      { property: "og:description", content: "Prístup k vašim forenzným prípadom v Malte." },
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

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active && data.user) void navigate({ to: "/prehlad", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) void navigate({ to: "/prehlad", replace: true });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  async function handleGoogle() {
    setBusy(true);
    try {
      await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Prihlásenie zlyhalo.");
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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Niečo sa pokazilo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-background px-5 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <img src={malteMark} alt="" width={40} height={40} className="h-10 w-10" aria-hidden />
          <h1 className="text-2xl font-extrabold tracking-tight">
            {mode === "signin" ? "Prihlásenie do Malte" : "Vytvorenie účtu"}
          </h1>
          <p className="text-caption">Vaše prípady sú súkromné a viditeľné len pre vás.</p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={busy}
          onClick={handleGoogle}
        >
          Pokračovať cez Google
        </Button>

        <div className="flex items-center gap-3 text-caption">
          <span className="h-px flex-1 bg-border" />
          alebo
          <span className="h-px flex-1 bg-border" />
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-medium">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-xs font-medium">
              Heslo
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "signin" ? "Prihlásiť sa" : "Zaregistrovať sa"}
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
