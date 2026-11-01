import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 120000,
  fullyParallel: false,
  workers: 1,
  use: {
    actionTimeout: 10000,
    navigationTimeout: 15000,
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/preview.mjs",
    url: "http://127.0.0.1:4173/en/",
    reuseExistingServer: true,
  },
  reporter: "list",
});
