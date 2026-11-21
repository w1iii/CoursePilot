import { defineConfig } from "vitest/config";

// Informational report: the existing library-only threshold remains in vitest.config.mts.
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    clearMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts", "src/app/api/**/*.ts", "src/app/dashboard/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}"],
      reporter: ["text", "lcov"],
    },
  },
});
