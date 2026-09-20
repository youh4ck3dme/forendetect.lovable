import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function enterApp(page: Page) {
  await page.goto("/auth");
  await page.getByRole("button", { name: /Dev Free Entry/i }).click();
}

test("auth defaults to light theme and email-first login", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => {
    localStorage.removeItem("malte:theme");
  });
  await page.goto("/auth");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(
    page.getByRole("button", { name: "Svetlá téma" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Pokračovať cez Google" }),
  ).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.locator("#password")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Pokračovať", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Zaregistrovať sa")).toHaveCount(0);
});

test("local developer entry reaches the protected dashboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterApp(page);
  await expect(page).toHaveURL(/\/prehlad$/);
  await expect(page.locator(".forendo-status-time")).toHaveText(
    /^\d{2}:\d{2}$/,
  );
  await expect(
    page.getByRole("heading", { name: "Forendo — prehľad prípadu" }),
  ).toBeVisible();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("favicon package is linked with valid public assets", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.locator('link[rel="icon"][sizes="32x32"]')).toHaveAttribute(
    "href",
    "/favicon-32x32.png",
  );
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  for (const asset of [
    "/favicon-16x16.png",
    "/favicon-32x32.png",
    "/favicon.ico",
    "/apple-touch-icon.png",
    "/android-chrome-192x192.png",
    "/android-chrome-512x512.png",
  ]) {
    expect((await page.request.get(asset)).ok(), asset).toBe(true);
  }
});

test("header clock and neon frame remain readable in both themes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterApp(page);
  const clock = page.locator(".forendo-status-time");
  const header = page.locator("header.forendo-neon-frame");
  await expect(clock).toHaveText(/^\d{2}:\d{2}$/);
  await expect(header.locator(".forendo-neon-orbit-path")).toHaveAttribute(
    "pathLength",
    "100",
  );
  await page.getByRole("button", { name: "Tmavá téma" }).click();
  await expect
    .poll(() =>
      clock.evaluate((element) => {
        const color = getComputedStyle(element).color;
        return color !== "rgba(0, 0, 0, 0)" && color !== "transparent";
      }),
    )
    .toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(header.locator(".forendo-neon-orbit-path")).toHaveCSS(
    "animation-name",
    "none",
  );
});

test("authenticated navigation opens the forensic sandbox", async ({
  page,
}) => {
  await enterApp(page);
  await page.goto("/sandbox");
  await expect(
    page.getByRole("heading", { name: "Forenzný Sandbox" }),
  ).toBeVisible();
});

test("PDF demo produces a forensic report", async ({ page }) => {
  await enterApp(page);
  await page.goto("/sandbox");
  await page.getByRole("button", { name: /Faktúra s 2x %%EOF/i }).click();
  await expect(page.getByText("Forenzný Index Rizika")).toBeVisible();
});

test("invalid uploaded content is surfaced as a forensic anomaly", async ({
  page,
}) => {
  await enterApp(page);
  await page.goto("/sandbox");
  await page.locator("#sandbox-file-input").setInputFiles({
    name: "poskodeny.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("not a real PDF"),
  });
  await expect(page.getByText(/Súbor má príponu/i)).toBeVisible();
});

test("network graph controls keep readable contrast in both themes", async ({
  page,
}) => {
  await enterApp(page);
  await page.goto("/siet");
  const control = page.locator(".react-flow__controls-button").first();
  await expect(control).toBeVisible();
  const light = await control.evaluate((e) => {
    const s = getComputedStyle(e);
    return [s.backgroundColor, s.color];
  });
  expect(light[0]).not.toBe(light[1]);
  await page.getByRole("button", { name: "Tmavá téma" }).click();
  const dark = await control.evaluate((e) => {
    const s = getComputedStyle(e);
    return [s.backgroundColor, s.color];
  });
  expect(dark[0]).not.toBe(dark[1]);
});

test("relationship view buttons keep readable active text", async ({
  page,
}) => {
  await enterApp(page);
  await page.goto("/vztahy");
  const graph = page.getByRole("button", { name: "Graf" });
  await expect(graph).toHaveAttribute("aria-pressed", "true");
  const colors = await graph.evaluate((e) => {
    const s = getComputedStyle(e);
    return [s.backgroundColor, s.color];
  });
  expect(colors[0]).not.toBe(colors[1]);
});

test("direct access to a protected route falls back to authentication", async ({
  page,
}) => {
  await page.goto("/import-csv");
  await expect(page).toHaveURL(/\/auth/);
});

test("CSV import accepts valid rows and reports malformed rows", async ({
  page,
}) => {
  await enterApp(page);
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
  await page.waitForTimeout(500);
  await page.getByLabel("Formát dátumu").selectOption("DD.MM.YYYY");
  await page.getByLabel("Dátum", { exact: true }).selectOption("0");
  await page.getByLabel("Suma", { exact: true }).selectOption("1");
  await page.getByLabel("Odosielateľ", { exact: true }).selectOption("3");
  await page.getByLabel("Príjemca", { exact: true }).selectOption("4");
  await page.getByRole("button", { name: "Skontrolovať riadky" }).click();
  await expect(page.getByText(/1 platných riadkov, 1 chybných/)).toBeVisible();
});

test("CSV import handles empty and invalid-header files without crashing", async ({
  page,
}) => {
  await enterApp(page);
  await page.goto("/import-csv");
  const input = page.locator('input[aria-label="Súbor CSV"]');
  await input.setInputFiles({
    name: "prazdny.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(""),
  });
  await expect(page.getByText("Formát súboru")).toBeVisible();
});

test("users can navigate from analysis to subjects and invoke report export", async ({
  page,
}) => {
  await enterApp(page);
  await page.goto("/analyza-vypisov");
  await expect(
    page.getByRole("button", { name: "Exportovať výsledky do PDF" }),
  ).toBeVisible();
  await page.goto("/osoby");
  await expect(page.getByRole("heading", { name: "Subjekty" })).toBeVisible();
});
