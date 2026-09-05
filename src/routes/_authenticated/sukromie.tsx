import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Download, ShieldAlert } from "lucide-react";

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
import { BRAND } from "@/config/brand";
import { exportMyData, deleteMyAccount } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";
import { clearClientState } from "@/lib/pwa";

export const Route = createFileRoute("/_authenticated/sukromie")({
  head: () => ({
    meta: [
      { title: `Súkromie a podmienky — ${BRAND.name}` },
      {
        name: "description",
        content:
          "Aké údaje aplikácia spracúva, ako si ich exportovať a ako zmazať prípad alebo celý účet.",
      },
      { property: "og:title", content: `Súkromie a podmienky — ${BRAND.name}` },
      {
        property: "og:description",
        content: "Spracovanie údajov, export a vymazanie účtu.",
      },
    ],
  }),
  component: PrivacyScreen,
});

function PrivacyScreen() {
  const runExport = useServerFn(exportMyData);
  const runDelete = useServerFn(deleteMyAccount);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    try {
      const { json } = await runExport({ data: undefined });
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `forendo-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Export údajov bol stiahnutý.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export zlyhal.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteAccount() {
    setBusy(true);
    try {
      await runDelete({ data: { confirmEmail } });
      await supabase.auth.signOut();
      queryClient.clear();
      await clearClientState();
      toast.success("Účet a údaje boli zmazané.");
      void navigate({ to: "/auth", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mazanie zlyhalo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PhoneFrame>
      <AppHeader title="Súkromie a podmienky" />
      <Screen>
        <SectionTitle>Aké údaje spracúvame</SectionTitle>
        <Card className="space-y-2 text-[12px] leading-relaxed text-muted-foreground">
          <p>
            Prihlasovacie údaje (e-mail, prípadne profil z Google), obsah vašich prípadov
            (subjekty, transakcie, vzťahy, zbrane, udalosti), nahraté súbory importov, technické
            záznamy o úkonoch a stav predplatného.
          </p>
          <p>
            Údaje sú viditeľné len pre váš účet — prístup je vynútený na úrovni databázy. Text
            posielaný AI asistentovi je pred odoslaním pseudonymizovaný.
          </p>
          <p>{BRAND.disclaimer}</p>
        </Card>

        <SectionTitle>Doplniť pred spustením</SectionTitle>
        <Card className="space-y-1 text-[12px] text-muted-foreground">
          <p>Tieto údaje zatiaľ nie sú známe a musia sa doplniť pred ostrým používaním:</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>Identita a kontakt prevádzkovateľa (obchodné meno, sídlo, e-mail).</li>
            <li>Doba uchovávania údajov po zrušení účtu.</li>
            <li>Zoznam sprostredkovateľov a zmluvné podmienky s nimi.</li>
            <li>Právny základ spracúvania pre konkrétne použitie.</li>
          </ul>
          <p className="pt-1">
            Tento text je pracovný návrh, nie právne overený dokument. Pred zverejnením ho nechajte
            posúdiť právnikovi.
          </p>
        </Card>

        <SectionTitle>Export údajov</SectionTitle>
        <Card className="space-y-3">
          <p className="text-[12px] text-muted-foreground">
            Stiahnite si všetky svoje údaje v strojovo čitateľnom formáte JSON.
          </p>
          <Button variant="outline" className="w-full" onClick={handleExport} disabled={busy}>
            <Download className="mr-1 h-4 w-4" aria-hidden /> Stiahnuť moje údaje (JSON)
          </Button>
        </Card>

        <SectionTitle>Vymazanie účtu</SectionTitle>
        <Card className="space-y-3">
          <p className="text-[12px] text-muted-foreground">
            Vymažú sa všetky prípady, importované súbory, AI výstupy, technické záznamy aj samotná
            identita. Operácia je nevratná. Ak niektorý krok zlyhá, uvidíte chybu a mazanie môžete
            bezpečne zopakovať.
          </p>
          <p className="text-[11px] text-muted-foreground">
            Zálohy infraštruktúry a záznamy potrebné pre účtovníctvo alebo platobného poskytovateľa
            môžu obsahovať údaje ešte určitý čas po vymazaní — nejde o okamžité úplné odstránenie
            zo všetkých systémov.
          </p>
          <div className="space-y-1">
            <Label htmlFor="confirm-email" className="text-[11px]">
              Potvrďte e-mailom svojho účtu
            </Label>
            <Input
              id="confirm-email"
              type="email"
              autoComplete="off"
              value={confirmEmail}
              onChange={(event) => setConfirmEmail(event.target.value)}
              placeholder="vas@email.sk"
            />
          </div>
          <Button
            variant="destructive"
            className="w-full"
            disabled={busy || !confirmEmail}
            onClick={handleDeleteAccount}
          >
            <ShieldAlert className="mr-1 h-4 w-4" aria-hidden /> Trvalo zmazať účet a všetky údaje
          </Button>
        </Card>
      </Screen>
      <BottomNav />
    </PhoneFrame>
  );
}
