import { useMemo } from "react";
import { evaluatePlan } from "@/engine";
import { useProjectStore } from "@/store/project";

/** 各配置案の必須違反数・スコア・配置人数 */
export function usePlanStats() {
  const project = useProjectStore((s) => s.project);
  return useMemo(() => {
    const out = new Map<string, { hard: number; score: number; assigned: number }>();
    for (const p of project.plans) {
      if (p.kind !== "current") continue;
      const ev = evaluatePlan(project, p.id);
      out.set(p.id, {
        hard: ev.violations.filter((v) => v.strength === "hard").length,
        score: ev.score,
        assigned: Object.keys(p.assignment).length,
      });
    }
    return out;
  }, [project]);
}
