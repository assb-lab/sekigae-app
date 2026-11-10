/** チップのホバーカード: メンバー詳細・昨年度→今年度・関係するルールの状態。#122 */
import { Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { ID } from "@/domain/schema";
import { evaluatePlan, type PlanEvaluation } from "@/engine";
import { LabBadge, RoleBadge } from "@/features/members/components/badges";
import { prevPlacementOf } from "@/features/members/lib/prevPlan";
import { ruleRelatesToMember } from "@/features/rules/analysis";
import { summarizeRule } from "@/features/rules/summary";
import { useProjectStore } from "@/store/project";
import { seatIndex, useLabIndex, useMemberIndex } from "@/store/selectors";
import { useSeatingUi } from "./seatingStore";

export function HoverCard({
  evaluation,
  assignment,
}: {
  evaluation: PlanEvaluation | null;
  assignment: Record<ID, ID>;
}) {
  const { t, i18n } = useTranslation("seating");
  const { t: tc } = useTranslation();
  const hover = useSeatingUi((s) => s.hover);
  const members = useMemberIndex();
  const labs = useLabIndex();
  const project = useProjectStore((s) => s.project);

  const info = useMemo(() => {
    if (!hover) return null;
    const m = members.get(hover.memberId);
    if (!m) return null;
    // 比較表示の右側など、作業中でない案のチップならその案の割当・評価を使う
    const other =
      hover.planId && hover.planId !== project.activePlanId
        ? project.plans.find((p) => p.id === hover.planId)
        : undefined;
    const asg = other ? other.assignment : assignment;
    const ev = other
      ? other.kind === "current"
        ? evaluatePlan(project, other.id)
        : null
      : evaluation;
    const idx = seatIndex(project.layout.rooms);
    const seatId = Object.entries(asg).find(([, mid]) => mid === m.id)?.[0];
    const here = seatId ? idx.get(seatId) : undefined;
    const prev = prevPlacementOf(project, m.id);
    const violated = new Set(
      (ev?.violations ?? [])
        .filter((v) => v.ruleId && v.memberIds.includes(m.id))
        .map((v) => v.ruleId!),
    );
    const rules = project.rules
      .filter((r) => r.enabled && ruleRelatesToMember(r, m))
      .slice(0, 6)
      .map((r) => ({
        id: r.id,
        text: summarizeRule(r, project, { lng: i18n.language }),
        ok: !violated.has(r.id),
      }));
    return { m, here, prev, rules };
  }, [hover, members, project, assignment, evaluation, i18n.language]);

  if (!hover || !info) return null;
  const { m, here, prev, rules } = info;
  const lab = m.labId ? labs.get(m.labId) : undefined;
  const left = Math.min(hover.x + 16, window.innerWidth - 300);
  const top = Math.min(hover.y + 16, window.innerHeight - 260);
  return (
    <div
      className="bg-popover text-popover-foreground pointer-events-none fixed z-40 w-72 rounded-xl border p-3 text-sm shadow-xl"
      style={{ left, top }}
      data-testid="member-hover-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{m.name}</div>
          {m.kana && <div className="text-muted-foreground text-xs">{m.kana}</div>}
        </div>
        <RoleBadge role={m.role} long />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        {lab && <LabBadge lab={lab} full />}
        <span className="text-muted-foreground">{tc(`genders.${m.gender}`)}</span>
        {m.tags.map((tag) => (
          <span key={tag} className="bg-muted rounded px-1.5">
            {tag}
          </span>
        ))}
      </div>
      <div className="text-muted-foreground mt-2 text-xs">
        {t("hover.prevToNow", {
          prev:
            prev.kind === "seat"
              ? `${prev.room.name} ${prev.seat.label}`
              : prev.kind === "room"
                ? prev.room.name
                : "—",
          now: here ? `${here.room.name} ${here.seat.label}` : t("hover.unassigned"),
        })}
      </div>
      {m.note && <p className="mt-1 text-xs">{m.note}</p>}
      {rules.length > 0 && (
        <ul className="mt-2 space-y-1 border-t pt-2 text-xs">
          {rules.map((r) => (
            <li key={r.id} className="flex items-start gap-1.5">
              {r.ok ? (
                <CheckCircle2 className="text-success mt-0.5 size-3.5 shrink-0" />
              ) : (
                <XCircle className="text-destructive mt-0.5 size-3.5 shrink-0" />
              )}
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      )}
      <Link to="/members" className="text-primary pointer-events-auto mt-2 block text-xs">
        {t("hover.editInMembers")}
      </Link>
    </div>
  );
}
