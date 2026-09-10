import { describe, expect, it } from "vitest";
import { getStripeErrorMessage, paymentsConfigured } from "@/lib/stripe.server";

describe("Payments error contract", () => {
  it("paymentsConfigured je false bez kľúčov", () => {
    const prevS = process.env["STRIPE_SANDBOX_API_KEY"];
    const prevL = process.env["LOVABLE_API_KEY"];
    delete process.env["STRIPE_SANDBOX_API_KEY"];
    delete process.env["LOVABLE_API_KEY"];
    try {
      expect(paymentsConfigured("sandbox")).toBe(false);
    } finally {
      if (prevS) process.env["STRIPE_SANDBOX_API_KEY"] = prevS;
      if (prevL) process.env["LOVABLE_API_KEY"] = prevL;
    }
  });

  it("getStripeErrorMessage skladá hlášku z Stripe objektu, inak generic", () => {
    expect(
      getStripeErrorMessage({
        message: "card declined",
        code: "card_declined",
        decline_code: "insufficient_funds",
      }),
    ).toContain("card declined");
    expect(getStripeErrorMessage("nope")).toBe("Stripe request failed");
    expect(getStripeErrorMessage(null)).toBe("Stripe request failed");
  });
});
