/** 席配置画面の一時的な UI 状態（永続化・Undo 対象外）。色分けモードだけ prefs に保存 */
import { create } from "zustand";
import type { ID } from "@/domain/schema";
import { DEFAULT_PRESET, type PresetId } from "@/engine";
import { usePrefs } from "@/store/prefs";
import { COLOR_MODES, type ColorMode } from "./lib/colors";

export interface Highlight {
  memberIds: ReadonlySet<ID>;
  seatIds: ReadonlySet<ID>;
}

export interface SeatingUiState {
  /** クリック配置: 選択中のメンバー */
  pickedMemberId: ID | null;
  /** キーボード操作中の席 */
  focusSeatId: ID | null;
  /** 選択中の部屋（シャッフル範囲） */
  selectedRoomIds: ID[];
  /** 凡例クリックで強調するキー */
  legendFocus: string | null;
  /** 違反パネルのホバーで強調する人・席 */
  highlight: Highlight | null;
  /** ホバーカード */
  hover: { memberId: ID; x: number; y: number } | null;
  presets: PresetId[];
  compare: { on: boolean; otherPlanId: ID | null };
  setPicked: (id: ID | null) => void;
  setFocusSeat: (id: ID | null) => void;
  toggleRoom: (id: ID) => void;
  clearRooms: () => void;
  setLegendFocus: (k: string | null) => void;
  setHighlight: (h: Highlight | null) => void;
  setHover: (h: SeatingUiState["hover"]) => void;
  togglePreset: (id: PresetId) => void;
  setPresets: (ids: PresetId[]) => void;
  setCompare: (c: Partial<SeatingUiState["compare"]>) => void;
}

export const useSeatingUi = create<SeatingUiState>()((set) => ({
  pickedMemberId: null,
  focusSeatId: null,
  selectedRoomIds: [],
  legendFocus: null,
  highlight: null,
  hover: null,
  presets: [DEFAULT_PRESET],
  compare: { on: false, otherPlanId: null },
  setPicked: (pickedMemberId) => set({ pickedMemberId }),
  setFocusSeat: (focusSeatId) => set({ focusSeatId }),
  toggleRoom: (id) =>
    set((s) => ({
      selectedRoomIds: s.selectedRoomIds.includes(id)
        ? s.selectedRoomIds.filter((x) => x !== id)
        : [...s.selectedRoomIds, id],
    })),
  clearRooms: () => set({ selectedRoomIds: [] }),
  setLegendFocus: (legendFocus) => set({ legendFocus }),
  setHighlight: (highlight) => set({ highlight }),
  setHover: (hover) => set({ hover }),
  togglePreset: (id) =>
    set((s) => ({
      presets: s.presets.includes(id) ? s.presets.filter((p) => p !== id) : [...s.presets, id],
    })),
  setPresets: (presets) => set({ presets }),
  setCompare: (c) => set((s) => ({ compare: { ...s.compare, ...c } })),
}));

const COLOR_KEY = "seating.colorMode";

export function useColorMode(): [ColorMode, (m: ColorMode) => void] {
  const raw = usePrefs((s) => s.ui[COLOR_KEY]);
  const setUi = usePrefs((s) => s.setUi);
  const mode = COLOR_MODES.includes(raw as ColorMode) ? (raw as ColorMode) : "role";
  return [mode, (m) => setUi(COLOR_KEY, m)];
}

const HEAT_KEY = "seating.heatmap";
export function useSeatingHeatmap(): [boolean, (v: boolean) => void] {
  const raw = usePrefs((s) => s.ui[HEAT_KEY]);
  const setUi = usePrefs((s) => s.setUi);
  return [raw === true, (v) => setUi(HEAT_KEY, v)];
}
