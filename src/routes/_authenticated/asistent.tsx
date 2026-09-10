import { createFileRoute } from "@tanstack/react-router";
import { Assistant } from "@/components/malte/Assistant";

export const Route = createFileRoute("/_authenticated/asistent")({
  head: () => ({
    meta: [
      { title: "Forenzný Autopilot — Forendo" },
      {
        name: "description",
        content:
          "1 Drop → 1 Obrazovka → 1 Export. Forenzná analýza spisov, detekcia zlomov v reťazci a simulátor útoku obhajoby.",
      },
      { property: "og:title", content: "Forenzný Autopilot — Forendo" },
      {
        property: "og:description",
        content:
          "Procesná analýza spisu, Likelihood Ratio a rozsudkový formát § 168 TP.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Assistant,
});
