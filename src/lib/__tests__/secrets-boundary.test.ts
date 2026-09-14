import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");

describe("Secrets boundary (kľúče nesmú ísť do klienta)", () => {
  it("klientsky kód nečíta MISTRAL_API_KEY ani XAI_API_KEY", () => {
    const files = globSync("src/{components,hooks,routes}/**/*.{ts,tsx}", {
      cwd: ROOT,
    }).filter((f) => !f.includes(`${path.sep}api${path.sep}`));

    const leaks: string[] = [];
    for (const rel of files) {
      const text = readFileSync(path.join(ROOT, rel), "utf8");
      if (
        /process\.env\[["'](MISTRAL_API_KEY|XAI_API_KEY|STRIPE_LIVE_API_KEY|STRIPE_SANDBOX_API_KEY|SUPABASE_SERVICE_ROLE_KEY)["']\]/.test(
          text,
        )
      ) {
        leaks.push(rel);
      }
    }
    expect(leaks).toEqual([]);
  });

  it("VITE_ premenné v klientovi nie sú serverové AI kľúče", () => {
    const files = globSync("src/**/*.{ts,tsx}", { cwd: ROOT });
    const leaks: string[] = [];
    for (const rel of files) {
      const text = readFileSync(path.join(ROOT, rel), "utf8");
      if (/VITE_(MISTRAL|XAI|STRIPE_LIVE|SERVICE_ROLE)/.test(text)) {
        leaks.push(rel);
      }
    }
    expect(leaks).toEqual([]);
  });

  it("AI kľúče ani celé prompty sa nezapisujú do browser storage alebo konzoly", () => {
    const files = globSync("src/**/*.{ts,tsx}", { cwd: ROOT });
    const leaks: string[] = [];
    for (const rel of files) {
      const text = readFileSync(path.join(ROOT, rel), "utf8");
      const storageLeak = /(localStorage|sessionStorage)\.setItem\([^\n]*(MISTRAL_API_KEY|XAI_API_KEY|authorization|messages|prompt)/i.test(text);
      const consoleLeak = /console\.(log|debug|info|warn|error)\([^\n]*(MISTRAL_API_KEY|XAI_API_KEY|authorization|messages|serialized|SYSTEM_PROMPT)/i.test(text);
      if (storageLeak || consoleLeak) leaks.push(rel);
    }
    expect(leaks).toEqual([]);
  });

  it("AI audit schema stores metadata, never prompts, responses, or keys", () => {
    const files = globSync("supabase/migrations/*.sql", { cwd: ROOT });
    const schema = files.map((rel) => readFileSync(path.join(ROOT, rel), "utf8")).join("\n");
    const aiUsage = schema.match(/create table(?: if not exists)? public\.ai_usage\s*\(([\s\S]*?)\);/i)?.[1] ?? "";
    expect(schema).toMatch(/alter table public\.ai_usage[\s\S]*?add column if not exists request_id uuid/i);
    expect(schema).toMatch(/alter table public\.ai_usage[\s\S]*?add column if not exists fallback boolean/i);
    expect(aiUsage).not.toMatch(/api_key|authorization|full_prompt|prompt_body|response_body|messages\s/i);
  });
});
