import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, ExternalLink, ShieldCheck } from "lucide-react";

import {
  AppHeader,
  BottomNav,
  Card,
  PhoneFrame,
  Screen,
  SectionTitle,
} from "@/components/malte/Shell";
import { Button } from "@/components/ui/button";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PLANS, YEARLY_PRICE_ID } from "@/config/billing";
import { getSubscriptionState, createPortalSession } from "@/lib/payments.functions";
import { getStripeEnvironment, paymentsConfigured } from "@/lib/stripe";
import { BRAND } from "@/config/brand";

export const Route = createFileRoute("/_authenticated/predplatne")({
  head: () => ({
    meta: [
      { title: `Predplatné — ${BRAND.name}` },
      {
        name: "description",
        content: "Plán, kvóty serverových služieb a správa fakturácie. Ceny sú zatiaľ testovacie.",
      },
      { property: "og:title", content: `Predplatné — ${BRAND.name}` },
      { property: "og:description", content: "Plán, kvóty a správa fakturácie." },
    ],
  }),
  component: SubscriptionScreen,
});

function SubscriptionScreen() {
  const configured = paymentsConfigured();
  const fetchState = useServerFn(getSubscriptionState);
  const openPortal = useServerFn(createPortalSession);
  const queryClient = useQueryClient();
  const [checkoutPrice, setCheckoutPrice] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => fetchState({ data: { environment: getStripeEnvironment() } }),
    enabled: configured,
  });

  const plan = data?.plan ?? "free";

  async function handlePortal() {
    try {
      const result = await openPortal({
        data: { environment: getStripeEnvironment(), returnUrl: window.location.href },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank", "noopener");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Portál sa nepodarilo otvoriť.");
    }
  }

  return (
    <PhoneFrame>
      <AppHeader title="Predplatné" />
      <Screen>
        <PaymentTestModeBanner />

        {!configured ? (
          <Card>
            <p className="text-sm font-semibold">Platby nie sú nakonfigurované</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Aplikácia funguje bez platieb. Platený plán bude dostupný po dokončení nastavenia
              platieb v projekte — dovtedy sa tu nezobrazuje žiadna úspešná platba.
            </p>
          </Card>
        ) : null}

        <Card className="space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
            <p className="text-sm font-semibold">Váš plán: {isLoading ? "…" : PLANS[plan].name}</p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Stav: {data?.status ?? "neaktívny"}
            {data?.currentPeriodEnd
              ? ` • platné do ${new Date(data.currentPeriodEnd).toLocaleDateString("sk-SK")}`
              : ""}
            {data?.cancelAtPeriodEnd ? " • zrušené ku koncu obdobia" : ""}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Aj po skončení predplatného zostáva prístup k existujúcim údajom, ich exportu aj
            vymazaniu. Obmedzia sa len nové serverové operácie nad rámec základných kvót.
          </p>
        </Card>

        <SectionTitle>Plány</SectionTitle>

        {(["free", "pro"] as const).map((id) => {
          const p = PLANS[id];
          return (
            <Card key={id} className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="text-sm font-semibold tnum">
                  {p.amount === null ? "0 €" : `${p.amount} ${p.currency}`}
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {p.interval === "month" ? " / mesiac" : p.interval === "year" ? " / rok" : ""}
                  </span>
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground">{p.description}</p>
              <ul className="space-y-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[11px]">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {id === "pro" && plan !== "pro" ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={!configured}
                    onClick={() => setCheckoutPrice(p.priceId)}
                  >
                    Vyskúšať mesačne
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!configured}
                    onClick={() => setCheckoutPrice(YEARLY_PRICE_ID)}
                  >
                    Ročne
                  </Button>
                </div>
              ) : null}
            </Card>
          );
        })}

        {checkoutPrice ? (
          <Card className="space-y-3 p-3">
            <StripeEmbeddedCheckout
              priceId={checkoutPrice}
              returnUrl={`${window.location.origin}/predplatne?checkout=done`}
            />
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setCheckoutPrice(null);
                void queryClient.invalidateQueries({ queryKey: ["subscription"] });
              }}
            >
              Zavrieť platbu
            </Button>
          </Card>
        ) : null}

        {plan === "pro" || data?.status !== "inactive" ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={handlePortal}
            disabled={!configured}
          >
            <ExternalLink className="mr-1 h-4 w-4" aria-hidden /> Správa fakturácie
          </Button>
        ) : null}

        <p className="text-[10px] text-muted-foreground">
          Ceny sú testovacie a nepredstavujú finálny cenník. Stav predplatného sa vždy overuje u
          poskytovateľa platby, nie podľa návratu z platobnej stránky.
        </p>
      </Screen>
      <BottomNav />
    </PhoneFrame>
  );
}
