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
  await page.goto("./");
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
      scrollHeight: document.documentElement.scrollHeight,
      boardBottom: board.bottom,
      footerTop: footer.top,
      footerBottom: footer.bottom
    };
  });
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.viewportHeight + 1);
  expect(metrics.boardBottom).toBeLessThanOrEqual(metrics.viewportHeight);
  expect(metrics.boardBottom).toBeLessThanOrEqual(metrics.footerTop);
  expect(metrics.footerBottom).toBeLessThanOrEqual(metrics.viewportHeight);
  expect(metrics.footerBottom).toBeGreaterThanOrEqual(metrics.viewportHeight - 2);
});

test("15 · controls never overlap and interactive controls stay square", async ({ page }) => {
  const metrics = await page.evaluate(() => {
    const box = (selector: string) => {
      const rect = document.querySelector(selector)!.getBoundingClientRect();
      return {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left
      };
    };
    const overlaps = (
      first: ReturnType<typeof box>,
      second: ReturnType<typeof box>
    ) =>
      first.left < second.right &&
      first.right > second.left &&
      first.top < second.bottom &&
      first.bottom > second.top;

    const origin = box("#origin");
    const destination = box("#destination");
    const swap = box(".swap-button");
    const date = box('input[type="date"]');
    const buffer = box('select[name="buffer"]');
    const check = box(".calculate-button");
    const board = box(".departure-board");
    const controls = box(".route-controls");
    const footer = box(".rail-footer");
    const roundedControls = [...document.querySelectorAll("button, input, select")]
      .filter((element) => getComputedStyle(element).borderRadius !== "0px")
      .map((element) => (element as HTMLElement).className);

    return {
      width: window.innerWidth,
      originSwapOverlap: overlaps(origin, swap),
      destinationSwapOverlap: overlaps(destination, swap),
      dateBufferOverlap: overlaps(date, buffer),
      bufferCheckOverlap: overlaps(buffer, check),
      dateCheckOverlap: overlaps(date, check),
      roundedControls,
      controlsTop: controls.top,
      boardHeight: board.bottom - board.top,
      boardFooterGap: footer.top - board.bottom,
      viewportHeight: window.innerHeight
    };
  });

  expect(metrics.originSwapOverlap).toBe(false);
  expect(metrics.destinationSwapOverlap).toBe(false);
  expect(metrics.dateBufferOverlap).toBe(false);
  expect(metrics.bufferCheckOverlap).toBe(false);
  expect(metrics.dateCheckOverlap).toBe(false);
  expect(metrics.roundedControls).toEqual([]);

  if (metrics.width >= 896) {
    expect(metrics.controlsTop).toBeLessThan(120);
    expect(metrics.boardHeight).toBeGreaterThan(metrics.viewportHeight * 0.58);
    expect(metrics.boardFooterGap).toBeLessThanOrEqual(20);
  }
});

test("16 · mobile date value is centered within its field", async ({ page }) => {
  const alignment = await page.evaluate(() => {
    const input = document.querySelector('input[type="date"]')!;
    const value = getComputedStyle(input, "::-webkit-date-and-time-value");
    return {
      viewportWidth: window.innerWidth,
      textAlign: value.textAlign,
      textPaddingLeft: value.paddingLeft,
      textPaddingRight: value.paddingRight
    };
  });

  if (alignment.viewportWidth < 896) {
    expect(alignment.textAlign).toBe("center");
    expect(alignment.textPaddingLeft).toBe(alignment.textPaddingRight);
  }
});

test("17 · typography is unified and the header train rides the rail", async ({ page }) => {
  const visual = await page.evaluate(() => {
    const style = (selector: string) =>
      getComputedStyle(document.querySelector(selector) as HTMLElement);
    const runner = style(".header-train-runner");
    const station = style(".station-picker input");
    const button = style(".calculate-button");
    const route = style(".leg-heading strong");
    const boardTime = style(".board-time time");
    const families = [
      style(".wordmark h1").fontFamily,
      station.fontFamily,
      button.fontFamily,
      route.fontFamily,
      boardTime.fontFamily
    ];

    return {
      families,
      animationName: runner.animationName,
      animationDuration: runner.animationDuration,
      stationSize: Number.parseFloat(station.fontSize),
      buttonSize: Number.parseFloat(button.fontSize),
      routeSize: Number.parseFloat(route.fontSize)
    };
  });

  expect(visual.families.every((family) => family.includes("Nunito Sans Variable"))).toBe(true);
  expect(new Set(visual.families).size).toBe(1);
  expect(visual.animationName).toBe("header-train-ride");
  expect(visual.animationDuration).toBe("11s");
  expect(visual.stationSize).toBeGreaterThanOrEqual(13);
  expect(visual.buttonSize).toBeGreaterThanOrEqual(11);
  expect(visual.routeSize).toBeGreaterThanOrEqual(10);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      page.locator(".header-train-runner").evaluate((element) =>
        getComputedStyle(element).animationName
      )
    )
    .toBe("none");
});

test("17 · optional details open without colliding with the journey", async ({ page }) => {
  const journey = page.locator(".compact-route");
  const foot = page.locator(".board-foot");
  const board = page.locator(".departure-board");
  const technical = page.locator(".technical-drawer").first();
  const alternatives = page.locator(".alternatives-drawer");

  await technical.locator("summary").click();
  await expect(technical.locator(".technical-content")).toBeVisible();

  const technicalMetrics = await page.evaluate(() => {
    const route = document.querySelector(".compact-route")!.getBoundingClientRect();
    const foot = document.querySelector(".board-foot")!.getBoundingClientRect();
    const content = document.querySelector(".technical-content")!.getBoundingClientRect();
    const boardRect = document.querySelector(".departure-board")!.getBoundingClientRect();
    return {
      routeBottom: route.bottom,
      footTop: foot.top,
      contentBottom: content.bottom,
      boardBottom: boardRect.bottom,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth
    };
  });

  expect(technicalMetrics.routeBottom).toBeLessThanOrEqual(technicalMetrics.footTop + 1);
  expect(technicalMetrics.contentBottom).toBeLessThanOrEqual(technicalMetrics.boardBottom + 1);
  expect(technicalMetrics.scrollWidth).toBeLessThanOrEqual(technicalMetrics.viewportWidth);

  await technical.locator("summary").click();
  await alternatives.locator("summary").click();
  await expect(alternatives.locator(".alternative-lines")).toBeVisible();
  await expect(journey).toBeVisible();
  await expect(foot).toBeVisible();
  await expect(board).toBeVisible();
});
