import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const TOKENS_PATH = resolve(process.cwd(), "src/forenx-liquid-glass.tokens.css");
const STYLES_PATH = resolve(process.cwd(), "src/styles.css");

describe("ForenX Liquid Glass tokens", () => {
  const tokens = readFileSync(TOKENS_PATH, "utf8");
  const styles = readFileSync(STYLES_PATH, "utf8");

  it("má päť identity tokenov ako jediný zdroj pravdy", () => {
    expect(tokens).toContain("--forenx-color-background:");
    expect(tokens).toContain("--forenx-color-accent:");
    expect(tokens).toContain("--forenx-color-text-primary:");
    expect(tokens).toContain("--forenx-color-text-secondary:");
    expect(tokens).toContain("--forenx-color-text-button:");
    expect(tokens).toContain("#05090a");
    expect(tokens).toContain("#0af1f5");
  });

  it("štýly importujú token súbor a nemajú paralelnú paletu v :root", () => {
    expect(styles).toContain('./forenx-liquid-glass.tokens.css');
    expect(styles).not.toContain("oklch(0.28 0.045 255)");
    expect(styles).toContain("--font-sans: var(--forenx-font-family)");
  });

  it("bridge mapuje shadcn premenné na ForenX tokeny", () => {
    expect(tokens).toContain("--background:");
    expect(tokens).toContain("var(--forenx-color-background)");
    expect(tokens).toContain("--primary: var(--forenx-color-accent)");
    expect(tokens).toContain("--primary-foreground: var(--forenx-color-text-button)");
    expect(tokens).toContain(".forenx-glass");
    expect(tokens).toContain(".forenx-button-primary");
  });
});
