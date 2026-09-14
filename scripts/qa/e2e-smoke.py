"""
E2E smoke test naprieč celou aplikáciou Forendo.

Spustenie (dev server musí bežať na http://localhost:8080):
    python3 scripts/qa/e2e-smoke.py

Overuje:
  - verejný úvod a prihlasovaciu obrazovku (vrátane Google tlačidla),
  - ochranu chránených trás pre neprihláseného návštevníka,
  - vstup cez lokálny vývojársky režim,
  - načítanie všetkých hlavných obrazoviek bez chýb v konzole,
  - absenciu horizontálneho pretekania na mobile aj desktope.
"""

import asyncio
import sys

from playwright.async_api import async_playwright

BASE = "http://localhost:8080"

PROTECTED = [
    "/prehlad",
    "/analyza-vypisov",
    "/osoby",
    "/vztahy",
    "/viac",
    "/pripady",
    "/import-csv",
    "/asistent",
    "/siet",
    "/zbrane",
    "/pravny-kontext",
    "/predplatne",
    "/sukromie",
    "/mcp-info",
]

IGNORED_CONSOLE = (
    "Download the React DevTools",
    "favicon",
    "Failed to load resource",
    "manifest",
    "service worker",
)

results: list[tuple[bool, str]] = []


def check(ok: bool, label: str) -> None:
    results.append((ok, label))
    print(("PASS " if ok else "FAIL ") + label)


async def main() -> int:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        errors: list[str] = []
        page.on(
            "console",
            lambda m: errors.append(f"{m.type}: {m.text}")
            if m.type == "error" and not any(i in m.text for i in IGNORED_CONSOLE)
            else None,
        )
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))

        # 1. Verejný úvod
        await page.goto(BASE, wait_until="domcontentloaded")
        await page.wait_for_timeout(1200)
        check("Forendo" in await page.content(), "úvodná stránka sa načíta")

        # 2. Chránená trasa presmeruje neprihláseného na /auth
        await page.goto(f"{BASE}/prehlad", wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)
        check("/auth" in page.url, "neprihlásený je presmerovaný na prihlásenie")

        # 3. Prihlasovacia obrazovka a Google tlačidlo
        await page.goto(f"{BASE}/auth", wait_until="domcontentloaded")
        await page.wait_for_timeout(800)
        google = page.get_by_role("button", name="Pokračovať cez Google")
        check(await google.count() > 0, "tlačidlo Google prihlásenia existuje")
        check(
            await page.locator("#email").count() > 0
            and await page.locator("#password").count() > 0,
            "formulár e-mail + heslo existuje",
        )

        # 4. Lokálny vývojársky vstup
        dev = page.get_by_role("button", name="Dev Free Entry")
        check(await dev.count() > 0, "lokálny vývojársky vstup je dostupný")
        await dev.click()
        await page.wait_for_timeout(2500)
        check("/prehlad" in page.url, "vývojársky vstup otvorí prehľad")

        # 5. Všetky hlavné obrazovky
        for path in PROTECTED:
            before = len(errors)
            await page.goto(f"{BASE}{path}", wait_until="domcontentloaded")
            await page.wait_for_timeout(1400)
            body = await page.inner_text("body")
            loaded = path.rstrip("/") in page.url and len(body.strip()) > 40
            check(loaded, f"obrazovka {path} sa načíta")
            check(len(errors) == before, f"obrazovka {path} bez chýb v konzole")

        # 6. Žiadne horizontálne pretekanie (mobil + desktop)
        for width, label in ((420, "mobil 420px"), (1280, "desktop 1280px")):
            await page.set_viewport_size({"width": width, "height": 912})
            await page.goto(f"{BASE}/prehlad", wait_until="domcontentloaded")
            await page.wait_for_timeout(1200)
            overflow = await page.evaluate(
                "document.documentElement.scrollWidth - document.documentElement.clientWidth"
            )
            check(overflow <= 2, f"bez horizontálneho pretekania ({label})")

        await browser.close()

    failed = [label for ok, label in results if not ok]
    print(f"\n{len(results) - len(failed)}/{len(results)} kontrol prešlo")
    if errors:
        print("Chyby v konzole:")
        for e in errors[:20]:
            print(" -", e)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
