import type { ID, Room } from "../schema";
import { seatCells } from "./seat";

/**
 * 同じ部屋内の席の隣接マップ（4 近傍 / 8 近傍）。
 * 横長の机はフットプリントのいずれかのセルが近傍に接していれば隣接とみなす。
 */
export function computeAdjacency(rooms: Room[], mode: 4 | 8): Map<ID, Set<ID>> {
  const adj = new Map<ID, Set<ID>>();
  for (const room of rooms) {
    const byPos = new Map<string, ID>();
    for (const s of room.seats) for (const c of seatCells(s)) byPos.set(`${c.x},${c.y}`, s.id);
    for (const s of room.seats) {
      const set = new Set<ID>();
      for (const c of seatCells(s))
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (mode === 4 && dx !== 0 && dy !== 0) continue;
            const n = byPos.get(`${c.x + dx},${c.y + dy}`);
            if (n && n !== s.id) set.add(n);
          }
      adj.set(s.id, set);
    }
  }
  return adj;
}
