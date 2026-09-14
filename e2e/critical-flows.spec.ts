import { expect, test } from "@playwright/test";

test("local developer entry reaches the protected dashboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/auth");
  await expect(
    page.getByRole("heading", { name: /Prihlásenie do Forendo/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Dev Free Entry/i }).click();
  await expect(page).toHaveURL(/\/prehlad$/);
  await expect(page.locator(".forendo-status-time")).toHaveText(/^\d{2}:\d{2}$/);
  await expect(page.getByText("Vyšetrovací spis")).toBeVisible();
});

test("favicon package is linked with valid public assets", async ({ page }) => {
  await page.goto("/auth");
  await expect(
    page.locator('link[rel="icon"][sizes="32x32"][href="/favicon-32x32.png"]'),
  ).toHaveCount(1);
  await expect(
    page.locator(
      'link[rel="apple-touch-icon"][sizes="180x180"][href="/apple-touch-icon.png"]',
    ),
  ).toHaveCount(1);
  await expect(
    page.locator('link[rel="manifest"][href="/manifest.webmanifest"]'),
  ).toHaveCount(1);

  for (const asset of [
    "/favicon-16x16.png",
    "/favicon-32x32.png",
    "/favicon.ico",
    "/apple-touch-icon.png",
    "/android-chrome-192x192.png",
    "/android-chrome-512x512.png",
  ]) {
    const response = await page.request.get(asset);
    expect(response.ok(), asset).toBe(true);
  }
});

test("header clock and neon frame remain readable in both themes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/auth");
  await page.getByRole("button", { name: /Dev Free Entry/i }).click();

  const clock = page.locator(".forendo-status-time");
  const header = page.locator("header.forendo-neon-frame");
  await expect(clock).toHaveText(/^\d{2}:\d{2}$/);
  await expect(header).toBeVisible();

  const lightColor = await clock.evaluate((element) => {
    return getComputedStyle(element).color;
  });
  expect(lightColor).toBe("rgb(248, 250, 252)");
  await expect(clock).toHaveCSS("background-color", "rgba(2, 6, 23, 0.36)");

  await page.getByRole("button", { name: "Tmavá téma" }).click();
  await expect(clock).toHaveCSS("color", "rgb(248, 250, 252)");
  await expect(header.locator(".forendo-neon-orbit-path")).toHaveAttribute(
    "pathLength",
    "100",
  );
  await expect(header.locator(".forendo-neon-orbit-path")).toHaveCSS(
    "transform",
    "none",
  );

  await page.emulateMedia({ reducedMotion: "reduce" });
  const animation = await header
    .locator(".forendo-neon-orbit-path")
    .evaluate((element) => {
      return getComputedStyle(element).animationName;
    });
  expect(animation).toBe("none");
});

test("authenticated navigation opens the forensic sandbox", async ({
  page,
}) => {
  await page.goto("/auth");
  await page.getByRole("button", { name: /Dev Free Entry/i }).click();
  await page.goto("/sandbox");
  await expect(page).toHaveTitle(/Forenzný Sandbox — Forendo/);
  await expect(
    page.getByRole("heading", { name: "Forenzný Sandbox" }),
  ).toBeVisible();
  await expect(
    page.getByText("Analýza prebieha lokálne v prehliadači"),
  ).toBeVisible();
});

test("PDF demo produces a forensic report and exposes analysis tabs", async ({
  page,
}) => {
  await page.goto("/auth");
  await page.getByRole("button", { name: /Dev Free Entry/i }).click();
  await page.goto("/sandbox");

  await page.getByRole("button", { name: /Faktúra s 2x %%EOF/i }).click();

  await expect(
    page.getByRole("heading", {
      name: "podozriva_faktura_revidovana.pdf",
    }),
  ).toBeVisible();
  await expect(page.getByText("Forenzný Index Rizika")).toBeVisible();

  await page.getByRole("button", { name: /Rozpitvaná Štruktúra/i }).click();
  await expect(page.getByText("Objekty / Streamy")).toBeVisible();

  await page.getByRole("button", { name: /Finančné Entity & AML/i }).click();
  await expect(page.getByText(/IBAN/i).first()).toBeVisible();

  await page.getByRole("button", { name: /Nová analýza/i }).click();
  await expect(
    page.getByText("Vhoďte podozrivý súbor do Forenzného Sandboxu"),
  ).toBeVisible();
});

test("invalid uploaded content is surfaced as a forensic anomaly", async ({
  page,
}) => {
  await page.goto("/auth");
  await page.getByRole("button", { name: /Dev Free Entry/i }).click();
  await page.goto("/sandbox");

  await page.locator("#sandbox-file-input").setInputFiles({
    name: "poskodeny.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("not a real PDF"),
  });

  await expect(
    page.getByRole("heading", { name: "poskodeny.pdf" }),
  ).toBeVisible();
  await expect(page.getByText(/Súbor má príponu/i)).toBeVisible();
});

test("network graph controls keep readable contrast in both themes", async ({
  page,
}) => {
  await page.goto("/auth");
  await page.getByRole("button", { name: /Dev Free Entry/i }).click();
  await page.goto("/siet");

  const controls = page.locator(".react-flow__controls-button").first();
  await expect(controls).toBeVisible();

  const light = await controls.evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, color: style.color };
  });
  expect(light.background).not.toBe(light.color);

  await page.locator("aside button[aria-label='Tmavá téma']").click();
  const dark = await controls.evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, color: style.color };
  });
  expect(dark.background).not.toBe(dark.color);
  expect(dark.background).not.toBe("rgb(255, 255, 255)");
});

test("relationship view buttons keep readable active text", async ({
  page,
}) => {
  await page.goto("/auth");
  await page.getByRole("button", { name: /Dev Free Entry/i }).click();
  await page.goto("/vztahy");

  const graphButton = page.getByRole("button", { name: "Graf" });
  await expect(graphButton).toHaveAttribute("aria-pressed", "true");
  const colors = await graphButton.evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, color: style.color };
  });
  expect(colors.background).not.toBe(colors.color);
});

test("direct access to a protected route falls back to authentication", async ({
  page,
}) => {
  await page.goto("/import-csv");
  await expect(page).toHaveURL(/\/auth/);
  await expect(
    page.getByRole("heading", { name: /Prihlásenie do Forendo/i }),
  ).toBeVisible();
});

test("CSV import accepts valid rows and reports malformed rows", async ({
  page,
}) => {
  await page.goto("/auth");
  await page.getByRole("button", { name: /Dev Free Entry/i }).click();
  await page.goto("/import-csv");

  const csv = [
    "Dátum,Suma,Mena,Odosielateľ,Príjemca,Popis",
    "31.01.2026,1250.50,EUR,Test A,Test B,Faktúra 001",
    "30.01.2026,0,EURO,Test A,Test B,Neplatný riadok",
  ].join("\n");

  await page.locator('input[aria-label="Súbor CSV"]').setInputFiles({
    name: "synteticky-vypis.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });

  await expect(page.getByText("Formát súboru")).toBeVisible();
  await expect(page.getByLabel("Dátum", { exact: true })).toHaveCount(1);
  await page.waitForTimeout(1000);
  await page.getByLabel("Formát dátumu").selectOption("DD.MM.YYYY");
  await page.getByLabel("Dátum", { exact: true }).selectOption("0");
  await page.getByLabel("Suma", { exact: true }).selectOption("1");
  await page.getByLabel("Odosielateľ", { exact: true }).selectOption("3");
  await page.getByLabel("Príjemca", { exact: true }).selectOption("4");
  await expect(
    page.getByRole("button", { name: "Skontrolovať riadky" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Skontrolovať riadky" }).click();
  await expect(page.getByText(/1 platných riadkov, 1 chybných/)).toBeVisible();
  await expect(page.getByText(/Suma je nula/)).toBeVisible();
});

test("CSV import handles empty and invalid-header files without crashing", async ({
  page,
}) => {
  await page.goto("/auth");
  await page.getByRole("button", { name: /Dev Free Entry/i }).click();
  await page.goto("/import-csv");

  const input = page.locator('input[aria-label="Súbor CSV"]');
  await input.setInputFiles({
    name: "prazdny.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(""),
  });
  await expect(page.getByText("Formát súboru")).toBeVisible();

  await page.goto("/import-csv");
  await input.setInputFiles({
    name: "bez-hlaviciek.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("foo,bar\n1,2"),
  });
  await expect(page.getByText("Formát súboru")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Skontrolovať riadky" }),
  ).toBeDisabled();
});

test("users can navigate from analysis to subjects and invoke report export", async ({
  page,
}) => {
  await page.goto("/auth");
  await page.getByRole("button", { name: /Dev Free Entry/i }).click();
  await page.goto("/analyza-vypisov");
  await expect(
    page.getByRole("heading", { name: "Analýza transakcií" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Exportovať výsledky do PDF" }),
  ).toBeVisible();

  await page.goto("/osoby");
  await expect(page.getByRole("heading", { name: "Subjekty" })).toBeVisible();
  await page.getByRole("button", { name: "Firmy" }).click();
  await expect(page.getByRole("button", { name: "Firmy" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Schránkové" }).click();
  await expect(
    page.getByRole("button", { name: "Schránkové" }),
  ).toHaveAttribute("aria-pressed", "true");
});
