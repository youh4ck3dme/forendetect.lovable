import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, Save, Settings } from "lucide-react";

import {
  AppHeader,
  BottomNav,
  Card,
  PhoneFrame,
  Screen,
  SectionTitle,
} from "@/components/malte/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/nastavenia")({
  head: () => ({
    meta: [
      { title: "Nastavenia — Forendo" },
      {
        name: "description",
        content: "Nastavenia účtu a projektových údajov aplikácie Forendo.",
      },
      { property: "og:title", content: "Nastavenia — Forendo" },
      {
        property: "og:description",
        content: "Správa účtu a projektových údajov.",
      },
    ],
  }),
  component: SettingsScreen,
});

function SettingsScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [lovableEmail, setLovableEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) return;

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("email, lovable_email")
          .eq("id", authData.user.id)
          .maybeSingle();
        if (profileError) throw profileError;

        if (!active) return;
        setUserId(authData.user.id);
        setAccountEmail(profile?.email || authData.user.email || "");
        setLovableEmail(profile?.lovable_email || "");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Nastavenia sa nepodarilo načítať.",
        );
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!userId) return;

    const nextLovableEmail = lovableEmail.trim();
    if (
      nextLovableEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextLovableEmail)
    ) {
      toast.error("Zadajte platný Lovable e-mail.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        email: accountEmail || null,
        lovable_email: nextLovableEmail || null,
      });
      if (error) throw error;
      setLovableEmail(nextLovableEmail);
      toast.success("Nastavenia boli uložené.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Nastavenia sa nepodarilo uložiť.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <PhoneFrame>
      <AppHeader title="Nastavenia" back />

      <Screen>
        <SectionTitle>Účet</SectionTitle>
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Settings className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Projektové nastavenia</p>
              <p className="text-[11px] text-muted-foreground">
                Lovable e-mail je pomocný údaj pre správu projektu. Nemení
                prihlasovací účet.
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="account-email" className="text-[11px]">
                Prihlasovací e-mail
              </Label>
              <Input
                id="account-email"
                type="email"
                value={accountEmail}
                readOnly
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="lovable-email"
                className="flex items-center gap-1.5 text-[11px]"
              >
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Lovable e-mail
              </Label>
              <Input
                id="lovable-email"
                type="email"
                autoComplete="email"
                placeholder="meno@example.com"
                value={lovableEmail}
                onChange={(event) => setLovableEmail(event.target.value)}
                disabled={loading || saving}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || saving || !userId}
            >
              <Save className="mr-1 h-4 w-4" aria-hidden />
              {saving ? "Ukladám..." : "Uložiť nastavenia"}
            </Button>
          </form>
        </Card>
      </Screen>

      <BottomNav />
    </PhoneFrame>
  );
}
