import { defineConfig } from "vitest/config";

const runLiveE2e = process.env["RUN_LIVE_E2E"] === "1";
const liveTestFiles = [
  "src/lib/__tests__/live-e2e-laravel-import.test.ts",
  "src/lib/__tests__/real-postgres-registry-import.test.ts",
];

if (runLiveE2e && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env");
  } catch {
    // Ignore if .env is missing in CI
  }
}

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", ...(runLiveE2e ? [] : liveTestFiles)],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/routeTree.gen.ts",
        "src/routes/**",
        "src/components/**",
        "src/hooks/**",
        "src/integrations/**",
        "src/assets/**",
        "src/forensic/data/**",
      ],
      thresholds: {
        lines: 65,
        functions: 60,
        branches: 50,
        statements: 65,
      },
    },
  },
  resolve: {
    alias: {
      "@": `${import.meta.dirname}/src`,
    },
  },
});
