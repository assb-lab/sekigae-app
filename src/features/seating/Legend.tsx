/** 色分けモードの切替と凡例（クリックでその属性だけ強調）。#121 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ID, Lab, Member, SeatPlan } from "@/domain/schema";
import { classifyChanges } from "@/features/members/lib/diff";
import { useTheme } from "@/app/theme";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/project";
import { previousPlan } from "@/store/selectors";
import { COLOR_MODES, legendItems, type ColorMode } from "./lib/colors";
import { useSeatingUi } from "./seatingStore";

export function ColorModeToggle({
  mode,
  onChange,
}: {
  mode: ColorMode;
  onChange: (m: ColorMode) => void;
}) {
  const { t } = useTranslation("seating");
  return (
    <ToggleGroup
      type="single"
      size="sm"
      variant="outline"
      value={mode}
      onValueChange={(v) => v && onChange(v as ColorMode)}
      aria-label={t("color.label")}
      data-testid="color-mode"
    >
      {COLOR_MODES.map((m) => (
        <ToggleGroupItem key={m} value={m} className="px-2 text-xs" data-testid={`color-${m}`}>
          {t(`color.${m}`)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export function Legend({
  mode,
  plan,
  members,
  labs,
}: {
  mode: ColorMode;
  plan: SeatPlan;
  members: Member[];
  labs: ReadonlyMap<ID, Lab>;
}) {
  const { t } = useTranslation("seating");
  const { t: tc } = useTranslation();
  const { resolvedTheme } = useTheme();
  const project = useProjectStore((s) => s.project);
  const focus = useSeatingUi((s) => s.legendFocus);
  const setFocus = useSeatingUi((s) => s.setLegendFocus);
  const items = useMemo(() => {
    const changes =
      mode === "diff" ? classifyChanges(project, plan, previousPlan(project)) : undefined;
    return legendItems(mode, members, { scheme: resolvedTheme, labs, changes });
  }, [mode, project, plan, members, labs, resolvedTheme]);

  const label = (kind: ColorMode, value: string) => {
    if (kind === "role") return tc(`roles.${value}` as never);
    if (kind === "gender") return tc(`genders.${value}` as never);
    if (kind === "lab")
      return value === "none" ? t("color.noLab") : (labs.get(value)?.shortName ?? value);
    return t(`change.${value}` as never);
  };

  return (
    <div className="flex flex-wrap items-center gap-1" data-testid="legend">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => setFocus(focus === it.key ? null : it.key)}
          className={cn(
            "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-opacity",
            focus && focus !== it.key && "opacity-40",
            focus === it.key && "border-primary",
          )}
          aria-pressed={focus === it.key}
        >
          <span className="size-2.5 rounded-full" style={{ background: it.color }} />
          {label(it.kind, it.value)}
          <span className="text-muted-foreground tabular-nums">{it.count}</span>
        </button>
      ))}
    </div>
  );
}
