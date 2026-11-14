import { expect, FIXED_NOW, test } from "../support/fixtures";
import { buildSession, OWNED_HORSES } from "../support/test-data";

const transportId = "33333333-3333-4333-8333-333333333333";
const session = buildSession("DRIVER");

test.beforeEach(async ({ page, api }) => {
  await page.addInitScript((auth) => {
    localStorage.setItem(
      "pegaxus-auth",
      JSON.stringify({
        state: {
          ...auth,
          principal: {
            id: auth.user.accountId,
            displayName: auth.user.fullName,
            roles: ["DRIVER"],
            permissions: [],
          },
        },
        version: 0,
      }),
    );
  }, session);
  api.ok("GET", "/accounts/me", session.user);
  api.ok("GET", "/transports/assigned-to-me", {
    serverTime: FIXED_NOW,
    items: [
      {
        transportId,
        transportCode: "TR-2026-0142",
        bookingCode: "BK-2026-0142",
        status: "IN_TRANSIT",
        myRole: "DRIVER",
        horseCount: 2,
        departureAt: FIXED_NOW,
        etaAt: null,
        currentSegment: null,
      },
    ],
  });
  api.ok("GET", `/transports/${transportId}/tracking`, {
    serverTime: FIXED_NOW,
    transportId,
    transportStatus: "IN_TRANSIT",
    plannedRoute: { segments: [] },
    plannedRemainingDistanceKm: 0,
    truck: { latitude: 51.5074, longitude: -0.1278, recordedAt: FIXED_NOW },
  });
  api.ok("GET", /^\/transports\/[^/]*\/overview$/, {
    serverTime: FIXED_NOW,
    transport: {
      transportId,
      transportCode: "TR-2026-0142",
      status: "IN_TRANSIT",
      actualDepartureAt: FIXED_NOW,
      actualArrivalAt: null,
      completedAt: null,
    },
    booking: {
      bookingId: "booking-1",
      bookingCode: "BK-2026-0142",
      customerName: "Test Customer",
      originAddress: "London",
      originCountry: "GB",
      destinationAddress: "Paris",
      destinationCountry: "FR",
    },
    routeType: null,
    routePlan: null,
    currentSegment: null,
    totalSegments: 0,
    completedSegments: 0,
    departureAt: FIXED_NOW,
    etaAt: null,
    horseCount: 2,
    horseHealthSummary: {
      total: 2,
      normal: 2,
      observationRequired: 0,
      atRisk: 0,
      critical: 0,
      noData: 0,
    },
  });
  api.ok("GET", `/transports/${transportId}/horse-health`, {
    serverTime: FIXED_NOW,
    transportId,
    transportStatus: "IN_TRANSIT",
    currentEscort: null,
    horses: OWNED_HORSES.map((horse) => ({
      horse,
      latestHealthStatus: "NORMAL",
      latestLog: null,
      logCount: 0,
    })),
  });
});

for (const width of [320, 375, 768, 1024, 1280, 1440]) {
  test(`crew incident forms fit ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    for (const [kind, detailsName] of [
      ["vehicle", "Vehicle incident details"],
      ["horse-health", "Selected horses incident details"],
    ] as const) {
      await page.goto(`/crew/incidents/new/${kind}`);
      if (kind === "horse-health") {
        await expect(
          page.getByRole("button", { name: "Next", exact: true }),
        ).toBeDisabled();
        await page.getByText("Golden Thunder", { exact: true }).click();
        await expect(
          page.getByRole("checkbox", { name: "Select Golden Thunder" }),
        ).toBeChecked();
        await expect(
          page.getByText("1 selected", { exact: true }),
        ).toBeVisible();
        await page.screenshot({
          path: testInfo.outputPath(`horse-selection-${width}.png`),
          fullPage: true,
        });
        await page.getByRole("button", { name: "Next", exact: true }).click();
      }

      const report = page
        .getByRole("heading", { name: "Report information", exact: true })
        .locator("..");
      const details = page.getByRole("region", {
        name: detailsName,
        exact: true,
      });
      await expect(details).toBeVisible();
      await page
        .getByPlaceholder("Briefly describe the incident")
        .fill("Incident layout check");
      const reportBox = await report.boundingBox();
      const detailsBox = await details.boundingBox();
      if (!reportBox || !detailsBox)
        throw new Error("Incident form sections are missing");
      if (width >= 1280) {
        expect(detailsBox.x).toBeGreaterThanOrEqual(
          reportBox.x + reportBox.width,
        );
        expect(Math.abs(detailsBox.y - reportBox.y)).toBeLessThan(2);
        if (kind === "horse-health") {
          const photoHeading = await page
            .getByRole("heading", { name: /incident photos/i })
            .boundingBox();
          expect(photoHeading?.x).toBeLessThan(detailsBox.x);
          const inputTops = await page
            .getByRole("group", { name: "Vital signs", exact: true })
            .getByRole("spinbutton")
            .evaluateAll((inputs) =>
              inputs.map((input) => input.getBoundingClientRect().top),
            );
          expect(inputTops).toHaveLength(3);
          expect(Math.max(...inputTops) - Math.min(...inputTops)).toBeLessThan(
            2,
          );
        }
      } else {
        expect(detailsBox.y).toBeGreaterThanOrEqual(
          reportBox.y + reportBox.height,
        );
      }
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`${kind}-${width}.png`),
        fullPage: true,
      });
      const submit = page.getByRole("button", {
        name: "Submit incident report",
        exact: true,
      });
      await submit.scrollIntoViewIfNeeded();
      await expect(submit).toBeInViewport();
    }
  });
}
