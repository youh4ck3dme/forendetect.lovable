import { useState, type ComponentType, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, MessageSquare, Sparkles, Terminal, Users } from "lucide-react";
import {
  AppHeader,
  BottomNav,
  Card,
  PhoneFrame,
  Screen,
  SectionTitle,
} from "@/components/malte/Shell";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/_authenticated/connect")({
  head: () => ({
    meta: [
      { title: "Pripojiť AI asistenta — Forendo" },
      {
        name: "description",
        content:
          "Návod, ako pripojiť ChatGPT, Claude alebo Claude Code k Forendo MCP serveru a čítať dáta svojho prípadu.",
      },
      { property: "og:title", content: "Pripojiť AI asistenta — Forendo" },
      {
        property: "og:description",
        content:
          "Návod, ako pripojiť ChatGPT, Claude alebo Claude Code k Forendo MCP serveru.",
      },
    ],
  }),
  component: ConnectPage,
});

function useMcpUrl() {
  return typeof window !== "undefined"
    ? new URL("/mcp", window.location.origin).toString()
    : "/mcp";
}

function CopyBlock({ text, mono = true }: { text: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="flex items-center gap-2">
      <pre
        className={`flex-1 overflow-x-auto rounded-xl bg-secondary p-3 text-[11px] text-secondary-foreground ${mono ? "font-mono" : ""}`}
      >
        {text}
      </pre>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={copy}
        aria-label={copied ? "Skopírované" : "Kopírovať adresu"}
        className="shrink-0"
      >
        {copied ? (
          <Check className="h-4 w-4 text-primary" aria-hidden />
        ) : (
          <Copy className="h-4 w-4" aria-hidden />
        )}
      </Button>
    </div>
  );
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span
            aria-hidden
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
          >
            {i + 1}
          </span>
          <span className="min-w-0 pt-0.5 text-sm leading-relaxed">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function ConnectPage() {
  const mcpUrl = useMcpUrl();
  const claudeCodeCmd = `claude mcp add --scope user --transport http forendo '${mcpUrl}'`;
  const claudeDeepLink = `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=${encodeURIComponent("Forendo")}&connectorUrl=${encodeURIComponent(mcpUrl)}`;

  const sections: {
    id: string;
    icon: ComponentType<{ className?: string }>;
    title: string;
    connect: ReactNode[];
    refresh: ReactNode[];
  }[] = [
    {
      id: "chatgpt",
      icon: MessageSquare,
      title: "ChatGPT",
      connect: [
        <>
          Otvorte{" "}
          <a
            className="font-medium text-primary underline"
            href="https://chatgpt.com/#settings/Connectors/Advanced"
            target="_blank"
            rel="noreferrer"
          >
            nastavenia konektorov
          </a>{" "}
          a zapnite vývojársky režim. Ak nie je dostupný, požiadajte správcu
          ChatGPT o jeho povolenie.
        </>,
        <>
          Otvorte{" "}
          <a
            className="font-medium text-primary underline"
            href="https://chatgpt.com/plugins#settings/Connectors?create-connector=true&redirectAfter=%2Fplugins"
            target="_blank"
            rel="noreferrer"
          >
            dialóg novej aplikácie
          </a>
          .
        </>,
        "Ako názov zadajte Forendo a do poľa adresy vložte adresu servera uvedenú vyššie.",
        "Skontrolujte údaje, označte „I understand and want to continue“ a kliknite Create. Toto upozornenie ChatGPT zobrazuje pri každom vlastnom serveri.",
        "Aplikáciu zapnite v paneli správy a požiadajte ChatGPT, aby ju použil.",
      ],
      refresh: [
        "Otvorte stránku Plugins v ChatGPT a vyberte Forendo.",
        "Zrolujte do časti Information a kliknite Refresh.",
        "Ak sa adresa zmenila, ChatGPT ju nevie upraviť — aplikáciu odstráňte a zopakujte pripojenie s aktuálnou adresou.",
        "Otvorte nový chat a požiadajte ChatGPT, aby aplikáciu použil.",
      ],
    },
    {
      id: "claude",
      icon: Sparkles,
      title: "Claude",
      connect: [
        <>
          Otvorte{" "}
          <a
            className="font-medium text-primary underline"
            href={claudeDeepLink}
            target="_blank"
            rel="noreferrer"
          >
            predvyplnený formulár konektora
          </a>
          .
        </>,
        "Skontrolujte údaje a kliknite Add.",
        "Ak sa formulár neotvorí, prejdite na stránku Connectors v Claude, zvoľte Add custom connector, pomenujte ho Forendo a vložte adresu servera.",
        "Konektor zapnite v paneli správy a požiadajte Claude, aby ho použil.",
      ],
      refresh: [
        "Otvorte stránku Connectors v Claude a vyberte Forendo.",
        "Obnovte alebo aktualizujte nástroje konektora.",
        "Ak sa adresa zmenila, Claude ju nevie upraviť — konektor odstráňte a zopakujte pripojenie s aktuálnou adresou.",
        "Požiadajte Claude, aby aplikáciu použil.",
      ],
    },
    {
      id: "claude-code",
      icon: Terminal,
      title: "Claude Code",
      connect: [
        "Spustite v termináli tento príkaz:",
        <CopyBlock key="cmd" text={claudeCodeCmd} />,
        "Otvorte Claude Code a príkazom /mcp overte, že je Forendo pripojené. Ak server vyžaduje prihlásenie, Claude Code vás naň z tejto ponuky nasmeruje.",
        "Požiadajte Claude Code, aby aplikáciu použil.",
      ],
      refresh: [
        "Spustite novú reláciu Claude Code — pri pripojení si načíta najnovšie nástroje.",
        <>
          Ak sa adresa zmenila, spustite{" "}
          <span className="font-mono text-xs">claude mcp remove forendo</span> a
          potom znova inštalačný príkaz s aktuálnou adresou.
        </>,
        "Požiadajte Claude Code, aby aplikáciu použil.",
      ],
    },
    {
      id: "others",
      icon: Users,
      title: "Ostatní AI asistenti",
      connect: [
        "Otvorte v klientovi nastavenia MCP serverov alebo vlastných konektorov.",
        "Vytvorte nové vzdialené pripojenie MCP servera.",
        "Pomenujte ho Forendo a vložte adresu servera.",
        "Dokončite prípadné prihlásenie alebo autorizáciu.",
        "Pripojenie zapnite a požiadajte asistenta, aby aplikáciu použil.",
      ],
      refresh: [
        "Otvorte nastavenia MCP servera alebo konektora v klientovi.",
        "Vyberte pripojenie Forendo.",
        "Obnovte zoznam nástrojov, znovu načítajte server alebo sa znovu pripojte.",
        "Ak sa adresa zmenila, vložte aktuálnu adresu uvedenú vyššie.",
        "Otvorte nový chat alebo reláciu a požiadajte asistenta, aby aplikáciu použil.",
      ],
    },
  ];

  return (
    <PhoneFrame>
      <AppHeader title="Pripojiť AI asistenta" back />
      <Screen>
        <Card className="space-y-3">
          <p className="text-sm font-semibold">Adresa MCP servera</p>
          <p className="text-caption">
            Pripojený asistent dokáže čítať súhrn vášho prípadu, nálezy,
            subjekty, transakcie a sieťové súvislosti — len na čítanie a len
            vaše dáta.
          </p>
          <CopyBlock text={mcpUrl} />
        </Card>

        <SectionTitle>Pripojenie podľa asistenta</SectionTitle>

        <Card className="p-0">
          <Accordion type="single" collapsible>
            {sections.map(({ id, icon: Icon, title, connect }) => (
              <AccordionItem key={id} value={id} className="px-4">
                <AccordionTrigger className="gap-3 py-3.5">
                  <span className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="text-sm font-semibold">{title}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <Steps items={connect} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>

        <SectionTitle>Obnovenie po zmene aplikácie</SectionTitle>

        <Card className="space-y-3">
          <p className="text-caption">
            Pripojený asistent si zapamätá zoznam nástrojov. Keď aplikáciu
            zmeníme, konektor obnovte, aby videl najnovšiu verziu:
          </p>
          <Accordion type="single" collapsible>
            {sections.map(({ id, title, refresh }) => (
              <AccordionItem key={id} value={`refresh-${id}`}>
                <AccordionTrigger className="py-3 text-sm font-medium">
                  {title}
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <Steps items={refresh} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>

        <Card>
          <p className="text-caption">
            Server je chránený prihlásením a sprístupňuje výhradne dáta vášho
            účtu. Cez pripojenie sa nedá nič meniť ani mazať.
          </p>
        </Card>
      </Screen>
      <BottomNav />
    </PhoneFrame>
  );
}
