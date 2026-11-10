/** 部屋の下辺に描く研究室構成バー（ワールド座標）。#160 */
import { memo } from "react";
import { useLod } from "@/components/canvas";
import type { ID, Lab, Room } from "@/domain/schema";
import type { Compositions } from "./lib/composition";

export const CompositionOverlay = memo(function CompositionOverlay({
  rooms,
  comps,
  labs,
  warnRoomIds,
}: {
  rooms: Room[];
  comps: Compositions;
  labs: ReadonlyMap<ID, Lab>;
  warnRoomIds: ReadonlySet<ID>;
}) {
  const lod = useLod();
  if (lod === "far") return null;
  return (
    <g data-layer="composition" style={{ pointerEvents: "none" }}>
      {rooms.map((room) => {
        const c = comps.rooms.get(room.id);
        if (!c || !c.total) return null;
        const w = room.width;
        const y = room.position.y + room.height + 0.18;
        let x = room.position.x;
        return (
          <g key={room.id}>
            <rect
              x={room.position.x - 0.03}
              y={y - 0.03}
              width={w + 0.06}
              height={0.28}
              rx={0.08}
              fill="none"
              stroke={warnRoomIds.has(room.id) ? "var(--canvas-violation)" : "transparent"}
              strokeWidth={0.04}
            />
            {c.labs.map((s) => {
              const lw = s.share * w;
              const lab = s.labId ? labs.get(s.labId) : undefined;
              const el = (
                <g key={s.labId ?? "none"}>
                  <rect
                    x={x}
                    y={y}
                    width={Math.max(0, lw - 0.02)}
                    height={0.22}
                    rx={0.05}
                    fill={lab?.color ?? "#94a3b8"}
                    opacity={0.9}
                  />
                  {lod === "near" && lw > 0.7 && (
                    <text
                      x={x + lw / 2}
                      y={y + 0.11}
                      dy="0.35em"
                      textAnchor="middle"
                      fontSize={0.13}
                      fontWeight={600}
                      fill="#fff"
                    >
                      {`${lab?.shortName ?? "—"} ${s.count}`}
                    </text>
                  )}
                </g>
              );
              x += lw;
              return el;
            })}
          </g>
        );
      })}
    </g>
  );
});
