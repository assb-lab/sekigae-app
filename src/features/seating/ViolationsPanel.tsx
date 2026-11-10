/** ルール違反パネル（右）: 必須 / できれば の違反をライブ表示し、ホバーで該当席を強調、クリックで移動。#120 */
import { CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Rule } from "@/domain/rules";
import type { ID } from "@/domain/schema";
import type { PlanEvaluation, Violation } from "@/engine";
import { summarizeRule } from "@/features/rules/summary";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/project";
import { useSeatingUi } from "./seatingStore";

export function ViolationsPanel({
  evaluation,
  onFocusSeats,
}: {
  evaluation: PlanEvaluation;
  onFocusSeats: (seatIds: ID[], memberIds: ID[]) => void;
}) {
  const { t, i18n } = useTranslation("seating");
  const project = useProjectStore((s) => s.project);
  const setHighlight = useSeatingUi((s) => s.setHighlight);
  const rulesById = useMemo(
    () => new Map<ID, Rule>(project.rules.map((r) => [r.id, r])),
    [project.rules],
  );

  const items = useMemo(
    () =>
      evaluation.violations
        .filter((v): v is Violation & { ruleId: ID } => !!v.ruleId && rulesById.has(v.ruleId))
        .sort((a, b) =>
          a.strength === b.strength ? b.score - a.score : a.strength === "hard" ? -1 : 1,
        )
        .map((v) => ({
          v,
          text: summarizeRule(rulesById.get(v.ruleId)!, project, { lng: i18n.language }),
        })),
    [evaluation.violations, rulesById, project, i18n.language],
  );
  const hard = items.filter((x) => x.v.strength === "hard").length;
  const soft = items.length - hard;

  return (
    <section
      className="flex min-h-0 flex-1 flex-col"
      data-tour="seating-violations"
      data-testid="violations-panel"
    >
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <h2 className="text-sm font-semibold">{t("violations.title")}</h2>
        <span className="flex-1" />
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            hard
              ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
              : "bg-muted text-muted-foreground",
          )}
          data-testid="hard-count"
        >
          {t("violations.hard", { count: hard })}
        </span>
        <span
          className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs"
          data-testid="soft-count"
        >
          {t("violations.soft", { count: soft })}
        </span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {items.length === 0 ? (
          <div
            className="text-success flex flex-col items-center gap-2 p-6 text-center text-sm"
            data-testid="no-violations"
          >
            <CheckCircle2 className="size-8" />
            {project.rules.length ? t("violations.none") : t("violations.noRules")}
          </div>
        ) : (
          <ul className="space-y-1.5 p-2">
            {items.map(({ v, text }) => (
              <li key={v.ruleId}>
                <button
                  type="button"
                  className={cn(
                    "hover:bg-accent w-full rounded-lg border px-2.5 py-2 text-left text-xs transition-colors",
                    v.strength === "hard" ? "border-destructive/40 bg-destructive/5" : "bg-card",
                  )}
                  onPointerEnter={() =>
                    setHighlight({ memberIds: new Set(v.memberIds), seatIds: new Set(v.seatIds) })
                  }
                  onPointerLeave={() => setHighlight(null)}
                  onFocus={() =>
                    setHighlight({ memberIds: new Set(v.memberIds), seatIds: new Set(v.seatIds) })
                  }
                  onBlur={() => setHighlight(null)}
                  onClick={() => onFocusSeats(v.seatIds, v.memberIds)}
                  data-testid="violation-item"
                >
                  <div className="flex items-start gap-1.5">
                    {v.strength === "hard" ? (
                      <ShieldAlert className="text-destructive mt-0.5 size-3.5 shrink-0" />
                    ) : (
                      <Sparkles className="text-warning mt-0.5 size-3.5 shrink-0" />
                    )}
                    <span className="flex-1 leading-snug">{text}</span>
                  </div>
                  <div className="text-muted-foreground mt-1 pl-5">
                    {t("violations.amount", { count: v.violation })}
                    {v.memberIds.length > 0 &&
                      ` · ${t("violations.people", { count: v.memberIds.length })}`}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
      <div className="text-muted-foreground border-t px-3 py-1.5 text-[11px]" data-testid="score">
        {t("violations.score", { score: Math.round(evaluation.score * 10) / 10 })}
      </div>
    </section>
  );
}
