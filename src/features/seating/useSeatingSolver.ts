/**
 * プリセット / シャッフル の実行と結果の適用（1 回の Undo）・トースト・診断ダイアログ。#118 #124
 */
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { ID } from "@/domain/schema";
import type { Diagnostic, PresetId, SolveResult, SolveScope } from "@/engine";
import { useSolver } from "@/features/engine";
import { history, useProjectStore } from "@/store/project";
import { useSeatingUi } from "./seatingStore";

export interface ShuffleRequest {
  presets: PresetId[];
  scope?: SolveScope;
  seed?: number;
  mode?: "shuffle" | "improve";
  /** 実行前に新しい案を作る */
  newPlanName?: string;
}

export function useSeatingSolver() {
  const { t } = useTranslation("seating");
  const solver = useSolver();
  const [trail, setTrail] = useState<number[]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[] | null>(null);
  const [celebrate, setCelebrate] = useState(0);

  // 進捗（最良スコア）の推移をスパークライン用に貯める（レンダー中に前回値と比較して更新）
  const [lastProgress, setLastProgress] = useState(solver.progress);
  if (solver.progress !== lastProgress) {
    setLastProgress(solver.progress);
    if (solver.progress) setTrail((tr) => [...tr.slice(-59), solver.progress!.bestScore]);
  }

  const run = useCallback(
    async (req: ShuffleRequest): Promise<SolveResult | null> => {
      const s = useProjectStore.getState();
      if (req.newPlanName) s.duplicatePlan(s.project.activePlanId, req.newPlanName);
      const planId = useProjectStore.getState().project.activePlanId;
      setTrail([]);
      useSeatingUi.getState().setSolving(true);
      let result: SolveResult | null;
      try {
        result = await solver.run({
          planId,
          apply: false,
          presets: req.presets,
          scope: req.scope,
          seed: req.seed,
          mode: req.mode,
        });
      } finally {
        useSeatingUi.getState().setSolving(false);
      }
      if (!result) return null;
      const diff = solver.diff(result, planId);
      solver.apply(result, planId);
      const errors = result.diagnostics.filter((d) => d.severity === "error");
      if (errors.length) setDiagnostics(errors);
      const moved = (diff?.moved.length ?? 0) + (diff?.added.length ?? 0);
      const msg =
        result.hardViolations === 0
          ? t("shuffle.doneOk", { count: moved, moved })
          : t("shuffle.doneWithViolations", {
              count: result.violations.filter((v) => v.strength === "hard").length,
              moved,
            });
      toast[result.hardViolations === 0 ? "success" : "warning"](msg, {
        action: { label: t("shuffle.undo"), onClick: () => history.undo() },
      });
      if (result.hardViolations === 0 && moved > 0) setCelebrate((c) => c + 1);
      return result;
    },
    [solver, t],
  );

  return {
    run,
    cancel: () => solver.cancel(),
    status: solver.status,
    progress: solver.progress,
    trail,
    diagnostics,
    clearDiagnostics: () => setDiagnostics(null),
    celebrate,
  };
}

export type SeatingSolver = ReturnType<typeof useSeatingSolver>;
export type { ID };
