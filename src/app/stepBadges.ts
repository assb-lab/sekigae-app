import { useProjectStore } from "@/store/project";
import { activePlan, seatIndex, totalSeats } from "@/store/selectors";
import type { StepId } from "./steps";

/**
 * ステッパーの完了度バッジ: 部屋 = 席数、名簿 = 人数、ルール = 有効なルール数、席配置 = 未配置の人数。
 */
export function useStepBadges(): Partial<Record<StepId, string | number>> {
  const seats = useProjectStore((s) => totalSeats(s.project.layout.rooms));
  const members = useProjectStore((s) => s.project.members.length);
  const rules = useProjectStore((s) => s.project.rules.filter((r) => r.enabled).length);
  const unassigned = useProjectStore((s) => {
    const p = s.project;
    const idx = seatIndex(p.layout.rooms);
    const placed = new Set(
      Object.entries(activePlan(p).assignment)
        .filter(([sid]) => idx.has(sid))
        .map(([, mid]) => mid),
    );
    return p.members.filter((m) => !placed.has(m.id)).length;
  });
  return {
    rooms: seats || undefined,
    members: members || undefined,
    rules: rules || undefined,
    seating: members ? (unassigned ? `-${unassigned}` : "✓") : undefined,
  };
}
