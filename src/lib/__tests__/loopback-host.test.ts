import { describe, expect, it } from "vitest";
import {
  isLoopbackHost,
  loopbackHostFromRequest,
  normalizeHost,
} from "../loopback-host";

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

  it("dev bypass ignoruje sfalšovaný x-forwarded-host", () => {
    const spoofed = {
      headers: {
        get(name: string) {
          if (name === "x-forwarded-host") return "localhost";
          if (name === "host") return "preview.vercel.app";
          return null;
        },
      },
    };
    expect(loopbackHostFromRequest(spoofed)).toBe("preview.vercel.app");
    expect(isLoopbackHost(loopbackHostFromRequest(spoofed))).toBe(false);
  });
});
