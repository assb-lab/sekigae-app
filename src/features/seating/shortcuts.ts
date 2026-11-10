/**
 * 席配置画面のキーボードショートカット（表示用データ）。表示名は `seating:shortcuts.<id>`。
 */
export const SEATING_SHORTCUTS = [
  { id: "shuffle", combos: ["shift+s"] },
  { id: "moveFocus", combos: ["arrowright"] },
  { id: "pickPlace", combos: ["enter"] },
  { id: "lock", combos: ["l"] },
  { id: "unassign", combos: ["delete"] },
  { id: "cancel", combos: ["escape"] },
] as const;
