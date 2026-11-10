/** 配置案の切替・作成・複製・名前変更・削除・確定、比較モード、昨年度モードの切替。#125 #80 */
import { CalendarClock, Columns2, Copy, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/confirm";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/project";
import { useUiStore } from "@/store/ui";
import { usePlanStats } from "./planStats";
import { useSeatingUi } from "./seatingStore";

export function PlanBar() {
  const { t } = useTranslation("seating");
  const project = useProjectStore((s) => s.project);
  const store = useProjectStore.getState;
  const isPrevious = useUiStore((s) => s.editingPrevious);
  const setEditingPrevious = useUiStore((s) => s.setEditingPrevious);
  const compare = useSeatingUi((s) => s.compare);
  const setCompare = useSeatingUi((s) => s.setCompare);
  const stats = usePlanStats();
  const plans = project.plans.filter((p) => p.kind === "current");
  const active = plans.find((p) => p.id === project.activePlanId) ?? plans[0]!;
  const [renaming, setRenaming] = useState<string | null>(null);
  const [name, setName] = useState("");

  const label = (p: (typeof plans)[number]) => {
    const st = stats.get(p.id);
    return (
      <span className="flex items-center gap-1.5">
        {p.final && <Star className="size-3 fill-amber-400 text-amber-500" />}
        <span className="max-w-32 truncate">{p.name}</span>
        {st && (
          <Badge variant={st.hard ? "destructive" : "secondary"} className="h-4 px-1 text-[10px]">
            {st.hard ? t("plans.hard", { count: st.hard }) : "✓"}
          </Badge>
        )}
      </span>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5" data-tour="seating-plans">
      <ToggleGroup
        type="single"
        size="sm"
        variant="outline"
        value={isPrevious ? "prev" : "now"}
        onValueChange={(v) => v && setEditingPrevious(v === "prev")}
        data-testid="year-toggle"
      >
        <ToggleGroupItem value="now" className="px-2 text-xs" data-testid="year-now">
          {t("year.now")}
        </ToggleGroupItem>
        <ToggleGroupItem value="prev" className="px-2 text-xs" data-testid="year-prev">
          <CalendarClock className="size-3.5" />
          {t("year.prev")}
        </ToggleGroupItem>
      </ToggleGroup>
      {!isPrevious && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" data-testid="plan-menu">
                {label(active)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>{t("plans.title")}</DropdownMenuLabel>
              {plans.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onSelect={() => store().setActivePlan(p.id)}
                  className={cn(p.id === active.id && "bg-accent")}
                  data-testid="plan-item"
                >
                  {label(p)}
                  <span className="text-muted-foreground ml-auto text-[10px] tabular-nums">
                    {t("plans.assigned", { count: stats.get(p.id)?.assigned ?? 0 })}
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => store().createPlan(t("plans.newName", { n: plans.length + 1 }))}
                data-testid="plan-new"
              >
                <Plus />
                {t("plans.new")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  store().duplicatePlan(active.id, t("plans.copyName", { name: active.name }))
                }
                data-testid="plan-duplicate"
              >
                <Copy />
                {t("plans.duplicate")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setName(active.name);
                  setRenaming(active.id);
                }}
              >
                <Pencil />
                {t("plans.rename")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => store().setFinalPlan(active.id)}
                data-testid="plan-final"
              >
                <Star />
                {t("plans.markFinal")}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={plans.length <= 1}
                onSelect={async () => {
                  if (
                    await confirm({
                      title: t("plans.deleteConfirm", { name: active.name }),
                      destructive: true,
                    })
                  )
                    store().removePlan(active.id);
                }}
              >
                <Trash2 />
                {t("plans.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            variant={compare.on ? "default" : "ghost"}
            disabled={plans.length < 2}
            onClick={() =>
              setCompare({
                on: !compare.on,
                otherPlanId:
                  compare.otherPlanId ?? plans.find((p) => p.id !== active.id)?.id ?? null,
              })
            }
            data-testid="compare-toggle"
          >
            <Columns2 />
            {t("compare.toggle")}
          </Button>
        </>
      )}
      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("plans.rename")}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (renaming && name.trim()) store().renamePlan(renaming, name.trim());
              setRenaming(null);
            }}
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <DialogFooter className="mt-4">
              <Button type="submit">{t("plans.save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
