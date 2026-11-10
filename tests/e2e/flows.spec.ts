import ExcelJS from "exceljs";
import { captureDownload, expect, test } from "./fixtures";

test("full flow: sample → year update → preset → XLSX export", async ({ firstRunPage: page }) => {
  test.setTimeout(90_000);
  await page.goto("./");
  await page.getByLabel(/ガイドツアー|guided tour/i).uncheck();
  await page.getByTestId("welcome-sample").click();

  // ② 名簿: 年度更新ウィザード（今年度案 → 昨年度、進級）
  await page.goto("./#/members");
  await page.getByTestId("open-wizard").click();
  const wiz = page.getByTestId("year-wizard");
  await wiz.getByTestId("wizard-prev-name").fill("2026年度");
  await wiz.getByTestId("wizard-next").click();
  await wiz.getByTestId("wizard-run").click();
  await expect(wiz.getByTestId("wizard-done")).toBeVisible();
  await page.keyboard.press("Escape");

  // ④ 席配置: プリセットで配置（既存の配置があれば置き換え）
  await page.goto("./#/seating");
  await page.getByTestId("apply-presets").click();
  const overwrite = page.getByTestId("preset-overwrite");
  if (await overwrite.isVisible({ timeout: 1500 }).catch(() => false)) await overwrite.click();
  await expect(page.getByTestId("unassigned-count")).toHaveText("0", { timeout: 20_000 });
  await expect(page.getByTestId("shuffle")).toBeVisible();
  await expect(page.getByTestId("hard-count")).toContainText("0");
  const placed = await page.getByTestId("member-chip").count();
  expect(placed).toBeGreaterThan(10);

  // ⑤ 出力: XLSX
  await page.goto("./#/export");
  await page.getByTestId("export-format-xlsx").click();
  await page.getByTestId("export-lang-ja").click();
  await page.getByTestId("export-filename").fill("flow");
  const { path } = await captureDownload(page, () =>
    page.getByTestId("export-download").first().click(),
  );
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const roster = wb.getWorksheet("名簿")!;
  expect(roster.getCell("A1").value).toBe("氏名");
  expect(roster.actualRowCount - 1).toBeGreaterThanOrEqual(placed);
});

test("works offline after the first visit (PWA)", async ({ freshPage: page, context }) => {
  await page.goto("./#/rooms");
  // Service Worker が有効になるまで待つ
  await expect
    .poll(
      () =>
        page.evaluate(async () =>
          (await navigator.serviceWorker.getRegistrations()).some((r) => !!r.active),
        ),
      { timeout: 15_000 },
    )
    .toBe(true);
  // 有効化後のナビゲーションから Service Worker がページを制御する
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("main h1")).toBeVisible();
  await page.locator('header [data-tour="step-seating"]').click();
  await expect(page).toHaveURL(/#\/seating/);
  await context.setOffline(false);
});
