import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import type { Database } from "@/integrations/supabase/types";

let _supabase: SupabaseClient<Database> | null = null;
function getSupabase(): SupabaseClient<Database> {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    );
  }
  return _supabase;
}

type StripePrice = {
  lookup_key?: string;
  metadata?: { lovable_external_id?: string };
  id?: string;
};

type StripeSubscription = {
  id: string;
  status: string;
  metadata?: { userId?: string };
  items?: {
    data?: Array<{
      price?: StripePrice;
      current_period_end?: number;
    }>;
  };
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  customer?: string | { id?: string };
};

function planFromPrice(price?: StripePrice | null): { priceId: string | null; plan: string } {
  const priceId: string | null =
    price?.lookup_key ?? price?.metadata?.lovable_external_id ?? price?.id ?? null;
  const plan = priceId && priceId.startsWith("pro_") ? "pro" : "free";
  return { priceId, plan };
}

function iso(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

async function upsertSubscription(subscription: StripeSubscription, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("payments webhook: subscription without userId metadata");
    return;
  }
  const item = subscription.items?.data?.[0];
  const { priceId, plan } = planFromPrice(item?.price);
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        environment: env,
        provider: "stripe",
        customer_id:
          typeof subscription.customer === "string"
            ? subscription.customer
            : (subscription.customer?.id ?? null),
        subscription_id: subscription.id,
        price_id: priceId,
        plan: subscription.status === "canceled" ? "free" : plan,
        status: subscription.status,
        current_period_end: iso(periodEnd),
        cancel_at_period_end: subscription.cancel_at_period_end ?? false,
        last_event_at: new Date().toISOString(),
      },
      { onConflict: "user_id,environment" },
    );
}

async function markCanceled(subscription: StripeSubscription, env: StripeEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({
      status: "canceled",
      plan: "free",
      last_event_at: new Date().toISOString(),
    })
    .eq("subscription_id", subscription.id)
    .eq("environment", env);
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("payments webhook: invalid env", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;

        let event: Awaited<ReturnType<typeof verifyWebhook>>;
        try {
          event = await verifyWebhook(request, env);
        } catch (e) {
          console.error("payments webhook: signature verification failed", e);
          return new Response("Webhook error", { status: 400 });
        }

        const supabase = getSupabase();

        const object = event.data.object as unknown as StripeSubscription;

        // Idempotencia: duplicitná udalosť sa zapíše len raz.
        const { error: claimError } = await supabase.from("billing_events").insert({
          event_id: `${env}:${event.id}`,
          provider: "stripe",
          type: event.type,
          user_id: object.metadata?.userId ?? null,
          event_created_at: iso(event.created),
          result: "processing",
        });
        if (claimError) {
          // Unikátny kľúč = už spracované (alebo práve spracúvané).
          return Response.json({ received: true, duplicate: true });
        }

        let result = "ok";
        try {
          switch (event.type) {
            case "customer.subscription.created":
            case "customer.subscription.updated":
              await upsertSubscription(object, env);
              break;
            case "customer.subscription.deleted":
              await markCanceled(object, env);
              break;
            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded":
            case "invoice.paid":
              // Stav predplatného nesie customer.subscription.*; tu netreba nič.
              break;
            default:
              result = "ignored";
          }
        } catch (e) {
          console.error("payments webhook: handler failed", e);
          result = "failed";
        }

        await supabase
          .from("billing_events")
          .update({ result, processed_at: new Date().toISOString() })
          .eq("event_id", `${env}:${event.id}`);

        return Response.json({ received: true });
      },
    },
  },
});
