import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(dirname, "../backend");

const E2E_API_URL = process.env.E2E_API_URL ?? "http://localhost:3000/api";

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./tests/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    locale: "pt-BR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      fullyParallel: false,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /auth\.setup\.ts/,
      dependencies: ["setup"],
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      testIgnore: /auth\.setup\.ts/,
      dependencies: ["setup"],
    },
  ],
  webServer: [
    {
      command: "npm run dev",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: "npm run start",
      cwd: backendDir,
      url: "http://localhost:3000/docs",
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        E2E_API_URL,
        // A suíte faz muitas chamadas de /auth/me (uma por apiFetch) a partir do
        // mesmo IP; o limite padrão (100/min) derruba tudo com 429.
        THROTTLE_LIMIT: process.env.THROTTLE_LIMIT ?? "100000",
        THROTTLE_TTL: process.env.THROTTLE_TTL ?? "60000",
      },
    },
  ],
});
