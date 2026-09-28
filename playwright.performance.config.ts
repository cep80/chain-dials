import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testDir: "./tests/performance",
  workers: 1,
  timeout: 60_000,
  projects: [{ name: "mobile-profile", use: { ...devices["Pixel 7"] } }],
});
