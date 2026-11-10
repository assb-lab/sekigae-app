/**
 * 席配置キャンバス: 部屋（共有キャンバス）+ チップ + 研究室構成バー + ヒートマップ。
 * DnD・クリック配置・キーボード操作・右クリックメニューを扱う。#113 #115 #116 #117
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DepthHeatmapOverlay,
  FloorCanvas,
  Minimap,
  RoomShape,
  roomsBounds,
  useViewport,
  ZoomControls,
  type SeatVisualState,
  type ViewportController,
} from "@/components/canvas";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { ID, Member, SeatPlan } from "@/domain/schema";
import { classifyChanges } from "@/features/members/lib/diff";
import { ruleActionsForMember, ruleActionsForSeat } from "@/features/rules/contextActions";
import { RuleContextMenuItems } from "@/features/rules/RuleContextMenuItems";
import { useTheme } from "@/app/theme";
import { isEditableTarget } from "@/lib/keyboard";
import { useProjectStore } from "@/store/project";
import { previousPlan, useLabIndex, useMemberIndex, useRooms } from "@/store/selectors";
import { dropMember, setLocked, toggleLock } from "./actions";
import { ChipsLayer, type ChipView } from "./ChipsLayer";
import { CompositionOverlay } from "./CompositionOverlay";
import { beginDrag, useDragStore } from "./drag";
import { chipFill, legendKeyOf, type ColorMode } from "./lib/colors";
import { computeCompositions } from "./lib/composition";
import { nearestSeat, nextSeatInDirection, type Dir } from "./lib/hit";
import { useSeatingUi } from "./seatingStore";

export interface SeatingCanvasProps {
  plan: SeatPlan;
  colorMode: ColorMode;
  /** ルール違反（hard）の人・席 */
  violationMembers?: ReadonlySet<ID>;
  violationSeats?: ReadonlySet<ID>;
  /** 研究室構成バーを警告色にする部屋 */
  warnRoomIds?: ReadonlySet<ID>;
  showHeatmap?: boolean;
  /** 編集不可（比較・スマホ） */
  readOnly?: boolean;
  /** 違う席に座っている人（比較モードで強調） */
  diffMembers?: ReadonlySet<ID>;
  viewport?: ViewportController;
  showMinimap?: boolean;
  /** 編集を受け付ける（昨年度案が未作成でも true） */
  editable?: boolean;
  /** 読み取り専用時に席をクリック（タップ）したとき */
  onSeatClick?: (seatId: ID) => void;
  "data-testid"?: string;
}

const EMPTY = new Set<ID>();

export function SeatingCanvas({
  plan,
  colorMode,
  violationMembers = EMPTY,
  violationSeats = EMPTY,
  warnRoomIds = EMPTY,
  showHeatmap,
  readOnly,
  diffMembers,
  viewport: externalViewport,
  showMinimap = true,
  editable = true,
  onSeatClick,
  ...rest
}: SeatingCanvasProps) {
  const { t } = useTranslation("seating");
  const ownViewport = useViewport();
  const viewport = externalViewport ?? ownViewport;
  const rooms = useRooms();
  const visibleRooms = useMemo(() => rooms.filter((r) => !r.hidden), [rooms]);
  const members = useMemberIndex();
  const labs = useLabIndex();
  const project = useProjectStore((s) => s.project);
  const { resolvedTheme } = useTheme();
  const interactive = !readOnly && editable;

  const picked = useSeatingUi((s) => s.pickedMemberId);
  const focusSeat = useSeatingUi((s) => s.focusSeatId);
  const legendFocus = useSeatingUi((s) => s.legendFocus);
  const highlight = useSeatingUi((s) => s.highlight);
  const drag = useDragStore((s) => s.drag);
  const [initialFit] = useState(() => roomsBounds(visibleRooms));
  const [announce, setAnnounce] = useState("");
  const [menuSeat, setMenuSeat] = useState<ID | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 部屋の構成が変わったら（例: データ読み込み後）全体が見えるようにフィット
  const roomsKey = visibleRooms.map((r) => r.id).join(",");
  const lastRoomsKey = useRef(roomsKey);
  useEffect(() => {
    if (lastRoomsKey.current === roomsKey) return;
    lastRoomsKey.current = roomsKey;
    viewport.fit(roomsBounds(visibleRooms), { padding: 72 });
  }, [roomsKey, visibleRooms, viewport]);

  useEffect(() => {
    if (!interactive) return;
    useDragStore.getState().setViewport(viewport);
    return () => useDragStore.getState().setViewport(null);
  }, [viewport, interactive]);

  const locks = useMemo(() => new Set(plan.locks), [plan.locks]);
  const changes = useMemo(
    () =>
      colorMode === "diff" ? classifyChanges(project, plan, previousPlan(project)) : undefined,
    [colorMode, project, plan],
  );
  const colorCtx = useMemo(
    () => ({ scheme: resolvedTheme, labs, changes }),
    [resolvedTheme, labs, changes],
  );
  const comps = useMemo(
    () => computeCompositions(visibleRooms, project.members, project.labs, plan.assignment),
    [visibleRooms, project.members, project.labs, plan.assignment],
  );

  const overSeat = drag?.active && drag.over?.kind === "seat" ? drag.over.seatId : null;

  const view = (m: Member, seatId: ID): ChipView => {
    const dimByLegend = legendFocus !== null && legendKeyOf(colorMode, m, colorCtx) !== legendFocus;
    const dimByHighlight =
      highlight !== null && !highlight.memberIds.has(m.id) && !highlight.seatIds.has(seatId);
    return {
      fill: chipFill(colorMode, m, colorCtx),
      locked: locks.has(seatId),
      violation: violationMembers.has(m.id),
      highlighted:
        (highlight?.memberIds.has(m.id) ?? false) ||
        (diffMembers?.has(m.id) ?? false) ||
        overSeat === seatId,
      dimmed: dimByLegend || dimByHighlight,
      picked: picked === m.id,
      dragging: drag?.active === true && drag.memberId === m.id,
    };
  };

  const seatStates = useMemo(() => {
    const map = new Map<ID, SeatVisualState>();
    for (const room of visibleRooms)
      for (const s of room.seats) {
        const st: SeatVisualState = {
          occupied: !!plan.assignment[s.id],
          locked: locks.has(s.id),
          violation: violationSeats.has(s.id),
          selected: focusSeat === s.id,
          highlighted: overSeat === s.id || (highlight?.seatIds.has(s.id) ?? false),
        };
        map.set(s.id, st);
      }
    return map;
  }, [visibleRooms, plan.assignment, locks, violationSeats, focusSeat, overSeat, highlight]);

  // ドラッグ中、キャンバスの端に近づいたら自動でスクロール
  useEffect(() => {
    if (!drag?.active || !interactive) return;
    const loop = { raf: 0 };
    const tick = () => {
      const el = containerRef.current;
      const d = useDragStore.getState().drag;
      if (el && d) {
        const r = el.getBoundingClientRect();
        const edge = 36;
        const dx = d.x < r.left + edge ? 8 : d.x > r.right - edge ? -8 : 0;
        const dy = d.y < r.top + edge ? 8 : d.y > r.bottom - edge ? -8 : 0;
        if ((dx || dy) && d.x >= r.left && d.x <= r.right && d.y >= r.top && d.y <= r.bottom)
          viewport.panBy(dx, dy);
      }
      loop.raf = requestAnimationFrame(tick);
    };
    loop.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(loop.raf);
  }, [drag?.active, interactive, viewport]);

  const nameOf = (id: ID | undefined) => (id ? (members.get(id)?.name ?? "") : "");
  const labelOf = (seatId: ID) => {
    for (const r of rooms) {
      const s = r.seats.find((x) => x.id === seatId);
      if (s) return `${r.name} ${s.label}`;
    }
    return "";
  };

  const placePicked = (seatId: ID) => {
    // 描画前でも最新の選択を使う（キー操作が速い場合に古い値を読まない）
    const current = useSeatingUi.getState().pickedMemberId;
    if (!current) return false;
    const kind = dropMember(current, { kind: "seat", seatId });
    if (kind !== "none")
      setAnnounce(t("a11y.placed", { name: nameOf(current), seat: labelOf(seatId) }));
    useSeatingUi.getState().setPicked(null);
    return true;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!interactive || isEditableTarget(e.target)) return;
    const ui = useSeatingUi.getState();
    const dirs: Record<string, Dir> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
    };
    const dir = dirs[e.key];
    if (dir) {
      e.preventDefault();
      const next = nextSeatInDirection(visibleRooms, ui.focusSeatId, dir);
      if (next) {
        ui.setFocusSeat(next);
        const occupant = plan.assignment[next];
        setAnnounce(`${labelOf(next)} ${occupant ? nameOf(occupant) : t("a11y.empty")}`);
      }
      return;
    }
    const seat = ui.focusSeatId;
    if (!seat) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (ui.pickedMemberId) placePicked(seat);
      else if (plan.assignment[seat]) {
        ui.setPicked(plan.assignment[seat]!);
        setAnnounce(t("a11y.picked", { name: nameOf(plan.assignment[seat]) }));
      }
    } else if (e.key.toLowerCase() === "l" && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      toggleLock(seat);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      const m = plan.assignment[seat];
      if (m) {
        e.preventDefault();
        dropMember(m, { kind: "tray" });
      }
    } else if (e.key === "Escape") {
      ui.setPicked(null);
    }
  };

  const menuMember = menuSeat ? plan.assignment[menuSeat] : undefined;

  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        disabled={!interactive}
        onContextMenu={(e) => {
          const vp = viewport.clientToWorld(e.clientX, e.clientY);
          const hit = vp ? nearestSeat(visibleRooms, vp.x, vp.y) : undefined;
          if (!hit) {
            e.preventDefault();
            setMenuSeat(null);
            return;
          }
          setMenuSeat(hit.seat.id);
        }}
      >
        <div
          ref={containerRef}
          className="relative h-full min-h-0 outline-none"
          data-seating-canvas
          data-testid={rest["data-testid"] ?? "seating-canvas"}
          tabIndex={interactive ? 0 : -1}
          onKeyDown={onKeyDown}
          aria-label={t("canvas.label")}
        >
          <FloorCanvas
            viewport={viewport}
            readOnly
            initialFit={initialFit}
            cursor={picked ? "copy" : undefined}
            onPointerUp={(e) => {
              // チップのドラッグ・クリックは beginDrag 側が処理する（同じ操作で 2 回動かさない）
              if (useDragStore.getState().drag) return;
              const hit = nearestSeat(visibleRooms, e.x, e.y);
              if (!interactive) {
                if (hit) onSeatClick?.(hit.seat.id);
                return;
              }
              if (!hit) {
                useSeatingUi.getState().setPicked(null);
                return;
              }
              useSeatingUi.getState().setFocusSeat(hit.seat.id);
              placePicked(hit.seat.id);
            }}
            overlay={
              <>
                {showHeatmap && <DepthHeatmapOverlay rooms={visibleRooms} opacity={0.35} />}
                <CompositionOverlay
                  rooms={visibleRooms}
                  comps={comps}
                  labs={labs}
                  warnRoomIds={warnRoomIds}
                />
                <ChipsLayer
                  rooms={visibleRooms}
                  assignment={plan.assignment}
                  members={members}
                  labs={labs}
                  view={view}
                  interactive={interactive}
                  onChipPointerDown={(e, memberId, seatId) => {
                    e.stopPropagation();
                    if (locks.has(seatId)) {
                      useSeatingUi.getState().setFocusSeat(seatId);
                      return;
                    }
                    beginDrag(e, memberId, seatId, {
                      onClick: () => {
                        const ui = useSeatingUi.getState();
                        ui.setFocusSeat(seatId);
                        if (ui.pickedMemberId && ui.pickedMemberId !== memberId)
                          placePicked(seatId);
                        else ui.setPicked(ui.pickedMemberId === memberId ? null : memberId);
                      },
                    });
                  }}
                  onChipEnter={(e, memberId) => {
                    if (useDragStore.getState().drag) return;
                    useSeatingUi.getState().setHover({
                      memberId,
                      planId: plan.id,
                      x: e.clientX,
                      y: e.clientY,
                    });
                  }}
                  onChipLeave={() => useSeatingUi.getState().setHover(null)}
                />
              </>
            }
            chrome={
              <>
                <div className="absolute right-3 bottom-3 flex flex-col items-end gap-2">
                  {showMinimap && (
                    <div className="hidden md:block">
                      <Minimap rooms={visibleRooms} viewport={viewport} />
                    </div>
                  )}
                  <ZoomControls
                    viewport={viewport}
                    onFitAll={() =>
                      viewport.fit(roomsBounds(visibleRooms), { animate: true, padding: 72 })
                    }
                  />
                </div>
              </>
            }
          >
            {visibleRooms.map((room) => (
              <RoomShape
                key={room.id}
                room={room}
                readOnly
                seatStates={seatStates}
                badge={`${comps.rooms.get(room.id)?.total ?? 0}/${room.seats.length}`}
              />
            ))}
          </FloorCanvas>
          <div aria-live="polite" className="sr-only" data-testid="seating-announce">
            {announce}
          </div>
        </div>
      </ContextMenuTrigger>
      {menuSeat && (
        <ContextMenuContent className="w-64" data-testid="seating-context-menu">
          <ContextMenuLabel className="text-muted-foreground truncate text-xs">
            {labelOf(menuSeat)}
            {menuMember ? ` · ${nameOf(menuMember)}` : ""}
          </ContextMenuLabel>
          {!plan.id.startsWith("__") && plan.kind === "current" && (
            <ContextMenuItem
              onSelect={() => setLocked([menuSeat], !locks.has(menuSeat))}
              data-testid="ctx-lock"
            >
              {locks.has(menuSeat) ? t("lock.unlock") : t("lock.lock")}
            </ContextMenuItem>
          )}
          {menuMember && (
            <ContextMenuItem
              onSelect={() => dropMember(menuMember, { kind: "tray" })}
              data-testid="ctx-unassign"
            >
              {t("tray.unassign")}
            </ContextMenuItem>
          )}
          {plan.kind === "current" && (
            <>
              <ContextMenuSeparator />
              <RuleContextMenuItems
                items={
                  menuMember
                    ? ruleActionsForMember(menuMember, { seatId: menuSeat })
                    : ruleActionsForSeat(menuSeat)
                }
              />
            </>
          )}
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
}
