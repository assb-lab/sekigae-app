/**
 * 手動配置の操作（純関数）。ドロップのプレビュー評価と確定の両方で同じ計算を使う。
 *
 * | 操作                 | 結果                                       |
 * | -------------------- | ------------------------------------------ |
 * | トレイ → 空席        | 配置                                       |
 * | トレイ → 使用中の席  | 配置し、元の人はトレイへ                   |
 * | 席 → 空席            | 移動                                       |
 * | 席 → 使用中の席      | 入れ替え                                   |
 * | 席 → トレイ          | 配置を外す                                 |
 */
import type { ID } from "@/domain/schema";
import type { Violation } from "@/engine";

export type DropTarget = { kind: "seat"; seatId: ID } | { kind: "tray" };

export type DropKind = "assign" | "replace" | "move" | "swap" | "unassign" | "none";

export interface DropOutcome {
  kind: DropKind;
  assignment: Record<ID, ID>;
  /** トレイへ戻る人（replace） / 入れ替え相手（swap） */
  other?: ID;
}

export function seatOf(assignment: Record<ID, ID>, memberId: ID): ID | undefined {
  for (const [sid, mid] of Object.entries(assignment)) if (mid === memberId) return sid;
  return undefined;
}

/** ロックされた席は置き先にも移動元にもできない */
export function canDrop(
  assignment: Record<ID, ID>,
  locks: ReadonlySet<ID>,
  memberId: ID,
  target: DropTarget,
): boolean {
  const from = seatOf(assignment, memberId);
  if (from && locks.has(from)) return false;
  if (target.kind === "seat" && locks.has(target.seatId)) return from === target.seatId;
  return true;
}

export function applyDrop(
  assignment: Record<ID, ID>,
  memberId: ID,
  target: DropTarget,
): DropOutcome {
  const from = seatOf(assignment, memberId);
  const next = { ...assignment };
  if (target.kind === "tray") {
    if (!from) return { kind: "none", assignment };
    delete next[from];
    return { kind: "unassign", assignment: next };
  }
  const to = target.seatId;
  if (from === to) return { kind: "none", assignment };
  const occupant = assignment[to];
  if (from) delete next[from];
  next[to] = memberId;
  if (!occupant) return { kind: from ? "move" : "assign", assignment: next };
  if (from) {
    next[from] = occupant;
    return { kind: "swap", assignment: next, other: occupant };
  }
  return { kind: "replace", assignment: next, other: occupant };
}

export interface RuleDelta {
  /** 新たに違反になる（または悪化する）ルール */
  created: ID[];
  /** 違反が解消する（または改善する）ルール */
  resolved: ID[];
  /** hard 違反量の増減 */
  hardDelta: number;
  scoreDelta: number;
}

/** 2 つの評価の差（ルール単位）。プリセット項は除く */
export function ruleDelta(
  before: readonly Violation[],
  after: readonly Violation[],
  score: { before: number; after: number },
): RuleDelta {
  const b = new Map<ID, Violation>();
  for (const v of before) if (v.ruleId) b.set(v.ruleId, v);
  const out: RuleDelta = {
    created: [],
    resolved: [],
    hardDelta: 0,
    scoreDelta: score.after - score.before,
  };
  for (const v of after) {
    if (!v.ruleId) continue;
    const prev = b.get(v.ruleId)?.violation ?? 0;
    if (v.violation > prev) out.created.push(v.ruleId);
    else if (v.violation < prev) out.resolved.push(v.ruleId);
    if (v.strength === "hard") out.hardDelta += v.violation - prev;
  }
  return out;
}
