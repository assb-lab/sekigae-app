/** ドラッグ中にポインタへ追従する表示と、ドロップ先で増減するルール違反のプレビュー。#115 */
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { createPlanEvaluator } from "@/engine";
import { useProjectStore } from "@/store/project";
import { useMemberIndex } from "@/store/selectors";
import { useUiStore } from "@/store/ui";
import { cn } from "@/lib/utils";
import { currentAssignment, currentLocks } from "./actions";
import { useDragStore } from "./drag";
import { applyDrop, canDrop, ruleDelta } from "./lib/placement";

export function DragGhost() {
  const { t } = useTranslation("seating");
  const drag = useDragStore((s) => s.drag);
  const members = useMemberIndex();
  const project = useProjectStore((s) => s.project);
  const isPrevious = useUiStore((s) => s.editingPrevious);
  const evaluator = useMemo(
    () => (isPrevious ? null : createPlanEvaluator(project, project.activePlanId)),
    // 割当以外の入力が変わったときだけ作り直す
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      isPrevious,
      project.rules,
      project.members,
      project.layout,
      project.labs,
      project.settings,
      project.previousPlanId,
    ],
  );

  const over = drag?.active ? drag.over : null;
  const preview = useMemo(() => {
    if (!drag || !over) return null;
    const a = currentAssignment();
    if (!canDrop(a, currentLocks(), drag.memberId, over)) return { blocked: true as const };
    if (!evaluator) return null;
    const out = applyDrop(a, drag.memberId, over);
    if (out.kind === "none") return null;
    const before = evaluator.evaluate(a);
    const after = evaluator.evaluate(out.assignment);
    return {
      blocked: false as const,
      delta: ruleDelta(before.violations, after.violations, {
        before: before.score,
        after: after.score,
      }),
    };
  }, [drag?.memberId, over?.kind, over && over.kind === "seat" ? over.seatId : null, evaluator]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!drag?.active) return null;
  const m = members.get(drag.memberId);
  if (!m) return null;
  const d = preview && !preview.blocked ? preview.delta : null;
  return (
    <div
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[130%]"
      style={{ left: drag.x, top: drag.y }}
      data-testid="drag-ghost"
    >
      <div
        className={cn(
          "bg-popover flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium shadow-lg",
          preview?.blocked && "border-destructive text-destructive",
          d && d.hardDelta > 0 && "border-destructive",
          d && d.hardDelta < 0 && "border-success",
        )}
      >
        {m.name}
        {preview?.blocked && <span className="text-xs">{t("drag.locked")}</span>}
        {d && d.created.length > 0 && (
          <span className="text-destructive flex items-center text-xs" data-testid="drag-created">
            <ArrowUpRight className="size-3" />
            {t("drag.created", { count: d.created.length })}
          </span>
        )}
        {d && d.resolved.length > 0 && (
          <span className="text-success flex items-center text-xs" data-testid="drag-resolved">
            <ArrowDownRight className="size-3" />
            {t("drag.resolved", { count: d.resolved.length })}
          </span>
        )}
      </div>
    </div>
  );
}
