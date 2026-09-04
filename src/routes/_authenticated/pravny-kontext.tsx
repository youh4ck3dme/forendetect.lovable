import { useActiveCase } from "@/hooks/useActiveCase";
import { createFileRoute } from "@tanstack/react-router";
import { Scale, ShieldAlert } from "lucide-react";
import {
  AppHeader,
  BottomNav,
  Card,
  PhoneFrame,
  RiskChip,
  Screen,
  SectionTitle,
} from "@/components/malte/Shell";
import { buildLegalContext, severityLabel } from "@/forensic";

export const Route = createFileRoute("/_authenticated/pravny-kontext")({
  head: () => ({
    meta: [
      { title: "Právny kontext — Malte" },
      {
        name: "description",
        content:
          "Posúdenie detekcií vášho prípadu podľa zákonov 300/2005, 301/2005 a 460/1992 vrátane procesného postavenia osôb.",
      },
      { property: "og:title", content: "Právny kontext — Malte" },
      {
        property: "og:description",
        content: "Ustanovenia naviazané na konkrétne forenzné detekcie s per-zákonovým gatingom.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LegalScreen,
});

const legal = buildLegalContext(analysis);

function LegalScreen() {
  const { activeCase, analysis } = useActiveCase();
  return (
    <PhoneFrame>
      <AppHeader
        title="Právny kontext"
        back
        actions={<Scale className="h-5 w-5 opacity-90" aria-hidden />}
      />
      <Screen>
        <Card className="space-y-2">
          <h1 className="text-base font-semibold tracking-tight">
            Právne posúdenie prípadu {activeCase.name}
          </h1>
          <p className="text-caption">
            {legal.assessments.length} posúdení naviazaných na konkrétne detekcie •{" "}
            {legal.availableLaws.length} dostupných predpisov
            {legal.unavailableLaws.length > 0
              ? ` • ${legal.unavailableLaws.length} nedostupných`
              : ""}
          </p>
        </Card>

        <SectionTitle>Právne zdroje</SectionTitle>
        <Card className="divide-y divide-border p-0">
          {legal.sources.map((source) => (
            <div key={source.code} className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{source.code}</p>
                <p className="text-caption">{source.title}</p>
                <p className="text-caption font-mono">verzia {source.version}</p>
              </div>
              <RiskChip level={source.availability === "available" ? "low" : "high"}>
                {source.availability === "available" ? "Dostupné" : "Nedostupné"}
              </RiskChip>
            </div>
          ))}
        </Card>

        {legal.gaps.length > 0 && (
          <>
            <SectionTitle>Medzery v posúdení</SectionTitle>
            <Card className="space-y-3">
              {legal.gaps.map((gap) => (
                <div key={gap.law} className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-risk-medium" aria-hidden />
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] font-semibold">{gap.code}</p>
                    <p className="text-caption">{gap.detail}</p>
                  </div>
                </div>
              ))}
            </Card>
          </>
        )}

        <SectionTitle>Posúdenia ({legal.assessments.length})</SectionTitle>
        {legal.assessments.map((item) => (
          <Card key={item.id} className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {item.provision.ref} — {item.provision.title}
                </p>
                <p className="text-caption font-mono">
                  {item.law} • verzia {item.lawVersion}
                </p>
              </div>
              <RiskChip level={item.severity}>{severityLabel[item.severity]}</RiskChip>
            </div>
            <p className="text-caption">{item.provision.summary}</p>
            <ul className="space-y-1">
              {item.basis.map((basis) => (
                <li key={basis} className="text-caption flex gap-2">
                  <span aria-hidden>•</span>
                  <span className="min-w-0">{basis}</span>
                </li>
              ))}
            </ul>
            <p className="text-caption">Miera podpory detekciami: {item.confidence} %</p>
          </Card>
        ))}

        <SectionTitle>Procesné postavenie osôb</SectionTitle>
        <Card className="divide-y divide-border p-0">
          {legal.persons.map((person) => (
            <div key={person.entityId} className="space-y-1 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{person.entityName}</p>
                <RiskChip level="muted">{person.label}</RiskChip>
              </div>
              <p className="text-caption">{person.reason}</p>
            </div>
          ))}
        </Card>
      </Screen>
      <BottomNav />
    </PhoneFrame>
  );
}
