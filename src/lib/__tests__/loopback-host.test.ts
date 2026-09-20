import { describe, expect, it } from "vitest";
import { isLoopbackHost, normalizeHost } from "../loopback-host";

describe("loopback-host", () => {
  it("normalizuje Host aj X-Forwarded-Host s portom", () => {
    expect(normalizeHost("localhost:5656")).toBe("localhost");
    expect(normalizeHost("127.0.0.1:443")).toBe("127.0.0.1");
    expect(normalizeHost("[::1]:5656")).toBe("[::1]");
    expect(normalizeHost("preview.vercel.app, localhost")).toBe(
      "preview.vercel.app",
    );
  });

  it("povolí len loopback", () => {
    expect(isLoopbackHost("localhost")).toBe(true);
    expect(isLoopbackHost("127.0.0.1")).toBe(true);
    expect(isLoopbackHost("[::1]")).toBe(true);
    expect(isLoopbackHost("forendetect.lovable.app")).toBe(false);
    expect(isLoopbackHost("temporary-swift-hawthorn-7ac3v9k.vercel.app")).toBe(
      false,
    );
  });
});
