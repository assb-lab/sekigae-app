import { importJsonFile } from "@/features/project/io";

/** バックアップ JSON（プロジェクト全体）を読み込む。エラー表示は永続化側が行う */
export function importBackupFile(file: File): Promise<boolean> {
  return importJsonFile(file, { expect: "project" });
}
