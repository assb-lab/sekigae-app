/**
 * 席の占有範囲（フットプリント）。docs/DESIGN.md §3.2
 *
 * 通常の席は 1×1 セル。`span` が 2 以上の席は「横長の机」（部長席など）で、
 * 座る人から見て左右方向（= 向きと直交する方向）に span セルぶん伸びる。
 * - 北 / 南向き: 横 span × 縦 1（(x, y) から右へ）
 * - 東 / 西向き: 横 1 × 縦 span（(x, y) から下へ）
 * (x, y) は常にフットプリントの左上セル。
 */
import type { Facing } from "../schema";

/** 横長の机の最大幅（セル数） */
export const MAX_SEAT_SPAN = 4;

export interface SeatShape {
  x: number;
  y: number;
  facing: Facing;
  span?: number;
}

/** 正規化した span（1..MAX_SEAT_SPAN の整数） */
export const seatSpan = (s: { span?: number }): number => {
  const n = Math.floor(s.span ?? 1);
  return Number.isFinite(n) ? Math.max(1, Math.min(MAX_SEAT_SPAN, n)) : 1;
};

/** 横向き（東西）の席は縦に伸びる */
export const isVerticalFacing = (f: Facing) => f === "e" || f === "w";

/** フットプリントの幅・高さ（セル数） */
export function seatSize(s: Pick<SeatShape, "facing" | "span">): { w: number; h: number } {
  const n = seatSpan(s);
  return isVerticalFacing(s.facing) ? { w: 1, h: n } : { w: n, h: 1 };
}

/** フットプリントの矩形（部屋ローカルのセル座標） */
export function seatRect(s: SeatShape): { x: number; y: number; w: number; h: number } {
  return { x: s.x, y: s.y, ...seatSize(s) };
}

/** 席が占めるセルの一覧（左上から） */
export function seatCells(s: SeatShape): { x: number; y: number }[] {
  const { w, h } = seatSize(s);
  const out: { x: number; y: number }[] = [];
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++) out.push({ x: s.x + dx, y: s.y + dy });
  return out;
}

/** セル (x, y) が席に含まれるか */
export function seatCovers(s: SeatShape, x: number, y: number): boolean {
  const { w, h } = seatSize(s);
  return x >= s.x && y >= s.y && x < s.x + w && y < s.y + h;
}

/** フットプリントの中心（部屋ローカル座標、セル左上原点） */
export function seatCenter(s: SeatShape): { x: number; y: number } {
  const { w, h } = seatSize(s);
  return { x: s.x + w / 2, y: s.y + h / 2 };
}

/** 2 つの矩形が重なるか */
export function seatsOverlap(a: SeatShape, b: SeatShape): boolean {
  const ra = seatRect(a);
  const rb = seatRect(b);
  return ra.x < rb.x + rb.w && rb.x < ra.x + ra.w && ra.y < rb.y + rb.h && rb.y < ra.y + ra.h;
}
