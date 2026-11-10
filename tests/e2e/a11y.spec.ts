import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

const routes = ["rooms", "members", "rules", "seating", "export"] as const;

for (const scheme of ["light", "dark"] as const) {
  test.describe(`a11y (${scheme})`, () => {
    test.use({ colorScheme: scheme });
    for (const route of routes) {
      test(`${route} has no serious axe violations`, async ({ firstRunPage: page }) => {
        await page.goto("./");
        await page.getByLabel(/ガイドツアー|guided tour/i).uncheck();
        await page.getByTestId("welcome-sample").click();
        await page.goto(`./#/${route}`);
        await page.waitForTimeout(600);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa"])
          // 装飾的な SVG キャンバス内の小さな文字はズームで拡大できるため対象外
          .exclude("[data-seating-canvas] svg")
          .exclude('[data-tour="room-canvas"] svg')
          .analyze();
        const serious = results.violations.filter(
          (v) => v.impact === "serious" || v.impact === "critical",
        );
        const summary = serious.map(
          (v) =>
            `${v.id}: ${v.nodes.length} ${v.nodes
              .slice(0, 3)
              .map((n) => n.target.join(" "))
              .join(" | ")}`,
        );
        expect(summary, summary.join("\n")).toEqual([]);
      });
    }
  });
}
