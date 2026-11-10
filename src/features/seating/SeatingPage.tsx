/**
 * ④ 席配置画面: プリセット・シャッフル・ドラッグでの微調整・違反のライブ表示・配置案の比較・昨年度モード。
 */
import { Link } from "@tanstack/react-router";
import { CalendarClock, Flame, LayoutGrid, Users } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useViewport } from "@/components/canvas";
import { HelpTip } from "@/components/HelpTip";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import type { ID } from "@/domain/schema";
import { useViolations } from "@/features/engine";
import { useIsMobile } from "@/features/members/lib/useIsMobile";
import { useProjectStore } from "@/store/project";
import { useLabIndex, useRooms } from "@/store/selectors";
import { Celebration } from "./Celebration";
import { CompareView } from "./CompareView";
import { CompositionPanel } from "./CompositionPanel";
import { DiagnosticsDialog } from "./DiagnosticsDialog";
import { DragGhost } from "./DragGhost";
import { HoverCard } from "./HoverCard";
import { ColorModeToggle, Legend } from "./Legend";
import { computeCompositions } from "./lib/composition";
import { seatPosIndex } from "./lib/hit";
import { MobileSeating } from "./MobileSeating";
import { PlanBar } from "./PlanBar";
import { PresetGallery } from "./PresetGallery";
import { SeatingCanvas } from "./SeatingCanvas";
import { useColorMode, useSeatingHeatmap, useSeatingUi } from "./seatingStore";
import { ShuffleControls } from "./ShuffleControls";
import { UnassignedTray } from "./UnassignedTray";
import { useSeatingSolver } from "./useSeatingSolver";
import { useTargetPlan } from "./useTargetPlan";
import { ViolationsPanel } from "./ViolationsPanel";

const COMPOSITION_RULES = new Set(["room.attrCap", "room.diversity", "group.labBalance"]);

export default function SeatingPage() {
  const { t } = useTranslation("seating");
  const project = useProjectStore((s) => s.project);
  const rooms = useRooms();
  const labs = useLabIndex();
  const { plan, isPrevious } = useTargetPlan();
  const [colorMode, setColorMode] = useColorMode();
  const [heatmap, setHeatmap] = useSeatingHeatmap();
  const compare = useSeatingUi((s) => s.compare);
  const isMobile = useIsMobile();
  const viewport = useViewport();
  const solver = useSeatingSolver();
  const evaluation = useViolations(project.activePlanId);

  const visibleRooms = useMemo(() => rooms.filter((r) => !r.hidden), [rooms]);
  const { violationMembers, violationSeats, warnRoomIds } = useMemo(() => {
    const vm = new Set<ID>();
    const vs = new Set<ID>();
    const warn = new Set<ID>();
    if (isPrevious) return { violationMembers: vm, violationSeats: vs, warnRoomIds: warn };
    const types = new Map(project.rules.map((r) => [r.id, r.block.type]));
    const pos = seatPosIndex(rooms);
    for (const v of evaluation.violations) {
      if (v.strength === "hard") {
        v.memberIds.forEach((m) => vm.add(m));
        v.seatIds.forEach((s) => vs.add(s));
      }
      if (v.ruleId && COMPOSITION_RULES.has(types.get(v.ruleId) ?? ""))
        for (const s of v.seatIds) {
          const r = pos.get(s)?.room.id;
          if (r) warn.add(r);
        }
    }
    return { violationMembers: vm, violationSeats: vs, warnRoomIds: warn };
  }, [evaluation, isPrevious, project.rules, rooms]);

  const comps = useMemo(
    () => computeCompositions(visibleRooms, project.members, project.labs, plan.assignment),
    [visibleRooms, project.members, project.labs, plan.assignment],
  );

  if (!rooms.length || !project.members.length) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center"
        data-testid="seating-empty"
      >
        <LayoutGrid className="text-muted-foreground size-10" />
        <h1 className="text-lg font-semibold">{t("empty.title")}</h1>
        <p className="text-muted-foreground max-w-md text-sm">{t("empty.body")}</p>
        <div className="flex gap-2">
          {!rooms.length && (
            <Button asChild>
              <Link to="/rooms">
                <LayoutGrid />
                {t("empty.toRooms")}
              </Link>
            </Button>
          )}
          {!project.members.length && (
            <Button asChild variant={rooms.length ? "default" : "outline"}>
              <Link to="/members">
                <Users />
                {t("empty.toMembers")}
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (isMobile) return <MobileSeating plan={plan} colorMode={colorMode} />;

  const focusSeats = (seatIds: ID[]) => {
    const pos = seatPosIndex(rooms);
    const pts = seatIds.map((s) => pos.get(s)).filter((p) => p !== undefined);
    if (!pts.length) return;
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    viewport.fit(
      { x: x - 1.5, y: y - 1.5, width: Math.max(...xs) - x + 4, height: Math.max(...ys) - y + 4 },
      { animate: true },
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b px-3 pt-2 pb-1 md:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="mr-2 text-lg font-semibold tracking-tight">{t("title")}</h1>
          <PlanBar />
          {!isPrevious && !compare.on && <ShuffleControls solver={solver} plan={plan} />}
          <span className="flex-1" />
          <ColorModeToggle mode={colorMode} onChange={setColorMode} />
          <Toggle
            size="sm"
            pressed={heatmap}
            onPressedChange={setHeatmap}
            aria-label={t("heatmap")}
            data-testid="heatmap-toggle"
          >
            <Flame />
          </Toggle>
          <HelpTip term="depth" />
        </div>
        {!isPrevious && !compare.on && <PresetGallery solver={solver} />}
        {isPrevious && (
          <div
            className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-700 dark:text-amber-300"
            data-testid="previous-banner"
          >
            <CalendarClock className="size-4" />
            {t("year.banner")}
          </div>
        )}
      </div>

      {compare.on && !isPrevious ? (
        <CompareView colorMode={colorMode} />
      ) : (
        <div className="flex min-h-0 flex-1">
          <UnassignedTray
            plan={plan}
            onAutoPlace={
              isPrevious
                ? undefined
                : () =>
                    void solver.run({
                      presets: useSeatingUi.getState().presets,
                      scope: { kind: "unassignedOnly" },
                    })
            }
            autoPlaceDisabled={solver.status === "running"}
          />
          <div
            className={`relative min-w-0 flex-1 ${isPrevious ? "ring-2 ring-amber-500/50 ring-inset" : ""}`}
            data-tour="seating-canvas"
          >
            <SeatingCanvas
              plan={plan}
              colorMode={colorMode}
              viewport={viewport}
              violationMembers={violationMembers}
              violationSeats={violationSeats}
              warnRoomIds={warnRoomIds}
              showHeatmap={heatmap}
            />
            <div className="pointer-events-none absolute top-2 left-2 right-2 flex">
              <div className="bg-background/85 pointer-events-auto rounded-lg border px-2 py-1 shadow-sm backdrop-blur">
                <Legend mode={colorMode} plan={plan} members={project.members} labs={labs} />
              </div>
            </div>
            <Celebration trigger={solver.celebrate} />
          </div>
          <aside className="bg-sidebar hidden w-72 flex-col border-l lg:flex">
            {!isPrevious && <ViolationsPanel evaluation={evaluation} onFocusSeats={focusSeats} />}
            <CompositionPanel rooms={visibleRooms} comps={comps} labs={labs} />
          </aside>
        </div>
      )}
      <DragGhost />
      <HoverCard evaluation={isPrevious ? null : evaluation} assignment={plan.assignment} />
      <DiagnosticsDialog diagnostics={solver.diagnostics} onClose={solver.clearDiagnostics} />
    </div>
  );
}
