/** 未配置トレイ（左パネル）。ここへドロップすると配置を外す。#114 */
import { Search, UserMinus, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ROLE_GROUPS, roleGroupOf, type RoleGroup } from "@/domain/roles";
import type { Member, SeatPlan } from "@/domain/schema";
import { LabBadge, RoleBadge } from "@/features/members/components/badges";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/project";
import { totalSeats, unassignedMembers, useLabIndex, useRooms } from "@/store/selectors";
import { unassignAll } from "./actions";
import { beginDrag, useDragStore } from "./drag";
import { useSeatingUi } from "./seatingStore";

export function UnassignedTray({
  plan,
  onAutoPlace,
  autoPlaceDisabled,
}: {
  plan: SeatPlan;
  onAutoPlace?: () => void;
  autoPlaceDisabled?: boolean;
}) {
  const { t } = useTranslation("seating");
  const { t: tc } = useTranslation();
  const project = useProjectStore((s) => s.project);
  const rooms = useRooms();
  const labs = useLabIndex();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<RoleGroup | "all">("all");
  const [lab, setLab] = useState<string>("all");
  const picked = useSeatingUi((s) => s.pickedMemberId);
  const over = useDragStore((s) => s.drag?.active && s.drag.over?.kind === "tray");

  const all = useMemo(() => unassignedMembers(project, plan), [project, plan]);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter(
      (m) =>
        (group === "all" || roleGroupOf(m.role) === group) &&
        (lab === "all" || m.labId === lab) &&
        (!needle || m.name.toLowerCase().includes(needle) || (m.kana ?? "").includes(needle)),
    );
  }, [all, q, group, lab]);
  const seats = totalSeats(rooms);
  const shortage = project.members.length - seats;

  return (
    <aside
      className={cn(
        "bg-sidebar flex h-full w-64 flex-col border-r transition-colors",
        over && "bg-primary/10 ring-primary ring-2 ring-inset",
      )}
      data-drop-tray
      data-tour="seating-tray"
      data-testid="unassigned-tray"
    >
      <div className="space-y-2 border-b p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("tray.title")}</h2>
          <Badge variant={all.length ? "default" : "secondary"} data-testid="unassigned-count">
            {all.length}
          </Badge>
        </div>
        {shortage > 0 && (
          <p className="text-destructive text-xs">{t("tray.shortage", { count: shortage })}</p>
        )}
        <div className="relative">
          <Search className="text-muted-foreground absolute top-2 left-2 size-3.5" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("tray.search")}
            className="h-8 pl-7 text-xs"
          />
        </div>
        <div className="flex gap-1.5">
          <select
            className="bg-background h-7 min-w-0 flex-1 rounded border px-1 text-xs"
            value={group}
            onChange={(e) => setGroup(e.target.value as RoleGroup | "all")}
            aria-label={t("tray.filterRole")}
          >
            <option value="all">{t("tray.allRoles")}</option>
            {ROLE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {tc(`roleGroups.${g}`)}
              </option>
            ))}
          </select>
          <select
            className="bg-background h-7 min-w-0 flex-1 rounded border px-1 text-xs"
            value={lab}
            onChange={(e) => setLab(e.target.value)}
            aria-label={t("tray.filterLab")}
          >
            <option value="all">{t("tray.allLabs")}</option>
            {[...labs.values()].map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <ul className="space-y-1 p-2">
          {list.map((m) => (
            <TrayItem
              key={m.id}
              member={m}
              lab={m.labId ? labs.get(m.labId) : undefined}
              picked={picked === m.id}
            />
          ))}
          {!list.length && (
            <li className="text-muted-foreground p-4 text-center text-xs">
              {all.length ? t("tray.noMatch") : t("tray.allPlaced")}
            </li>
          )}
        </ul>
      </ScrollArea>
      <div className="flex flex-col gap-1.5 border-t p-2">
        {onAutoPlace && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onAutoPlace}
            disabled={!all.length || autoPlaceDisabled}
            data-testid="auto-place"
          >
            <Wand2 />
            {t("tray.autoPlace")}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={unassignAll} data-testid="unassign-all">
          <UserMinus />
          {t("tray.unassignAll")}
        </Button>
      </div>
    </aside>
  );
}

function TrayItem({
  member,
  lab,
  picked,
}: {
  member: Member;
  lab: ReturnType<ReturnType<typeof useLabIndex>["get"]>;
  picked: boolean;
}) {
  const dragging = useDragStore((s) => s.drag?.active && s.drag.memberId === member.id);
  return (
    <li>
      <button
        type="button"
        className={cn(
          "hover:bg-accent flex w-full cursor-grab touch-none items-center select-none gap-2 rounded-md border bg-card px-2 py-1.5 text-left text-sm shadow-xs transition-all",
          picked && "border-primary ring-primary/40 ring-2",
          dragging && "opacity-40",
        )}
        data-testid="tray-member"
        data-member-id={member.id}
        aria-pressed={picked}
        onPointerDown={(e) =>
          beginDrag(e, member.id, null, {
            onClick: () => {
              const ui = useSeatingUi.getState();
              ui.setPicked(ui.pickedMemberId === member.id ? null : member.id);
            },
          })
        }
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            const ui = useSeatingUi.getState();
            ui.setPicked(ui.pickedMemberId === member.id ? null : member.id);
          }
        }}
      >
        <span className="min-w-0 flex-1 truncate font-medium">{member.name}</span>
        <RoleBadge role={member.role} />
        {lab && <LabBadge lab={lab} />}
      </button>
    </li>
  );
}
