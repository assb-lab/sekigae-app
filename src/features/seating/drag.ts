/**
 * メンバーのドラッグ&ドロップ（ポインタイベントで実装）。
 * SVG のパン・ズーム中でも viewport.clientToWorld で席を判定する。トレイは data-drop-tray 属性で判定。
 */
import { create } from "zustand";
import type { ViewportController } from "@/components/canvas";
import type { ID } from "@/domain/schema";
import { useProjectStore } from "@/store/project";
import { dropMember } from "./actions";
import { nearestSeat } from "./lib/hit";
import type { DropTarget } from "./lib/placement";
import { useSeatingUi } from "./seatingStore";

export interface DragState {
  memberId: ID;
  fromSeatId: ID | null;
  x: number;
  y: number;
  /** しきい値を超えて実際にドラッグ中か（超えなければクリック扱い） */
  active: boolean;
  over: DropTarget | null;
}

interface DragStore {
  drag: DragState | null;
  viewport: ViewportController | null;
  setViewport: (v: ViewportController | null) => void;
}

export const useDragStore = create<DragStore>()((set) => ({
  drag: null,
  viewport: null,
  setViewport: (viewport) => set({ viewport }),
}));

const THRESHOLD = 5;

function targetAt(clientX: number, clientY: number): DropTarget | null {
  const el = document.elementFromPoint(clientX, clientY);
  if (el?.closest("[data-drop-tray]")) return { kind: "tray" };
  const vp = useDragStore.getState().viewport;
  if (!vp || !el?.closest("[data-seating-canvas]")) return null;
  const w = vp.clientToWorld(clientX, clientY);
  if (!w) return null;
  const hit = nearestSeat(useProjectStore.getState().project.layout.rooms, w.x, w.y);
  return hit ? { kind: "seat", seatId: hit.seat.id } : null;
}

/** チップ / トレイの pointerdown から呼ぶ */
export function beginDrag(
  e: {
    clientX: number;
    clientY: number;
    pointerId: number;
    button: number;
    preventDefault?: () => void;
  },
  memberId: ID,
  fromSeatId: ID | null,
  opts: { onClick?: () => void } = {},
) {
  if (e.button !== 0 || useSeatingUi.getState().solving) return;
  // 文字選択やブラウザ標準のドラッグが始まると pointercancel で中断されるので止める
  e.preventDefault?.();
  const start = { x: e.clientX, y: e.clientY };
  useDragStore.setState({
    drag: { memberId, fromSeatId, x: start.x, y: start.y, active: false, over: null },
  });
  useSeatingUi.getState().setHover(null);

  const move = (ev: PointerEvent) => {
    if (ev.pointerId !== e.pointerId) return;
    const d = useDragStore.getState().drag;
    if (!d) return;
    const active = d.active || Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > THRESHOLD;
    useDragStore.setState({
      drag: {
        ...d,
        x: ev.clientX,
        y: ev.clientY,
        active,
        over: active ? targetAt(ev.clientX, ev.clientY) : null,
      },
    });
  };
  const finish = (commit: boolean, at?: { x: number; y: number }) => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", cancel);
    window.removeEventListener("keydown", key);
    const d = useDragStore.getState().drag;
    useDragStore.setState({ drag: null });
    if (!d || !commit) return;
    if (!d.active) return opts.onClick?.();
    // 指を離した位置で判定し直す（最後の move から位置が変わっている場合がある）
    const over = (at && targetAt(at.x, at.y)) ?? d.over;
    if (over) dropMember(d.memberId, over);
  };
  const up = (ev: PointerEvent) =>
    ev.pointerId === e.pointerId && finish(true, { x: ev.clientX, y: ev.clientY });
  const cancel = () => finish(false);
  const key = (ev: KeyboardEvent) => ev.key === "Escape" && finish(false);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", cancel);
  window.addEventListener("keydown", key);
}
