import type { ForensicDossier } from "./types";

// ─── Export § 168 TP reportu do tlačiteľnej HTML → PDF ───────────

export function exportDossierToPDF(dossier: ForensicDossier): void {
  const html = buildReportHTML(dossier);

  const win = window.open("", "_blank");
  if (!win) {
    alert("Povoľte vyskakovacie okná pre export reportu.");
    return;
  }

  win.document.write(html);
  win.document.close();

  setTimeout(() => {
    win.focus();
    win.print();
  }, 500);
}

export function buildReportHTML(d: ForensicDossier): string {
  const tracesRows = d.evidenceStrength.traces
    .map(
      (t) => `
    <tr>
      <td>${t.id}</td>
      <td>${t.name}</td>
      <td style="text-align:center">${t.lr}</td>
      <td style="text-align:center">${strengthEmoji(t.light)}</td>
      <td>${t.strength}</td>
      <td>${t.paragraph}</td>
    </tr>`,
    )
    .join("");

  const attacksHtml = d.defenseAttack.attacks
    .map(
      (a) => `
    <div class="attack">
      <p class="attack-claim"><strong>Obhajoba povie:</strong> ${a.defenseClaim}</p>
      <p class="attack-counter"><strong>Protiúder:</strong> ${a.counterStrike}</p>
      <p class="attack-gap"><em>Medzera v spise:</em> ${a.evidenceGap} — <strong>Riziko: ${a.risk}</strong></p>
    </div>`,
    )
    .join("");

  const questionsHtml = d.investigativeAnswers
    ? `
  <h2>Záväzný analytický rámec ÚBOK (3 vyšetrovacie otázky)</h2>
  <div class="section">
    <div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:8px 12px;margin:8px 0">
      <h3 style="margin:4px 0">1. ${d.investigativeAnswers.q1_buyer_seller.question}</h3>
      <p style="margin:4px 0">${d.investigativeAnswers.q1_buyer_seller.answer}</p>
      <p style="font-size:9pt;color:#555;margin:2px 0"><strong>Osoby:</strong> ${d.investigativeAnswers.q1_buyer_seller.identifiedPersons.join(", ")} · <strong>Istota:</strong> ${d.investigativeAnswers.q1_buyer_seller.confidenceLevel}%</p>
    </div>
    <div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:8px 12px;margin:8px 0">
      <h3 style="margin:4px 0">2. ${d.investigativeAnswers.q2_planner_coordinator.question}</h3>
      <p style="margin:4px 0">${d.investigativeAnswers.q2_planner_coordinator.answer}</p>
      <p style="font-size:9pt;color:#555;margin:2px 0"><strong>Osoby:</strong> ${d.investigativeAnswers.q2_planner_coordinator.identifiedPersons.join(", ")} · <strong>Istota:</strong> ${d.investigativeAnswers.q2_planner_coordinator.confidenceLevel}%</p>
    </div>
    <div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:8px 12px;margin:8px 0">
      <h3 style="margin:4px 0">3. ${d.investigativeAnswers.q3_financier.question}</h3>
      <p style="margin:4px 0">${d.investigativeAnswers.q3_financier.answer}</p>
      <p style="font-size:9pt;color:#555;margin:2px 0"><strong>Osoby:</strong> ${d.investigativeAnswers.q3_financier.identifiedPersons.join(", ")} · <strong>Istota:</strong> ${d.investigativeAnswers.q3_financier.confidenceLevel}%</p>
    </div>
  </div>`
    : "";

  const contradictionsHtml =
    d.testimonyContradictions && d.testimonyContradictions.length > 0
      ? `
  <h2>Rozpory vo výpovediach & Matica pravdovravnosti</h2>
  <table>
    <thead>
      <tr>
        <th>Téma rozporu</th>
        <th>Tvrdenie v konaní</th>
        <th>Skutkový stav zo spisu</th>
        <th style="text-align:center">Miera nepravdy</th>
        <th>Procesný postup</th>
      </tr>
    </thead>
    <tbody>
      ${d.testimonyContradictions
        .map(
          (tc) => `
        <tr>
          <td><strong>${tc.topic}</strong></td>
          <td><em>${tc.personA.name} (${tc.personA.status}):</em> "${tc.personA.claim}"</td>
          <td>${tc.factualRecord}</td>
          <td style="text-align:center;font-weight:bold;color:${tc.deceitPercentage >= 75 ? "#dc2626" : "#d97706"}">${tc.deceitPercentage} %</td>
          <td>${tc.proceduralResolution}</td>
        </tr>`,
        )
        .join("")}
    </tbody>
  </table>`
      : "";

  const financialHtml = d.financialAnalysis
    ? `
  <h2>Forenzná analýza transakcií a tokov financií</h2>
  <div class="section">
    <p><strong>Celkový objem:</strong> ${d.financialAnalysis.totalVolume.toLocaleString("sk-SK")} € · <strong>Hotovosť:</strong> ${d.financialAnalysis.cashVolume.toLocaleString("sk-SK")} € (${d.financialAnalysis.cashRatioPercent} %) · <strong>Prevody:</strong> ${d.financialAnalysis.transferVolume.toLocaleString("sk-SK")} €</p>
    <p><em>Záver o financovaní:</em> ${d.financialAnalysis.financingConclusion}</p>
    <h3>Podozrivé finančné toky</h3>
    <table>
      <thead>
        <tr>
          <th>Dátum</th><th>Platiteľ -> Príjemca</th><th>Suma</th><th>Metóda</th><th>Účel a Red Flag</th>
        </tr>
      </thead>
      <tbody>
        ${d.financialAnalysis.suspiciousFlows
          .map(
            (sf) => `
          <tr>
            <td>${sf.date}</td>
            <td>${sf.payer} ➔ ${sf.recipient}</td>
            <td style="text-align:right;font-weight:bold">${sf.amount.toLocaleString("sk-SK")} €</td>
            <td style="text-align:center">${sf.method}</td>
            <td><strong>${sf.purpose}</strong>: ${sf.redFlag}</td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>
  </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="UTF-8">
<title>Forenzný report — ${d.caseTitle}</title>
<style>
  @page { margin: 2cm; }
  body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.6; color: #1a1a1a; }
  h1 { font-size: 16pt; text-align: center; border-bottom: 2px solid #333; padding-bottom: 8px; }
  h2 { font-size: 13pt; margin-top: 24px; border-bottom: 1px solid #999; padding-bottom: 4px; }
  h3 { font-size: 11pt; margin-top: 18px; }
  .meta { text-align: center; font-size: 10pt; color: #666; margin-bottom: 20px; }
  .index-box { background: #f0f4ff; border: 1px solid #3b82f6; padding: 12px; margin: 16px 0; text-align: center; }
  .index-box .num { font-size: 28pt; font-weight: bold; color: ${d.defendabilityIndex >= 75 ? "#16a34a" : d.defendabilityIndex >= 50 ? "#d97706" : "#dc2626"}; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
  th { background: #f5f5f5; font-weight: bold; }
  .attack { border-left: 3px solid #dc2626; padding: 10px 14px; margin: 10px 0; background: #fef9f9; }
  .attack-claim { color: #991b1b; }
  .attack-counter { color: #166534; }
  .attack-gap { font-size: 10pt; color: #555; }
  .section { margin: 18px 0; }
  .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 9pt; color: #999; text-align: center; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>

<h1>FORENZNÝ REPORT — ${d.caseTitle}</h1>
<div class="meta">
  Spis: ${d.caseId} · Vygenerované: ${new Date(d.generatedAt).toLocaleString("sk-SK")}<br>
  Forenzný Autopilot v1.0 (§ 168 Trestného poriadku)
</div>

<div class="index-box">
  <p>Index obhájiteľnosti obžaloby</p>
  <span class="num">${d.defendabilityIndex}/100</span>
  <p style="font-size:10pt;color:#666">Čím vyššie skóre, tým nepriestrelnejší spis pred súdom</p>
</div>

${questionsHtml}

${contradictionsHtml}

${financialHtml}

<h2>I. Zistený skutkový stav</h2>
<div class="section">
  <p>${d.judgeReadyText.skutkovyStav}</p>
</div>

<h2>II. Vyporiadanie sa s obhajobou obvineného (§ 168 TP)</h2>
<div class="section">
  <p>${d.judgeReadyText.vyporiadanie}</p>
  <h3>Identifikované body útoku obhajoby:</h3>
  ${attacksHtml}
</div>

<h2>III. Vedecké zhodnotenie stôp</h2>
<div class="section">
  <p>${d.judgeReadyText.vedecke}</p>
  <h3>Dôkazová matica</h3>
  <table>
    <thead>
      <tr>
        <th>ID</th><th>Stopa</th><th>LR</th><th>Semafor</th><th>Sila</th><th>§</th>
      </tr>
    </thead>
    <tbody>${tracesRows}</tbody>
  </table>
</div>

<h2>IV. Právne paragrafy — stav</h2>
<table>
  <thead><tr><th>Paragraf</th><th>Názov</th><th>Stav</th><th>Poznámka</th></tr></thead>
  <tbody>
    ${d.evidenceStrength.paragraphs
      .map(
        (p) => `
      <tr>
        <td>${p.para}</td><td>${p.title}</td>
        <td style="text-align:center;font-weight:bold">${p.status}</td>
        <td>${p.note}</td>
      </tr>`,
      )
      .join("")}
  </tbody>
</table>

<div class="footer">
  Tento report bol vygenerovaný Forenzným Autopilotom a slúži ako podporný dokument pre prípravu obžaloby / odôvodnenia rozsudku podľa § 168 Trestného poriadku.
</div>

<div class="no-print" style="text-align:center;margin-top:20px">
  <button onclick="window.print()" style="padding:8px 24px;font-size:12pt;cursor:pointer">Tlačiť / Uložiť ako PDF</button>
</div>

</body>
</html>`;
}

function strengthEmoji(light: string): string {
  if (light === "green") return "🟢";
  if (light === "yellow") return "🟡";
  if (light === "red") return "🔴";
  return "⚪";
}
