/**
 * プリセットギャラリー: カード（模式図付き）を複数選択して組み合わせ、クリックで即配置。#123 #124
 */
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Blend,
  Check,
  Dices,
  History,
  Layers,
  MoveRight,
  Save,
  Shuffle,
  SortAsc,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PRESET_IDS, PRESET_NEEDS_PREVIOUS, presetToRuleBlocks, type PresetId } from "@/engine";
import { cn } from "@/lib/utils";
import { batch, useProjectStore } from "@/store/project";
import { activePlan } from "@/store/selectors";
import { useSeatingUi } from "./seatingStore";
import type { SeatingSolver } from "./useSeatingSolver";

const ICONS: Record<PresetId, LucideIcon> = {
  mixLab: Blend,
  seniorBack: ArrowUpWideNarrow,
  seniorFront: ArrowDownWideNarrow,
  clusterLab: Layers,
  clusterRole: Users,
  mixRole: Shuffle,
  keepPrevious: History,
  movePrevious: MoveRight,
  nameOrder: SortAsc,
  random: Dices,
};

/** 4×3 の小さな模式図（色の並びでプリセットの傾向を示す） */
const SCHEMES: Record<PresetId, string[]> = {
  mixLab: ["a", "b", "c", "d", "b", "c", "d", "a", "c", "d", "a", "b"],
  seniorBack: ["s", "s", "s", "s", "m", "m", "m", "m", "j", "j", "j", "j"],
  seniorFront: ["j", "j", "j", "j", "m", "m", "m", "m", "s", "s", "s", "s"],
  clusterLab: ["a", "a", "b", "b", "a", "a", "b", "b", "c", "c", "d", "d"],
  clusterRole: ["s", "s", "m", "m", "s", "s", "m", "m", "j", "j", "j", "j"],
  mixRole: ["s", "m", "j", "s", "j", "s", "m", "j", "m", "j", "s", "m"],
  keepPrevious: ["p", "p", "p", "p", "p", "p", "p", "p", "p", "p", "n", "n"],
  movePrevious: ["n", "n", "n", "n", "n", "n", "n", "n", "n", "n", "n", "n"],
  nameOrder: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
  random: ["b", "d", "a", "c", "c", "a", "d", "b", "a", "b", "c", "d"],
};
const SCHEME_COLOR: Record<string, string> = {
  a: "#e11d48",
  b: "#2563eb",
  c: "#16a34a",
  d: "#d97706",
  s: "#5b21b6",
  m: "#22a04b",
  j: "#22d3ee",
  p: "#64748b",
  n: "#f59e0b",
};

function Scheme({ id }: { id: PresetId }) {
  return (
    <svg viewBox="0 0 4 3" className="h-9 w-12 shrink-0 rounded" aria-hidden>
      {SCHEMES[id].map((c, i) => {
        const x = i % 4;
        const y = Math.floor(i / 4);
        const color = SCHEME_COLOR[c] ?? `hsl(${(Number(c) * 26) % 360} 70% 55%)`;
        return (
          <rect
            key={i}
            x={x + 0.12}
            y={y + 0.12}
            width={0.76}
            height={0.76}
            rx={0.2}
            fill={color}
          />
        );
      })}
    </svg>
  );
}

export function PresetGallery({ solver, disabled }: { solver: SeatingSolver; disabled?: boolean }) {
  const { t } = useTranslation("seating");
  const selected = useSeatingUi((s) => s.presets);
  const toggle = useSeatingUi((s) => s.togglePreset);
  const hasPrevious = useProjectStore((s) => !!s.project.previousPlanId);
  const [askOverwrite, setAskOverwrite] = useState(false);

  const apply = async (newPlan: boolean) => {
    setAskOverwrite(false);
    const s = useProjectStore.getState();
    await solver.run({
      presets: selected.length ? selected : ["random"],
      newPlanName: newPlan
        ? t("plans.newName", { n: s.project.plans.filter((p) => p.kind === "current").length + 1 })
        : undefined,
    });
  };

  const onApply = () => {
    const plan = activePlan(useProjectStore.getState().project);
    if (Object.keys(plan.assignment).length > plan.locks.length) setAskOverwrite(true);
    else void apply(false);
  };

  const saveAsRules = () => {
    const s = useProjectStore.getState();
    let n = 0;
    batch(() => {
      for (const id of selected)
        for (const block of presetToRuleBlocks(id)) {
          s.addRule(block, { origin: "preset", strength: "soft", weight: 3 });
          n++;
        }
    });
    if (n) toast.success(t("presets.savedAsRules", { count: n }));
    else toast.info(t("presets.nothingToSave"));
  };

  return (
    <div
      className="flex min-w-0 items-center gap-2"
      data-tour="seating-presets"
      data-testid="preset-gallery"
    >
      <ScrollArea className="min-w-0 flex-1">
        <div className="flex gap-1.5 pb-2">
          {PRESET_IDS.map((id, i) => {
            const Icon = ICONS[id];
            const on = selected.includes(id);
            const needsPrev = PRESET_NEEDS_PREVIOUS.has(id) && !hasPrevious;
            return (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    disabled={disabled || needsPrev}
                    aria-pressed={on}
                    data-testid={`preset-${id}`}
                    className={cn(
                      "relative flex w-36 shrink-0 items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-all disabled:opacity-40",
                      on ? "border-primary bg-primary/10 shadow-sm" : "hover:bg-accent bg-card",
                    )}
                  >
                    <Scheme id={id} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 text-xs font-medium">
                        <Icon className="size-3 shrink-0" />
                        <span className="truncate">{t(`presets.${id}.name`)}</span>
                      </span>
                      {i === 0 && (
                        <span className="text-primary text-[10px]">{t("presets.recommended")}</span>
                      )}
                    </span>
                    {on && <Check className="text-primary absolute top-1 right-1 size-3" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-60">
                  {needsPrev ? t("presets.needsPrevious") : t(`presets.${id}.description`)}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <div className="flex shrink-0 flex-col gap-1">
        <Button
          size="sm"
          onClick={onApply}
          disabled={disabled || solver.status === "running"}
          data-testid="apply-presets"
        >
          {t("presets.apply")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[11px]"
          onClick={saveAsRules}
          disabled={!selected.length}
        >
          <Save className="size-3" />
          {t("presets.saveAsRules")}
        </Button>
      </div>
      <AlertDialog open={askOverwrite} onOpenChange={setAskOverwrite}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("presets.overwriteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("presets.overwriteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("presets.cancel")}</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => void apply(true)}
              data-testid="preset-new-plan"
            >
              {t("presets.newPlan")}
            </Button>
            <AlertDialogAction onClick={() => void apply(false)} data-testid="preset-overwrite">
              {t("presets.overwrite")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
