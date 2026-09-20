import { expect, test, type Page } from "@playwright/test";

async function enterApp(page: Page) {
  await page.goto("/auth");
  const btn = page.getByRole("button", { name: /Developer|Dev Free Entry/i });
  await expect(btn).toBeEnabled();
  await btn.click();
  await page.waitForURL(/\/prehlad$/);
}

function pageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test.describe("All functions — public and auth", () => {
  test("landing shows brand CTAs and opens auth", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Analýza\. Dôkazy\. Rozhodnutia\./ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Prihlásiť sa" }),
    ).toBeVisible();
    await page.getByRole("link", { name: /Začať zadarmo/ }).click();
    await expect(page).toHaveURL(/\/auth/);
  });

  test("auth hides Google and shows mint Developer free entry", async ({
    page,
  }) => {
    await page.goto("/auth");
    await expect(
      page.getByRole("button", { name: "Pokračovať cez Google" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Developer/i }),
    ).toBeVisible();
    await expect(page.getByText("Free vstup")).toBeVisible();
    await expect(page.getByLabel("E-mail")).toBeVisible();
  });

  test("unknown email is rejected", async ({ page }) => {
    await page.goto("/auth");
    const continueBtn = page.getByRole("button", {
      name: "Pokračovať",
      exact: true,
    });
    await expect(continueBtn).toBeEnabled();
    await page.getByLabel("E-mail").fill("unknown.user@example.com");
    await continueBtn.click();
    await expect(
      page.getByText("Tento e-mail nie je zaregistrovaný."),
    ).toBeVisible();
    await expect(page.locator("#password")).toHaveCount(0);
  });

  test("allowlisted email opens first-login password", async ({ page }) => {
    await page.goto("/auth");
    const continueBtn = page.getByRole("button", {
      name: "Pokračovať",
      exact: true,
    });
    await expect(continueBtn).toBeEnabled();
    await page.getByLabel("E-mail").fill("erikbabcan@gmail.com");
    await continueBtn.click();
    await expect(page.locator("#password")).toBeVisible();
    await page.getByRole("button", { name: "Zmeniť" }).click();
    await expect(page.getByLabel("E-mail")).toBeVisible();
  });

  test("protected routes redirect when signed out", async ({ page }) => {
    for (const path of ["/prehlad", "/pripady", "/import-csv", "/asistent"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/auth/);
    }
  });
});

test.describe("All functions — screens after Developer free vstup", () => {
  test("every authenticated screen loads without a page crash", async ({
    page,
  }) => {
    const errors = pageErrors(page);
    await enterApp(page);

    const screens: { path: string; title: string | RegExp }[] = [
      { path: "/prehlad", title: "Forendo — prehľad prípadu" },
      { path: "/analyza-vypisov", title: "Analýza transakcií" },
      { path: "/osoby", title: "Subjekty" },
      { path: "/vztahy", title: "Vzťahy" },
      { path: "/siet", title: "Sieťová analýza" },
      { path: "/zbrane", title: "Zbrane" },
      { path: "/pravny-kontext", title: "Právny kontext" },
      { path: "/pripady", title: "Prípady" },
      { path: "/import-csv", title: /Import výpisu/ },
      { path: "/asistent", title: "Forenzný Autopilot" },
      { path: "/sandbox", title: "Forenzný Sandbox" },
      { path: "/predplatne", title: "Predplatné" },
      { path: "/sukromie", title: "Súkromie a podmienky" },
      { path: "/mcp-info", title: "Agentné API" },
      { path: "/viac", title: "Viac" },
      { path: "/vitajte", title: /Založte prípad|Vitajte/ },
    ];

    for (const screen of screens) {
      await page.goto(screen.path);
      await expect(page, screen.path).toHaveURL(new RegExp(`${screen.path}$`));
      await expect(
        page.getByRole("heading", { name: screen.title }).first(),
      ).toBeVisible();
      const body = (await page.locator("body").innerText()).trim();
      expect(body.length, screen.path).toBeGreaterThan(40);
    }

    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("prehlad risk filter and subject shortcut work", async ({ page }) => {
    await enterApp(page);
    await expect(page.getByText(/UKÁŽKA/).first()).toBeVisible();
    const critical = page.getByRole("button", { name: /Kritické/ }).first();
    await critical.click();
    await page
      .getByRole("link", { name: /Subjekty/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/osoby$/);
    await expect(page.getByRole("heading", { name: "Subjekty" })).toBeVisible();
  });

  test("osoby type filters switch lists", async ({ page }) => {
    await enterApp(page);
    await page.goto("/osoby");
    await page.getByRole("button", { name: "Firmy" }).click();
    await expect(page.getByText(/s\.r\.o\.|Ltd/i).first()).toBeVisible();
    await page.getByRole("button", { name: "Osoby" }).click();
    await expect(page.getByText(/Osoba|konateľ/i).first()).toBeVisible();
    await page.getByRole("button", { name: "Všetky" }).click();
  });

  test("vztahy switches between graph and list", async ({ page }) => {
    await enterApp(page);
    await page.goto("/vztahy");
    const graph = page.getByRole("button", { name: "Graf" });
    const list = page.getByRole("button", { name: "Zoznam" });
    await expect(graph).toHaveAttribute("aria-pressed", "true");
    await list.click();
    await expect(list).toHaveAttribute("aria-pressed", "true");
    await graph.click();
    await expect(graph).toHaveAttribute("aria-pressed", "true");
  });

  test("network graph controls are usable", async ({ page }) => {
    await enterApp(page);
    await page.goto("/siet");
    await expect(
      page.locator(".react-flow__controls-button").first(),
    ).toBeVisible();
    await expect(page.locator(".react-flow__node").first()).toBeVisible();
  });

  test("weapons and legal context show demo detections", async ({ page }) => {
    await enterApp(page);
    await page.goto("/zbrane");
    await expect(page.getByText(/zbraní na sledovanom zozname/)).toBeVisible();
    await page.goto("/pravny-kontext");
    await expect(page.getByText(/Právne posúdenie prípadu/)).toBeVisible();
    await expect(page.getByText("300/2005", { exact: true })).toBeVisible();
  });

  test("cases can create a named case and keep the demo", async ({ page }) => {
    await enterApp(page);
    await page.goto("/pripady");
    await page.getByLabel("Názov prípadu").fill("Testovací prípad QA");
    await page.getByRole("button", { name: "Vytvoriť prípad" }).click();
    await expect(page.getByText("Prípad vytvorený.")).toBeVisible();
    await expect(page.getByText("Testovací prípad QA")).toBeVisible();
    await page
      .getByRole("button", { name: "Vytvoriť ukážkový prípad" })
      .click();
    await expect(
      page.getByText("Ukážkový prípad so syntetickými dátami bol vytvorený."),
    ).toBeVisible();
  });

  test("CSV import checks valid and invalid rows", async ({ page }) => {
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
    await page.getByLabel("Formát dátumu").selectOption("DD.MM.YYYY");
    await page.getByLabel("Dátum", { exact: true }).selectOption("0");
    await page.getByLabel("Suma", { exact: true }).selectOption("1");
    await page.getByLabel("Odosielateľ", { exact: true }).selectOption("3");
    await page.getByLabel("Príjemca", { exact: true }).selectOption("4");
    await page.getByRole("button", { name: "Skontrolovať riadky" }).click();
    await expect(
      page.getByText(/1 platných riadkov, 1 chybných/),
    ).toBeVisible();
  });

  test("sandbox demo report and invalid upload", async ({ page }) => {
    await enterApp(page);
    await page.goto("/sandbox");
    await page.getByRole("button", { name: /Faktúra s 2x %%EOF/i }).click();
    await expect(page.getByText("Forenzný Index Rizika")).toBeVisible();
    await page.locator("#sandbox-file-input").setInputFiles({
      name: "poskodeny.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("not a real PDF"),
    });
    await expect(page.getByText(/Súbor má príponu/i)).toBeVisible();
  });

  test("analysis export button and assistant shell load", async ({ page }) => {
    await enterApp(page);
    await page.goto("/analyza-vypisov");
    await expect(
      page.getByRole("button", { name: "Exportovať výsledky do PDF" }),
    ).toBeVisible();
    await page.goto("/asistent");
    await expect(
      page.getByRole("heading", { name: "Forenzný Autopilot" }),
    ).toBeVisible();
  });

  test("subscription and privacy screens explain state", async ({ page }) => {
    await enterApp(page);
    await page.goto("/predplatne");
    await expect(page.getByText(/Váš plán/)).toBeVisible();
    await page.goto("/sukromie");
    await expect(page.getByText(/súkrom/i).first()).toBeVisible();
    await page.goto("/mcp-info");
    await expect(page.getByText("case_overview")).toBeVisible();
    await expect(page.locator("pre")).toContainText("/mcp");
  });

  test("theme toggle persists on dashboard", async ({ page }) => {
    await enterApp(page);
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await page.getByRole("button", { name: "Tmavá téma" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("button", { name: "Svetlá téma" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("ICO Atlas explains demo mode instead of a uuid error", async ({
    page,
  }) => {
    await enterApp(page);
    await page.goto("/osoby");
    await page.getByPlaceholder(/Zadajte IČO/).fill("31322832");
    await page.getByRole("button", { name: "Importovať z ICO Atlas" }).click();
    await expect(
      page.getByText(/IČO Atlas v demo režime nie je pripojený/),
    ).toBeVisible();
    await expect(page.getByText(/dev-user-id/)).toHaveCount(0);
  });

  test("sign out returns to auth and blocks dashboard", async ({ page }) => {
    await enterApp(page);
    await page.goto("/viac");
    await page.getByRole("button", { name: "Odhlásiť sa" }).click();
    await expect(page).toHaveURL(/\/auth/);
    await page.goto("/prehlad");
    await expect(page).toHaveURL(/\/auth/);
  });
});
