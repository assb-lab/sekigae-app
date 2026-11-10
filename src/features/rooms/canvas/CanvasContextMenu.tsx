/**
 * 部屋エディタのキャンバス右クリックメニュー: 席・部屋からルールを作る（#97）。
 */
import { useState, type ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { ID } from "@/domain/schema";
import { ruleActionsForRoom, ruleActionsForSeat } from "@/features/rules/contextActions";
import { RuleContextMenuItems } from "@/features/rules/RuleContextMenuItems";
import { useProjectStore } from "@/store/project";
import { seatIndex } from "@/store/selectors";

type Target = { kind: "seat"; id: ID } | { kind: "room"; id: ID } | null;

export function CanvasContextMenu({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<Target>(null);
  const rooms = useProjectStore((s) => s.project.layout.rooms);

  const onContextMenu = (e: React.MouseEvent) => {
    const el = e.target as Element;
    const seatId = el.closest("[data-seat-id]")?.getAttribute("data-seat-id");
    const roomId =
      el.closest("[data-room-id]")?.getAttribute("data-room-id") ??
      el.closest("[data-room-header]")?.getAttribute("data-room-header");
    if (seatId) setTarget({ kind: "seat", id: seatId });
    else if (roomId) setTarget({ kind: "room", id: roomId });
    else {
      setTarget(null);
      e.preventDefault(); // 何もない場所ではメニューを出さない
    }
  };

  let label = "";
  let items: ReturnType<typeof ruleActionsForSeat> = [];
  if (target?.kind === "seat") {
    const ref = seatIndex(rooms).get(target.id);
    label = ref ? `${ref.room.name} · ${ref.seat.label || "—"}` : "";
    items = ref ? ruleActionsForSeat(target.id) : [];
  } else if (target?.kind === "room") {
    label = rooms.find((r) => r.id === target.id)?.name ?? "";
    items = label ? ruleActionsForRoom(target.id) : [];
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild onContextMenu={onContextMenu}>
        {children}
      </ContextMenuTrigger>
      {target && items.length > 0 && (
        <ContextMenuContent className="w-64" data-testid="canvas-context-menu">
          <ContextMenuLabel className="text-muted-foreground truncate text-xs">
            {label}
          </ContextMenuLabel>
          <RuleContextMenuItems items={items} />
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
}
