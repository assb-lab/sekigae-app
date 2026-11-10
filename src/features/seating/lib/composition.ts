/**
 * 部屋ごとの研究室構成・役職内訳（純関数）。#160
 * 全体比率は名簿全員の研究室比率（group.labBalance と同じ考え方）。
 */
import { ROLE_ORDER, type RoleKey } from "@/domain/roles";
import type { ID, Lab, Member, Room } from "@/domain/schema";

export interface LabShare {
  /** null = 研究室なし */
  labId: ID | null;
  count: number;
  /** 部屋内の比率 (0..1) */
  share: number;
  /** 全体の比率 (0..1) */
  overall: number;
  /** share - overall */
  diff: number;
}

export interface RoomComposition {
  roomId: ID;
  seats: number;
  total: number;
  labs: LabShare[];
  roles: { role: RoleKey; count: number }[];
  /** 全体比率からのずれの合計 / 2（0 = 全体と同じ構成、1 = 完全に偏り） */
  imbalance: number;
}

export interface Compositions {
  rooms: Map<ID, RoomComposition>;
  overall: { labId: ID | null; count: number; share: number }[];
  totalMembers: number;
}

const labOrder = (labs: readonly Lab[]) => {
  const m = new Map<ID | null, number>(labs.map((l, i) => [l.id, i]));
  m.set(null, labs.length);
  return (id: ID | null) => m.get(id) ?? labs.length + 1;
};

export function computeCompositions(
  rooms: readonly Room[],
  members: readonly Member[],
  labs: readonly Lab[],
  assignment: Record<ID, ID>,
): Compositions {
  const labIds = new Set(labs.map((l) => l.id));
  const labOf = (m: Member): ID | null => (m.labId && labIds.has(m.labId) ? m.labId : null);
  const order = labOrder(labs);
  const byId = new Map(members.map((m) => [m.id, m]));

  const overallCount = new Map<ID | null, number>();
  for (const m of members) overallCount.set(labOf(m), (overallCount.get(labOf(m)) ?? 0) + 1);
  const total = members.length;
  const overall = [...overallCount]
    .map(([labId, count]) => ({ labId, count, share: total ? count / total : 0 }))
    .sort((a, b) => order(a.labId) - order(b.labId));
  const overallShare = new Map(overall.map((o) => [o.labId, o.share]));

  const out = new Map<ID, RoomComposition>();
  for (const room of rooms) {
    const labCount = new Map<ID | null, number>();
    const roleCount = new Map<RoleKey, number>();
    let n = 0;
    for (const seat of room.seats) {
      const mid = assignment[seat.id];
      const m = mid ? byId.get(mid) : undefined;
      if (!m) continue;
      n++;
      labCount.set(labOf(m), (labCount.get(labOf(m)) ?? 0) + 1);
      roleCount.set(m.role, (roleCount.get(m.role) ?? 0) + 1);
    }
    const keys = new Set<ID | null>([...labCount.keys()]);
    const shares: LabShare[] = [...keys]
      .map((labId) => {
        const count = labCount.get(labId) ?? 0;
        const share = n ? count / n : 0;
        const o = overallShare.get(labId) ?? 0;
        return { labId, count, share, overall: o, diff: share - o };
      })
      .sort((a, b) => order(a.labId) - order(b.labId));
    // 部屋にいない研究室も含めて全体からのずれを測る
    let dev = 0;
    for (const [labId, o] of overallShare)
      dev += Math.abs((n ? (labCount.get(labId) ?? 0) / n : 0) - o);
    out.set(room.id, {
      roomId: room.id,
      seats: room.seats.length,
      total: n,
      labs: shares,
      roles: ROLE_ORDER.filter((r) => roleCount.has(r)).map((role) => ({
        role,
        count: roleCount.get(role)!,
      })),
      imbalance: n ? dev / 2 : 0,
    });
  }
  return { rooms: out, overall, totalMembers: total };
}
