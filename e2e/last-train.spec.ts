import { expect, test, type Page } from "@playwright/test";

const browserErrors = new WeakMap<Page, string[]>();

interface Trip {
  origin: string;
  destination: string;
  date?: string;
  buffer?: string;
}

async function calculate(page: Page, trip: Trip) {
  await page.getByLabel("Leaving from").fill(trip.origin);
  await page.getByLabel("Going home to").fill(trip.destination);
  if (trip.date) await page.getByLabel("Service date · Singapore time").fill(trip.date);
  if (trip.buffer) await page.getByLabel("Extra connection buffer").selectOption(trip.buffer);
  await page.getByRole("button", { name: "Calculate my last train" }).click();
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Last train home" })).toBeVisible();
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? []).toEqual([]);
});

test("1 · default Farrer Park to Lakeside calculation", async ({ page }) => {
  await expect(page.getByTestId("board-by")).toHaveText("11:41 PM");
  const result = page.locator(".departure-board");
  await expect(result).toContainText("Estimated safe board-by time");
  await expect(result).toContainText("Change at Outram Park");
  await expect(result).toContainText("3 min walk + 3 min buffer");
  await expect(result).toContainText("Weekday timetable");
});

test("2 · direct DTL trip retains a published cutoff", async ({ page }) => {
  await calculate(page, { origin: "DT1", destination: "DT35", date: "2026-07-29" });
  await expect(page.getByTestId("board-by")).toHaveText("11:35 PM");
  await expect(page.locator(".departure-board")).toContainText("Exact last scheduled train");
  await expect(page.locator(".departure-board")).toContainText("Towards Expo");
});

test("3 · post-midnight arrival remains on one service day", async ({ page }) => {
  await calculate(page, {
    origin: "HarbourFront",
    destination: "Punggol Coast",
    date: "2026-07-29"
  });
  await expect(page.getByTestId("board-by")).toHaveText("11:55 PM");
  await expect(page.locator(".arrival-time")).toContainText(/12:\d{2} AM/);
});

test("4 · connection buffer visibly changes the recommendation", async ({ page }) => {
  await calculate(page, {
    origin: "Farrer Park",
    destination: "Lakeside",
    date: "2026-07-29",
    buffer: "0"
  });
  await expect(page.getByTestId("board-by")).toHaveText("11:48 PM");
  await page.getByLabel("Extra connection buffer").selectOption("10");
  await page.getByRole("button", { name: "Calculate my last train" }).click();
  await expect(page.getByTestId("board-by")).toHaveText("11:34 PM");
});

test("5 · invalid same-station request is actionable", async ({ page }) => {
  await calculate(page, {
    origin: "Lakeside",
    destination: "Lakeside",
    date: "2026-07-29"
  });
  await expect(page.getByRole("alert")).toContainText("Origin and destination must be different");
  await expect(page.locator(".departure-board")).toHaveCount(0);
});

test("6 · Changi branch requires the Tanah Merah service change", async ({ page }) => {
  await calculate(page, {
    origin: "CG2",
    destination: "EW5",
    date: "2026-07-29"
  });
  const result = page.locator(".departure-board");
  await expect(result).toContainText("Towards Tanah Merah");
  await expect(result).toContainText("Change at Tanah Merah");
  await expect(result).toContainText("EWL");
});

test("7 · CCL spur and main loop remain distinct", async ({ page }) => {
  await calculate(page, {
    origin: "Bras Basah",
    destination: "Keppel",
    date: "2026-07-29"
  });
  const result = page.locator(".departure-board");
  await expect(result).toContainText("Towards Stadium");
  await expect(result).toContainText("Towards clockwise via Bayfront");
  await expect(result).toContainText("Change at Promenade");
});

test("8 · Sengkang West inner-loop closure changes the path", async ({ page }) => {
  await calculate(page, {
    origin: "Cheng Lim",
    destination: "Sengkang",
    date: "2026-07-29"
  });
  await expect(page.getByText(/towards SW1 Cheng Lim are suspended/i).first()).toBeVisible();
  await expect(page.locator(".departure-board")).toContainText("Towards West Loop via Renjong");
});

test("9 · DTL early closure is dated and degrades confidence", async ({ page }) => {
  await calculate(page, {
    origin: "Bukit Panjang",
    destination: "Expo",
    date: "2026-07-31"
  });
  await expect(page.getByText(/DTL services end around 11:30 PM/i).first()).toBeVisible();
  await expect(page.locator(".departure-board")).toContainText("Estimated safe board-by time");
  await expect(page.getByTestId("board-by")).toHaveText("10:22 PM");
});

test("10 · National Day Eve uses only the published dated anchor", async ({ page }) => {
  await calculate(page, {
    origin: "City Hall",
    destination: "Lakeside",
    date: "2026-08-08"
  });
  await expect(page.getByTestId("board-by")).toHaveText("12:30 AM");
  await expect(page.locator(".departure-board")).toContainText("Exact last scheduled train");
  await expect(page.getByText(/Selected SMRT departure anchors are extended/i).first()).toBeVisible();
});

test("11 · fuzzy station search canonicalises and remembers the destination", async ({ page }) => {
  await calculate(page, {
    origin: "Laksid",
    destination: "Boon Lay",
    date: "2026-07-29"
  });
  await expect(page.getByLabel("Leaving from")).toHaveValue("Lakeside · EW26");
  await expect(page.getByLabel("Going home to")).toHaveValue("Boon Lay · EW27");
  await page.reload();
  await expect(page.getByLabel("Going home to")).toHaveValue("Boon Lay · EW27");
});

test("12 · station search detects spelling mistakes and supports keyboard selection", async ({
  page
}) => {
  const origin = page.getByLabel("Leaving from");
  await origin.fill("Laksdie");
  const menu = page.locator("#origin-options");
  await expect(menu.locator(".station-picker__menu-head")).toContainText(
    "Did you mean Lakeside?"
  );
  const suggestion = menu.getByRole("option").first();
  await expect(suggestion).toContainText("Lakeside");
  await expect(suggestion).toContainText("Spelling");
  await expect(suggestion).toContainText("EW26");
  await origin.press("Enter");
  await expect(origin).toHaveValue("Lakeside · EW26");
});

test("13 · station search understands line names and exposes interchange codes", async ({
  page
}) => {
  const destination = page.getByLabel("Going home to");
  await destination.fill("NEL outrm");
  const suggestion = page.locator("#destination-options").getByRole("option").first();
  await expect(suggestion).toContainText("Outram Park");
  await expect(suggestion).toContainText("Interchange");
  await expect(suggestion).toContainText("EW16");
  await expect(suggestion).toContainText("NE3");
  await expect(suggestion).toContainText("TE17");
  await suggestion.click();
  await expect(destination).toHaveValue("Outram Park · EW16 / NE3 / TE17");
});

test("14 · the complete primary journey fits the first viewport", async ({ page }) => {
  const metrics = await page.evaluate(() => {
    const board = document.querySelector(".departure-board")!.getBoundingClientRect();
    const footer = document.querySelector(".rail-footer")!.getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      boardBottom: board.bottom,
      footerBottom: footer.bottom
    };
  });
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.boardBottom).toBeLessThanOrEqual(metrics.viewportHeight);
  expect(metrics.footerBottom).toBeLessThanOrEqual(metrics.viewportHeight);
});
