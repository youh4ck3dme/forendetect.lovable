import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
const publicFile = (name: string) => resolve(root, "public", name);

describe("PWA assets", () => {
  it("keeps the public manifest valid and references existing icons", () => {
    const manifest = JSON.parse(
      readFileSync(publicFile("manifest.webmanifest"), "utf8"),
    ) as {
      start_url: string;
      icons: Array<{ src: string; sizes: string; type: string }>;
    };

    expect(manifest.start_url).toBe("/prehlad");
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    for (const icon of manifest.icons) {
      expect(icon.type).toBe("image/png");
      expect(
        readFileSync(publicFile(icon.src.replace(/^\//, ""))).length,
      ).toBeGreaterThan(0);
    }
  });

  it("uses a versioned service-worker cache and removes obsolete caches", () => {
    const serviceWorker = readFileSync(publicFile("sw.js"), "utf8");
    expect(serviceWorker).toMatch(/forendo-cache-v\d+-/);
    expect(serviceWorker).toContain("caches.delete(key)");
    expect(serviceWorker).toContain('event.request.mode === "navigate"');
  });
});
