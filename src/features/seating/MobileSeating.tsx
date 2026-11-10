/** スマホ用の閲覧専用ビュー: 検索して自分の席へジャンプ、タップで詳細。#127 */
import { Search, Smartphone } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useViewport } from "@/components/canvas";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ID, SeatPlan } from "@/domain/schema";
import { LabBadge, RoleBadge } from "@/features/members/components/badges";
import { useProjectStore } from "@/store/project";
import { seatIndex, useLabIndex, useMemberIndex } from "@/store/selectors";
import type { ColorMode } from "./lib/colors";
import { seatPosIndex } from "./lib/hit";
import { SeatingCanvas } from "./SeatingCanvas";
import { useSeatingUi } from "./seatingStore";

export function MobileSeating({ plan, colorMode }: { plan: SeatPlan; colorMode: ColorMode }) {
  const { t } = useTranslation("seating");
  const viewport = useViewport();
  const project = useProjectStore((s) => s.project);
  const members = useMemberIndex();
  const labs = useLabIndex();
  const [q, setQ] = useState("");
  const [sheetSeat, setSheetSeat] = useState<ID | null>(null);

  const results = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return [];
    return project.members
      .filter((m) => m.name.toLowerCase().includes(n) || (m.kana ?? "").includes(n))
      .slice(0, 6);
  }, [q, project.members]);

  const jump = (memberId: ID) => {
    const seatId = Object.entries(plan.assignment).find(([, m]) => m === memberId)?.[0];
    const pos = seatId ? seatPosIndex(project.layout.rooms).get(seatId) : undefined;
    if (pos && seatId) {
      viewport.fit({ x: pos.x - 2, y: pos.y - 2, width: 5, height: 5 }, { animate: true });
      useSeatingUi
        .getState()
        .setHighlight({ memberIds: new Set([memberId]), seatIds: new Set([seatId]) });
      setSheetSeat(seatId);
    }
    setQ("");
  };

  const ref = sheetSeat ? seatIndex(project.layout.rooms).get(sheetSeat) : undefined;
  const member =
    sheetSeat && plan.assignment[sheetSeat] ? members.get(plan.assignment[sheetSeat]!) : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="mobile-seating">
      <div className="relative border-b p-2">
        <Search className="text-muted-foreground absolute top-4 left-4 size-4" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("mobile.search")}
          className="pl-8"
          data-testid="mobile-search"
        />
        {results.length > 0 && (
          <ul className="bg-popover absolute inset-x-2 top-12 z-20 rounded-md border shadow-lg">
            {results.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="hover:bg-accent w-full px-3 py-2 text-left text-sm"
                  onClick={() => jump(m.id)}
                >
                  {m.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-muted-foreground mt-1.5 flex items-center gap-1 text-[11px]">
          <Smartphone className="size-3" />
          {t("mobile.viewOnly")}
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <SeatingCanvas
          plan={plan}
          colorMode={colorMode}
          readOnly
          viewport={viewport}
          showMinimap={false}
          onSeatClick={setSheetSeat}
        />
      </div>
      <Sheet open={!!sheetSeat} onOpenChange={(o) => !o && setSheetSeat(null)}>
        <SheetContent side="bottom" data-testid="mobile-sheet">
          <SheetHeader>
            <SheetTitle>{ref ? `${ref.room.name} ${ref.seat.label}` : ""}</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 px-4 pb-6 text-sm">
            {member ? (
              <>
                <div className="text-lg font-semibold">{member.name}</div>
                <div className="flex items-center gap-2">
                  <RoleBadge role={member.role} long />
                  {member.labId && labs.get(member.labId) && (
                    <LabBadge lab={labs.get(member.labId)!} full />
                  )}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">{t("mobile.emptySeat")}</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
