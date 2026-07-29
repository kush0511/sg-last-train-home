import { defineConfig, devices } from "@playwright/test";

const liveBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: liveBaseUrl ?? "http://127.0.0.1:43917",
    trace: "retain-on-failure"
  },
  webServer: liveBaseUrl
    ? undefined
    : {
        command: "npm run preview -- --host 127.0.0.1 --port 43917 --strictPort",
        port: 43917,
        reuseExistingServer: false,
        timeout: 30_000
      },
  projects: [
    {
      name: "small-mobile",
      use: {
        browserName: "chromium",
        viewport: { width: 320, height: 568 },
        hasTouch: true,
        isMobile: true
      }
    },
    { name: "mobile", use: { ...devices["iPhone 13"], browserName: "chromium" } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } }
  ]
});
