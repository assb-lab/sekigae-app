/** 名簿の行の右クリックメニュー: メンバーからルールを作る（#97） */
import { useState, type ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { ID } from "@/domain/schema";
import { ruleActionsForMember } from "@/features/rules/contextActions";
import { RuleContextMenuItems } from "@/features/rules/RuleContextMenuItems";
import { useProjectStore } from "@/store/project";
import { activePlan, seatIndex, seatOfMember } from "@/store/selectors";

export function MemberContextMenu({
  children,
  disabled,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  const [memberId, setMemberId] = useState<ID | null>(null);
  const project = useProjectStore((s) => s.project);

  if (disabled) return <>{children}</>;

  const member = memberId ? project.members.find((m) => m.id === memberId) : undefined;
  const seatId = member ? seatOfMember(activePlan(project).assignment).get(member.id) : undefined;
  const roomId = seatId ? seatIndex(project.layout.rooms).get(seatId)?.room.id : undefined;
  const items = member ? ruleActionsForMember(member.id, { seatId, roomId }) : [];

  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        onContextMenu={(e) => {
          const id = (e.target as Element).closest("[data-member]")?.getAttribute("data-member");
          if (!id) e.preventDefault();
          setMemberId(id ?? null);
        }}
      >
        {children}
      </ContextMenuTrigger>
      {member && items.length > 0 && (
        <ContextMenuContent className="w-64" data-testid="member-context-menu">
          <ContextMenuLabel className="text-muted-foreground truncate text-xs">
            {member.name}
          </ContextMenuLabel>
          <RuleContextMenuItems items={items} />
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
}
