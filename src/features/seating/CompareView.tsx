/** 2 つの配置案の比較: 同期したパン/ズームで並べ、席が違う人を強調し、指標を表で比べる。#126 */
import { CheckCircle2, Star, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useViewport } from "@/components/canvas";
import { Button } from "@/components/ui/button";
import type { ID } from "@/domain/schema";
import { compareData } from "./lib/compare";
import { useProjectStore } from "@/store/project";
import type { ColorMode } from "./lib/colors";
import { SeatingCanvas } from "./SeatingCanvas";
import { useSeatingUi } from "./seatingStore";

export function CompareView({ colorMode }: { colorMode: ColorMode }) {
  const { t, i18n } = useTranslation("seating");
  const project = useProjectStore((s) => s.project);
  const compare = useSeatingUi((s) => s.compare);
  const setCompare = useSeatingUi((s) => s.setCompare);
  const viewport = useViewport();
  const plans = project.plans.filter((p) => p.kind === "current");
  const a = plans.find((p) => p.id === project.activePlanId) ?? plans[0]!;
  const b =
    plans.find((p) => p.id === compare.otherPlanId && p.id !== a.id) ??
    plans.find((p) => p.id !== a.id);

  const aId = a.id;
  const bId = b ? b.id : null;
  // 比較画面は案やルールが変わったときだけ再描画される
  const data = compareData(project, aId, bId, i18n.language);

  if (!b || !data) return null;
  const adopt = (id: ID) => {
    const s = useProjectStore.getState();
    s.setActivePlan(id);
    s.setFinalPlan(id);
    setCompare({ on: false });
  };

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="compare-view">
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-px border-b bg-border">
        {[a, b].map((p, i) => (
          <div key={p.id} className="bg-background relative flex min-h-0 flex-col">
            <div className="flex items-center gap-2 border-b px-3 py-1.5 text-sm">
              {i === 0 ? (
                <span className="font-medium">{p.name}</span>
              ) : (
                <select
                  className="bg-background rounded border px-1 py-0.5 text-sm"
                  value={p.id}
                  onChange={(e) => setCompare({ otherPlanId: e.target.value })}
                  data-testid="compare-select"
                >
                  {plans
                    .filter((x) => x.id !== a.id)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                </select>
              )}
              {p.final && <Star className="size-3.5 fill-amber-400 text-amber-500" />}
              <span className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                onClick={() => adopt(p.id)}
                data-testid={`adopt-${i}`}
              >
                {t("compare.adopt")}
              </Button>
            </div>
            <div className="min-h-0 flex-1">
              <SeatingCanvas
                plan={p}
                colorMode={colorMode}
                readOnly
                viewport={viewport}
                diffMembers={data.diff}
                showMinimap={false}
                data-testid={`compare-canvas-${i}`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="max-h-[38%] overflow-auto">
        <table className="w-full text-xs" data-testid="compare-table">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th className="px-3 py-1.5 text-left font-medium">{t("compare.metric")}</th>
              <th className="px-3 py-1.5 text-left font-medium">{a.name}</th>
              <th className="px-3 py-1.5 text-left font-medium">{b.name}</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.key} className="border-t">
                <td className="px-3 py-1">{t(`compare.rows.${r.key}` as never)}</td>
                <td className="px-3 py-1 tabular-nums">{r.a}</td>
                <td className="px-3 py-1 tabular-nums">{r.b}</td>
              </tr>
            ))}
            {data.rules.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="text-muted-foreground px-3 py-1">{r.text}</td>
                {[r.a, r.b].map((ok, i) => (
                  <td key={i} className="px-3 py-1">
                    {ok ? (
                      <CheckCircle2 className="text-success size-3.5" />
                    ) : (
                      <XCircle className="text-destructive size-3.5" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
