import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type OAuthResult = {
  redirect_url?: string;
  redirect_to?: string;
  client?: { name?: string } | null;
};
type OAuthApi = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md p-6 text-sm text-muted-foreground">
      Autorizáciu sa nepodarilo načítať: {String((error as Error)?.message ?? error)}
    </main>
  ),
});

function Consent() {
  const { authorization_id: authorizationId } = Route.useSearch();
  const [session, setSession] = useState<boolean | null>(null);
  const [details, setDetails] = useState<OAuthResult | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(Boolean(data.session));
      if (!data.session || !authorizationId) return;
      const { data: d, error: e } = await oauth().getAuthorizationDetails(authorizationId);
      if (e) {
        setError(e.message);
        return;
      }
      const immediate = d?.redirect_url ?? d?.redirect_to;
      if (immediate && !d?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(d);
    })();
  }, [authorizationId]);

  async function decide(approve: boolean) {
    if (!authorizationId) return;
    setBusy(true);
    setError(null);
    const { data, error: e } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (e) {
      setBusy(false);
      setError(e.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Autorizačný server nevrátil návratovú adresu.");
      return;
    }
    window.location.href = target;
  }

  async function signIn(mode: "in" | "up") {
    setBusy(true);
    setError(null);
    const next = window.location.href;
    const { error: e } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: next } });
    setBusy(false);
    if (e) {
      setError(e.message);
      return;
    }
    window.location.href = next;
  }

  async function signInGoogle() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.href,
    });
    if (result.error) {
      setError(String(result.error));
      return;
    }
    if (result.redirected) return;
    window.location.reload();
  }

  if (!authorizationId) {
    return <main className="mx-auto max-w-md p-6">Chýba parameter autorizácie.</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {session === null && <p className="text-sm text-muted-foreground">Načítavam…</p>}

      {session === false && (
        <div className="space-y-3 rounded-xl border p-5">
          <h1 className="text-lg font-semibold">Prihlás sa do Forendo</h1>
          <p className="text-sm text-muted-foreground">
            Pre pripojenie AI klienta sa najprv prihlás.
          </p>
          <Input placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            type="password"
            placeholder="Heslo"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex gap-2">
            <Button disabled={busy} onClick={() => void signIn("in")}>
              Prihlásiť sa
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => void signIn("up")}>
              Registrovať
            </Button>
          </div>
          <Button
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => void signInGoogle()}
          >
            Pokračovať cez Google
          </Button>
        </div>
      )}

      {session === true && (
        <div className="space-y-3 rounded-xl border p-5">
          <h1 className="text-lg font-semibold">
            Pripojiť {details?.client?.name ?? "klienta"} k Forendo
          </h1>
          <p className="text-sm text-muted-foreground">
            Klient bude môcť volať nástroje tejto aplikácie vo tvojom mene. Prístupové pravidlá
            aplikácie zostávajú v platnosti.
          </p>
          <div className="flex gap-2">
            <Button disabled={busy} onClick={() => void decide(true)}>
              Schváliť
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => void decide(false)}>
              Zrušiť pripojenie
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
