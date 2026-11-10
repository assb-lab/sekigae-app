import { expect, seedProject, test } from "./fixtures";

test("phones get a view-only seating map with search", async ({ freshPage: page }) => {
  await page.goto("./#/seating");
  await seedProject(page, "small");
  await expect(page.getByTestId("mobile-seating")).toBeVisible();
  await expect(page.getByTestId("shuffle")).toHaveCount(0);
  await expect(page.getByTestId("mobile-search")).toBeVisible();
});
