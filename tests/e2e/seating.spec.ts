import type { Page } from "@playwright/test";
import { expect, seedProject, test } from "./fixtures";

type Plan = {
  id: string;
  kind: string;
  assignment: Record<string, string>;
  locks: string[];
  seed?: number;
};
type Snapshot = { activePlanId: string; previousPlanId?: string; plans: Plan[] };

/** 現在のプロジェクトの配置案 */
function plans(page: Page): Promise<Snapshot> {
  return page.evaluate(() => {
    const g = globalThis as unknown as {
      __sekigae: { store: { getState: () => { project: Snapshot } } };
    };
    const p = g.__sekigae.store.getState().project;
    return { activePlanId: p.activePlanId, previousPlanId: p.previousPlanId, plans: p.plans };
  });
}
const active = async (page: Page) => {
  const s = await plans(page);
  return s.plans.find((p) => p.id === s.activePlanId)!;
};

async function arrange(page: Page) {
  await page.getByTestId("apply-presets").click();
  await expect(page.getByTestId("unassigned-count")).toHaveText("0", { timeout: 15_000 });
}

async function dragTo(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number } | (() => Promise<{ x: number; y: number }>),
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 10, from.y + 10, { steps: 3 });
  const target = typeof to === "function" ? await to() : to;
  await page.mouse.move(target.x, target.y, { steps: 12 });
  await page.mouse.up();
}

const center = async (page: Page, selector: string) => {
  const box = (await page.locator(selector).first().boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

/** キャンバスの初回フィット（ズーム）が終わって席の位置が動かなくなるまで待つ */
async function settle(page: Page) {
  let last = "";
  await expect
    .poll(
      async () => {
        const b = await page.locator("[data-seat-id]").first().boundingBox();
        const now = JSON.stringify(b);
        const stable = now === last;
        last = now;
        return stable;
      },
      { intervals: [150, 150, 150, 300] },
    )
    .toBe(true);
}

test.beforeEach(async ({ freshPage: page }) => {
  await page.goto("./#/seating");
  await seedProject(page, "medium");
  await expect(page.getByTestId("seating-canvas")).toBeVisible();
  await settle(page);
});

test("preset fills every seat and the rule panel is live", async ({ freshPage: page }) => {
  await arrange(page);
  await expect(page.getByTestId("member-chip")).toHaveCount(30);
  await expect(page.getByTestId("no-violations")).toBeVisible();
});

test("drag from the tray to a seat and back", async ({ freshPage: page }) => {
  const seatId = await page.locator("[data-seat-id]").first().getAttribute("data-seat-id");
  const member = await page.getByTestId("tray-member").first().getAttribute("data-member-id");
  await dragTo(page, await center(page, '[data-testid="tray-member"]'), () =>
    center(page, `[data-seat-id="${seatId}"] .sk-desk`),
  );
  await expect.poll(async () => (await active(page)).assignment[seatId!]).toBe(member);
  await dragTo(
    page,
    await center(page, `[data-testid="member-chip"][data-member-id="${member}"]`),
    await center(page, '[data-testid="unassigned-tray"]'),
  );
  await expect.poll(async () => (await active(page)).assignment[seatId!]).toBeUndefined();
});

test("locked seats survive a reshuffle; seeds reproduce", async ({ freshPage: page }) => {
  await arrange(page);
  const chip = page.getByTestId("member-chip").first();
  const seat = (await chip.getAttribute("data-seat"))!;
  const member = (await chip.getAttribute("data-member-id"))!;
  await chip.click({ button: "right" });
  await page.getByTestId("ctx-lock").click();
  await page.getByTestId("shuffle").click();
  await expect(page.getByTestId("shuffle")).toBeVisible({ timeout: 15_000 });
  const first = await active(page);
  expect(first.locks).toContain(seat);
  expect(first.assignment[seat]).toBe(member);

  const seedText = (await page.getByTestId("seed-button").textContent())!.split(":").pop()!.trim();
  await page.getByTestId("shuffle").click();
  await expect(page.getByTestId("shuffle")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("seed-button").click();
  await page.getByTestId("seed-input").fill(seedText);
  await page.getByTestId("seed-run").click();
  await expect(page.getByTestId("shuffle")).toBeVisible({ timeout: 15_000 });
  await expect.poll(async () => (await active(page)).assignment).toEqual(first.assignment);
});

test("keyboard: pick with Enter and place on another seat", async ({ freshPage: page }) => {
  await arrange(page);
  const before = await active(page);
  const canvas = page.getByTestId("seating-canvas");
  await canvas.focus();
  const announce = page.getByTestId("seating-announce");
  // 人が座っている席まで右へ移動（シャッフル結果によっては空席がある）
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("ArrowRight");
    if (!/空席|empty/.test((await announce.textContent()) ?? "")) break;
  }
  await page.keyboard.press("Enter");
  await expect(announce).toContainText(/選択|Picked/);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await active(page)).assignment).not.toEqual(before.assignment);
});

test("plans: duplicate, compare and adopt", async ({ freshPage: page }) => {
  await arrange(page);
  await page.getByTestId("plan-menu").click();
  await page.getByTestId("plan-duplicate").click();
  await page.getByTestId("shuffle").click();
  await expect(page.getByTestId("shuffle")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("compare-toggle").click();
  await expect(page.getByTestId("compare-view")).toBeVisible();
  await expect(page.getByTestId("compare-table")).toBeVisible();
  await page.getByTestId("adopt-1").click();
  await expect(page.getByTestId("compare-view")).toBeHidden();
  const s = await plans(page);
  expect(s.plans.filter((p) => p.kind === "current")).toHaveLength(2);
});

test("previous-year mode edits last year's plan", async ({ freshPage: page }) => {
  await page.getByTestId("year-prev").click();
  await expect(page.getByTestId("previous-banner")).toBeVisible();
  await expect(page.getByTestId("shuffle")).toHaveCount(0);
  await settle(page);
  const seatId = await page.locator("[data-seat-id]").nth(2).getAttribute("data-seat-id");
  await dragTo(page, await center(page, '[data-testid="tray-member"]'), () =>
    center(page, `[data-seat-id="${seatId}"] .sk-desk`),
  );
  await expect
    .poll(async () => {
      const s = await plans(page);
      return s.plans.find((p) => p.id === s.previousPlanId)?.assignment[seatId!];
    })
    .toBeTruthy();
  // 今年度の案は変わらない
  expect(Object.keys((await active(page)).assignment)).toHaveLength(0);
});

test("room scope with no rooms selected does not shuffle everything", async ({
  freshPage: page,
}) => {
  await page.getByTestId("shuffle-scope").click();
  await page.getByRole("menuitemradio", { name: /選んだ部屋|Selected rooms/ }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("shuffle")).toBeDisabled();
});

test("leaving one plan while comparing returns to the normal view", async ({ freshPage: page }) => {
  await page.getByTestId("plan-menu").click();
  await page.getByTestId("plan-duplicate").click();
  await page.getByTestId("compare-toggle").click();
  await expect(page.getByTestId("compare-view")).toBeVisible();
  await page.evaluate(() => {
    const g = globalThis as unknown as {
      __sekigae: {
        store: {
          getState: () => { project: { activePlanId: string }; removePlan: (id: string) => void };
        };
      };
    };
    const st = g.__sekigae.store.getState();
    st.removePlan(st.project.activePlanId);
  });
  await expect(page.getByTestId("compare-view")).toBeHidden();
  await expect(page.getByTestId("shuffle")).toBeVisible();
  await expect(page.getByTestId("compare-toggle")).toBeEnabled();
});
