import type { ID, Project, SeatPlan } from "@/domain/schema";
import { evaluatePlan } from "@/engine";
import { classifyChanges } from "@/features/members/lib/diff";
import { summarizeRule } from "@/features/rules/summary";
import { previousPlan, seatOfMember } from "@/store/selectors";

/** 2 案の比較データ（純関数） */
export function compareData(project: Project, aId: ID, bId: ID | null, lng: string) {
  const pa = project.plans.find((p) => p.id === aId);
  const pb = project.plans.find((p) => p.id === bId);
  if (!pa || !pb) return null;
  const ea = evaluatePlan(project, pa.id);
  const eb = evaluatePlan(project, pb.id);
  const sa = seatOfMember(pa.assignment);
  const sb = seatOfMember(pb.assignment);
  const diff = new Set<ID>(
    project.members.filter((m) => sa.get(m.id) !== sb.get(m.id)).map((m) => m.id),
  );
  const prev = previousPlan(project);
  const moved = (p: SeatPlan) =>
    prev
      ? [...classifyChanges(project, p, prev).values()].filter((k) => k === "differentRoom").length
      : null;
  const violated = (ev: typeof ea) =>
    new Set(ev.violations.filter((v) => v.ruleId).map((v) => v.ruleId!));
  const va = violated(ea);
  const vb = violated(eb);
  return {
    diff,
    rows: [
      { key: "score", a: ea.score.toFixed(1), b: eb.score.toFixed(1) },
      {
        key: "hard",
        a: ea.violations.filter((v) => v.strength === "hard").length,
        b: eb.violations.filter((v) => v.strength === "hard").length,
      },
      {
        key: "soft",
        a: ea.violations.filter((v) => v.strength === "soft").length,
        b: eb.violations.filter((v) => v.strength === "soft").length,
      },
      { key: "moved", a: moved(pa) ?? "—", b: moved(pb) ?? "—" },
      { key: "differ", a: diff.size, b: diff.size },
    ],
    rules: project.rules
      .filter((r) => r.enabled)
      .map((r) => ({
        id: r.id,
        text: summarizeRule(r, project, { lng: lng }),
        a: !va.has(r.id),
        b: !vb.has(r.id),
      })),
  };
}
