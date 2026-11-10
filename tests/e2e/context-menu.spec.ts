import { expect, ruleTypes, seedProject, test } from "./fixtures";

test.beforeEach(async ({ freshPage: page }) => {
  await page.goto("./#/rooms");
  await seedProject(page, "small");
});

test("creates a rule from a seat's context menu in the room editor", async ({
  freshPage: page,
}) => {
  const seat = page.locator("[data-seat-id]").first();
  await expect(seat).toBeVisible();
  await seat.click({ button: "right" });
  await expect(page.getByTestId("canvas-context-menu")).toBeVisible();
  await page.getByTestId("rule-action-seat.empty").click();
  expect(await ruleTypes(page)).toContain("seat.empty");
});

test("opens rule actions from a member row", async ({ freshPage: page }) => {
  await page.goto("./#/members");
  await page.getByTestId("member-row").first().click({ button: "right" });
  await expect(page.getByTestId("member-context-menu")).toBeVisible();
});
