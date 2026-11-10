import i18n from "@/i18n";
import { history, useProjectStore } from "@/store/project";
import { useUiStore } from "@/store/ui";
import { createSampleProject } from "./sampleProject";

/** サンプルプロジェクトを開く（現在の UI 言語版） */
export function openSampleProject() {
  const lang = i18n.resolvedLanguage === "en" ? "en" : "ja";
  // プロジェクト固有の UI 状態（昨年度モード・選択）を通常の切替と同じくリセット
  useUiStore.getState().clearSelection();
  useUiStore.getState().setEditingPrevious(false);
  useProjectStore.getState().replaceProject(createSampleProject(lang));
  history.clear();
}
