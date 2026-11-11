/**
 * 席のヒットテストとキーボード移動（純関数）。ワールド座標 = セル単位。
 * パン / ズーム中でも viewport.clientToWorld でワールド座標に直してから使う。
 */
import { seatCells, seatSize } from "@/domain/geometry/seat";
import type { ID, Room, Seat } from "@/domain/schema";

export interface SeatPos {
  seat: Seat;
  room: Room;
  /** 席（横長の机はフットプリント）の左上（ワールド座標） */
  x: number;
  y: number;
  /** フットプリントの幅・高さ（1×1 の席は 1, 1） */
  w: number;
  h: number;
}

/** チップなど 1×1 の部品を置く左上（横長の机では中央のセル位置） */
export const seatAnchor = (p: SeatPos) => ({ x: p.x + (p.w - 1) / 2, y: p.y + (p.h - 1) / 2 });

/** 点から席の「中心線」（各セル中心を結ぶ線分）までの距離 */
const distTo = (p: SeatPos, x: number, y: number) => {
  const nx = Math.min(Math.max(x, p.x + 0.5), p.x + p.w - 0.5);
  const ny = Math.min(Math.max(y, p.y + 0.5), p.y + p.h - 0.5);
  return Math.hypot(nx - x, ny - y);
};

const posCache = new WeakMap<Room[], { list: SeatPos[]; byCell: Map<string, SeatPos> }>();

function build(rooms: Room[]) {
  let c = posCache.get(rooms);
  if (!c) {
    const list: SeatPos[] = [];
    const byCell = new Map<string, SeatPos>();
    for (const room of rooms)
      for (const seat of room.seats) {
        const p = {
          seat,
          room,
          x: room.position.x + seat.x,
          y: room.position.y + seat.y,
          ...seatSize(seat),
        };
        list.push(p);
        for (const c of seatCells(seat))
          byCell.set(`${room.position.x + c.x},${room.position.y + c.y}`, p);
      }
    c = { list, byCell };
    posCache.set(rooms, c);
  }
  return c;
}

/** 全席のワールド位置（部屋順・席順） */
export const seatPositions = (rooms: Room[]): SeatPos[] => build(rooms).list;

/** ワールド座標の点を含む席 */
export function seatAt(rooms: Room[], x: number, y: number): SeatPos | undefined {
  return build(rooms).byCell.get(`${Math.floor(x)},${Math.floor(y)}`);
}

/**
 * ワールド座標の点に最も近い席（セル中心からの距離が maxDist 以内）。
 * 椅子はセルの外にはみ出して描かれるので、ドロップ・クリックの判定を少し寛容にする。
 */
export function nearestSeat(rooms: Room[], x: number, y: number, maxDist = 1): SeatPos | undefined {
  const exact = seatAt(rooms, x, y);
  if (exact) return exact;
  let best: SeatPos | undefined;
  let bestD = maxDist;
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  const byCell = build(rooms).byCell;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const p = byCell.get(`${cx + dx},${cy + dy}`);
      if (!p) continue;
      const d = distTo(p, x, y);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
  return best;
}

export function seatPosOf(rooms: Room[], seatId: ID): SeatPos | undefined {
  return build(rooms).list.find((p) => p.seat.id === seatId);
}

const posById = new WeakMap<Room[], Map<ID, SeatPos>>();
/** 席 ID → 位置（メモ化） */
export function seatPosIndex(rooms: Room[]): Map<ID, SeatPos> {
  let m = posById.get(rooms);
  if (!m) {
    m = new Map(build(rooms).list.map((p) => [p.seat.id, p]));
    posById.set(rooms, m);
  }
  return m;
}

export type Dir = "up" | "down" | "left" | "right";

/**
 * 矢印キーで次の席へ。進行方向の半平面にある席のうち、
 * 主軸の距離 + 副軸のずれ×2 が最小のもの（格子状に並んだ席で自然に動く）。
 */
export function nextSeatInDirection(
  rooms: Room[],
  fromSeatId: ID | null,
  dir: Dir,
): ID | undefined {
  const list = build(rooms).list;
  if (!list.length) return undefined;
  const from = fromSeatId ? list.find((p) => p.seat.id === fromSeatId) : undefined;
  if (!from) return list[0]!.seat.id;
  const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir] as [
    number,
    number,
  ];
  let best: SeatPos | undefined;
  let bestCost = Infinity;
  for (const p of list) {
    if (p === from) continue;
    const a = seatAnchor(p);
    const b = seatAnchor(from);
    const vx = a.x - b.x;
    const vy = a.y - b.y;
    const main = vx * dx + vy * dy;
    if (main <= 0) continue;
    const side = Math.abs(vx * dy - vy * dx);
    const cost = main + side * 2;
    if (cost < bestCost) {
      bestCost = cost;
      best = p;
    }
  }
  return best?.seat.id;
}
