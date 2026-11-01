import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/admin-browser",
  timeout: 180000,
  workers: 1,
  fullyParallel: false,
  use: {
    headless: true,
    actionTimeout: 15000,
    navigationTimeout: 20000,
    trace: "retain-on-failure",
  },
  reporter: "list",
});
