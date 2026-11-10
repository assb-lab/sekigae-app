/** 編集対象の案（今年度 = アクティブな案 / 昨年度モード = 昨年度の案） */
import type { SeatPlan } from "@/domain/schema";
import { useProjectStore } from "@/store/project";
import { activePlan, previousPlan } from "@/store/selectors";
import { useUiStore } from "@/store/ui";

const EMPTY_PLAN: SeatPlan = {
  id: "__none__",
  name: "",
  kind: "previous",
  assignment: {},
  roomOnly: {},
  locks: [],
  createdAt: "",
};

export function useTargetPlan(): { plan: SeatPlan; isPrevious: boolean } {
  const isPrevious = useUiStore((s) => s.editingPrevious);
  const plan = useProjectStore((s) =>
    isPrevious ? (previousPlan(s.project) ?? EMPTY_PLAN) : activePlan(s.project),
  );
  return { plan, isPrevious };
}
