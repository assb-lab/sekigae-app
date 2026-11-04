/**
 * ショートカット一覧ダイアログに表示する定義。各画面の定義をここで集約する。#143
 * keys は表示用（"Mod" は ⌘ / Ctrl に置換）。label は i18n キー（ns:key 形式）。
 */
import { ROOM_SHORTCUTS } from "@/features/rooms/shortcuts";

export interface ShortcutDef {
  keys: string[];
  label: string;
}
export interface ShortcutGroup {
  title: string;
  items: ShortcutDef[];
}

export const GLOBAL_SHORTCUTS: ShortcutGroup = {
  title: "onboarding:shortcuts.global",
  items: [
    { keys: ["Mod", "Z"], label: "onboarding:shortcuts.undo" },
    { keys: ["Mod", "Shift", "Z"], label: "onboarding:shortcuts.redo" },
    { keys: ["?"], label: "onboarding:shortcuts.help" },
  ],
};

const KEY_LABELS: Record<string, string> = {
  mod: "Mod",
  shift: "Shift",
  alt: "Alt",
  space: "Space",
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
  delete: "Delete",
  backspace: "Backspace",
  escape: "Esc",
};

/** "mod+shift+z" → ["Mod", "Shift", "Z"] */
export function comboToKeys(combo: string): string[] {
  if (combo === "+") return ["+"];
  return combo.split("+").map((k) => KEY_LABELS[k] ?? k.toUpperCase());
}

/** combos の先頭だけを表示（矢印キーなどは代表を 1 つ） */
function fromDefs(
  title: string,
  ns: string,
  defs: readonly { id: string; combos: readonly string[] }[],
): ShortcutGroup {
  return {
    title,
    items: defs.map((d) => ({
      keys: comboToKeys(d.combos[0] ?? ""),
      label: `${ns}:shortcuts.${d.id}`,
    })),
  };
}

export function getShortcutGroups(): ShortcutGroup[] {
  return [GLOBAL_SHORTCUTS, fromDefs("rooms:title", "rooms", ROOM_SHORTCUTS)];
}
