/**
 * 全メンバーのチップを席のワールド位置に描くレイヤー。配置が変わると motion で席間を移動する。#119
 */
import { motion, useReducedMotion } from "motion/react";
import { memo, useMemo } from "react";
import type { ID, Lab, Member, Room } from "@/domain/schema";
import { seatAnchor, seatPosIndex } from "./lib/hit";
import { MemberChip } from "./MemberChip";

export interface ChipView {
  fill: string;
  locked: boolean;
  violation: boolean;
  highlighted: boolean;
  dimmed: boolean;
  picked: boolean;
  dragging: boolean;
}

interface Props {
  rooms: Room[];
  assignment: Record<ID, ID>;
  members: ReadonlyMap<ID, Member>;
  labs: ReadonlyMap<ID, Lab>;
  view: (member: Member, seatId: ID) => ChipView;
  interactive: boolean;
  onChipPointerDown?: (e: React.PointerEvent, memberId: ID, seatId: ID) => void;
  onChipEnter?: (e: React.PointerEvent, memberId: ID) => void;
  onChipLeave?: () => void;
}

/** メンバー ID から決まる小さな遅延（シャッフル時に順番に飛ぶ） */
const stagger = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 40) * 0.008;
};

export const ChipsLayer = memo(function ChipsLayer({
  rooms,
  assignment,
  members,
  labs,
  view,
  interactive,
  onChipPointerDown,
  onChipEnter,
  onChipLeave,
}: Props) {
  const reduce = useReducedMotion();
  const pos = seatPosIndex(rooms);
  const entries = useMemo(
    () =>
      Object.entries(assignment)
        .filter(([sid, mid]) => pos.has(sid) && members.has(mid))
        .sort((a, b) => (a[1] < b[1] ? -1 : 1)),
    [assignment, pos, members],
  );
  return (
    <g data-layer="chips">
      {entries.map(([seatId, memberId]) => {
        const p = seatAnchor(pos.get(seatId)!);
        const m = members.get(memberId)!;
        const v = view(m, seatId);
        return (
          <motion.g
            key={memberId}
            initial={false}
            animate={{ x: p.x, y: p.y }}
            transition={
              reduce
                ? { duration: 0 }
                : { type: "spring", stiffness: 170, damping: 22, delay: stagger(memberId) }
            }
            onPointerDown={
              interactive && onChipPointerDown
                ? (e: React.PointerEvent) => onChipPointerDown(e, memberId, seatId)
                : undefined
            }
            onPointerEnter={
              onChipEnter ? (e: React.PointerEvent) => onChipEnter(e, memberId) : undefined
            }
            onPointerLeave={onChipLeave}
            data-testid="member-chip"
            data-member-id={memberId}
            data-seat={seatId}
          >
            <MemberChip
              member={m}
              lab={m.labId ? labs.get(m.labId) : undefined}
              fill={v.fill}
              locked={v.locked}
              violation={v.violation}
              highlighted={v.highlighted}
              dimmed={v.dimmed}
              picked={v.picked}
              dragging={v.dragging}
            />
          </motion.g>
        );
      })}
    </g>
  );
});
