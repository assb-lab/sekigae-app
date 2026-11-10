# リリース前チェックリスト

v1 は一般公開しない。ビルド成果物（`dist/`）を学内サーバー等に置いて配布する。

## 自動チェック（CI）

- [ ] `pnpm exec vp check`（フォーマット・lint・型チェック）
- [ ] `pnpm i18n:check`（ja / en のキー差分）
- [ ] `pnpm test`（単体テスト）
- [ ] `pnpm build` と `pnpm bundle:check`（初期 JS の gzip 予算 380 KB、出力ライブラリが遅延ロードであること）
- [ ] `pnpm e2e`（Chromium + モバイル。a11y の axe 検査・通しシナリオ・オフライン含む）
- [ ] （任意）`pnpm e2e:all-browsers`（Firefox / WebKit）

## 手動確認

- [ ] 出力ファイル: docs/export-manual-check.md（Excel / PowerPoint / LibreOffice / Keynote / Google スライド）
- [ ] PWA のインストール（Chrome / Edge / Safari）と、オフラインでの出力
- [ ] スマートフォン（iOS Safari / Android Chrome）で閲覧・名前検索
- [ ] キーボードのみで「部屋 → 名簿 → ルール → 席配置 → 出力」が完了できる
- [ ] ライト / ダーク両テーマで主要画面の見た目

## リリース手順

1. `package.json` の `version` と CHANGELOG を更新
2. `pnpm build` → `dist/` を zip にして GitHub Release に添付（タグ `vX.Y.Z`）
3. 保存データの `schemaVersion` を変えた場合は `src/store/persistence` にマイグレーションを追加し、テストする

## 保存データの互換性

- v1.0.0 の `schemaVersion` は 1。以降、形式を変える場合は必ずマイグレーションを追加する（古いデータを読めなくしない）。
