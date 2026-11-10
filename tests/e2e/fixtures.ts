import { test as base, expect, type Download, type Page } from "@playwright/test";

const clearOnce = (seedPrefs: boolean) => {
  if (!sessionStorage.getItem("__e2e_init__")) {
    localStorage.clear();
    if (seedPrefs)
      localStorage.setItem(
        "sekigae:v1:prefs",
        JSON.stringify({ state: { onboardingCompleted: true, tourSeen: true }, version: 1 }),
      );
    sessionStorage.setItem("__e2e_init__", "1");
  }
};

/**
 * freshPage: 空の localStorage から開始（オンボーディング完了済み扱い）
 * firstRunPage: 完全な初回起動（ウェルカムダイアログが出る）
 */
export const test = base.extend<{ freshPage: Page; firstRunPage: Page }>({
  freshPage: async ({ page }, provide) => {
    await page.addInitScript(clearOnce, true);
    await provide(page);
  },
  firstRunPage: async ({ page }, provide) => {
    await page.addInitScript(clearOnce, false);
    await provide(page);
  },
});

export { expect };

/** ダウンロードを待ってファイル名と中身を返す */
export async function captureDownload(page: Page, trigger: () => Promise<unknown>) {
  const [download] = await Promise.all([page.waitForEvent("download"), trigger()]);
  const d = download as Download;
  const path = await d.path();
  return { filename: d.suggestedFilename(), path };
}

/** アプリの開発フック window.__sekigae（navigator.webdriver 時のみ有効）の最小限の型 */
interface DevHooks {
  seed: (size: string) => Promise<void>;
  rules: () => { block: { type: string } }[];
}
type HookGlobal = { __sekigae?: DevHooks };

/** テスト用のプロジェクト（small / medium / large）を読み込む */
export async function seedProject(page: Page, size: "small" | "medium" | "large" = "small") {
  await page.waitForFunction(() => !!(globalThis as unknown as HookGlobal).__sekigae);
  await page.evaluate((s) => (globalThis as unknown as HookGlobal).__sekigae!.seed(s), size);
}

/** 現在のルールのブロック種別一覧 */
export function ruleTypes(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    (globalThis as unknown as HookGlobal).__sekigae!.rules().map((r) => r.block.type),
  );
}
