/**
 * 席配置の操作（React 外からも呼べる）。今年度はアクティブ案、昨年度モードは昨年度案を編集する。
 * どの操作も 1 回の Undo にまとまる。
 */
import type { ID } from "@/domain/schema";
import { prevSeatActions } from "@/features/members/lib/prevPlan";
import { batch, useProjectStore } from "@/store/project";
import { activePlan, previousPlan } from "@/store/selectors";
import { useUiStore } from "@/store/ui";
import { applyDrop, canDrop, type DropOutcome, type DropTarget } from "./lib/placement";

const store = () => useProjectStore.getState();
const isPrevious = () => useUiStore.getState().editingPrevious;

export function currentAssignment(): Record<ID, ID> {
  const p = store().project;
  return (isPrevious() ? previousPlan(p)?.assignment : activePlan(p).assignment) ?? {};
}

export function currentLocks(): Set<ID> {
  if (isPrevious()) return new Set();
  return new Set(activePlan(store().project).locks);
}

/** メンバーをドロップする。実行した操作の種類を返す（none = 何もしない / 不可） */
export function dropMember(memberId: ID, target: DropTarget): DropOutcome["kind"] {
  const assignment = currentAssignment();
  if (!canDrop(assignment, currentLocks(), memberId, target)) return "none";
  const outcome = applyDrop(assignment, memberId, target);
  if (outcome.kind === "none") return "none";
  if (isPrevious()) {
    prevSeatActions.setSeat(memberId, target.kind === "seat" ? target.seatId : null, {
      swap: true,
    });
  } else {
    const planId = store().project.activePlanId;
    batch(() => store().setAssignment(planId, outcome.assignment));
  }
  return outcome.kind;
}

export function setLocked(seatIds: ID[], locked: boolean) {
  if (isPrevious() || !seatIds.length) return;
  store().setLocks(store().project.activePlanId, seatIds, locked);
}

export function toggleLock(seatId: ID) {
  const locked = currentLocks().has(seatId);
  setLocked([seatId], !locked);
}

/** 全員を外す（今年度はロック席を残す） */
export function unassignAll() {
  if (isPrevious()) {
    const p = store().project;
    const prev = previousPlan(p);
    if (!prev) return;
    batch(() => store().setAssignment(prev.id, {}));
    return;
  }
  store().clearAssignment(store().project.activePlanId, true);
}

/** ロックを `seat.pin` ルールに変換する */
export function locksToPinRules(): number {
  const p = store().project;
  const plan = activePlan(p);
  let n = 0;
  batch(() => {
    for (const seatId of plan.locks) {
      const memberId = plan.assignment[seatId];
      if (!memberId) continue;
      const exists = p.rules.some(
        (r) =>
          r.block.type === "seat.pin" && r.block.seatId === seatId && r.block.memberId === memberId,
      );
      if (exists) continue;
      store().addRule(
        { type: "seat.pin", seatId, memberId },
        { origin: "contextMenu", strength: "hard" },
      );
      n++;
    }
  });
  return n;
}
