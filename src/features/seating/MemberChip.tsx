/**
 * 席に座ったメンバーのチップ（SVG、1 セル = 1 ワールド単位、セル左上原点）。#113
 * - アバター（頭文字）の塗りは色分けモードの色、縁取りは研究室色、右上に研究室略称。
 * - ズームの詳細度（LOD）で表示を切り替える。色だけに頼らず役職テキストも出す。
 */
import { memo } from "react";
import { fitText, useLod } from "@/components/canvas";
import type { Lab, Member } from "@/domain/schema";
import { readableText } from "@/graphics/palette";
import { useTranslation } from "react-i18next";
import { shortName } from "./lib/names";

export interface MemberChipProps {
  member: Member;
  lab: Lab | undefined;
  fill: string;
  locked?: boolean;
  violation?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  picked?: boolean;
  dragging?: boolean;
}

export const MemberChip = memo(function MemberChip({
  member,
  lab,
  fill,
  locked,
  violation,
  highlighted,
  dimmed,
  picked,
  dragging,
}: MemberChipProps) {
  const { t } = useTranslation();
  const lod = useLod();
  const ring = lab?.color ?? "#94a3b8";
  const text = readableText(fill);
  const initial = Array.from(member.name.trim())[0] ?? "?";
  const role = t(`roles.${member.role}`);
  const cx = 0.5;
  const cy = lod === "near" ? 0.4 : 0.5;
  const r = lod === "near" ? 0.27 : 0.33;

  return (
    <g
      className="sk-chip"
      opacity={dragging ? 0.3 : dimmed ? 0.28 : 1}
      style={{ transition: "opacity 160ms" }}
      data-member-chip={member.id}
    >
      {/* 選択 / 強調 / 違反のリング */}
      {(highlighted || picked) && (
        <circle
          cx={cx}
          cy={cy}
          r={r + 0.12}
          fill="none"
          stroke="var(--canvas-selection)"
          strokeWidth={0.06}
          className={highlighted ? "sk-pulse" : undefined}
        />
      )}
      {violation && (
        <circle
          cx={cx}
          cy={cy}
          r={r + 0.07}
          fill="none"
          stroke="var(--canvas-violation)"
          strokeWidth={0.05}
          strokeDasharray="0.08 0.05"
        />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        stroke={ring}
        strokeWidth={lod === "far" ? 0.08 : 0.07}
      />
      {lod !== "far" && (
        <text
          x={cx}
          y={cy}
          dy="0.35em"
          textAnchor="middle"
          fontSize={lod === "near" ? 0.26 : 0.32}
          fontWeight={700}
          fill={text}
          style={{ pointerEvents: "none" }}
        >
          {initial}
        </text>
      )}
      {lod === "near" && (
        <>
          <text
            x={cx}
            y={0.86}
            textAnchor="middle"
            fontSize={0.15}
            fontWeight={600}
            fill="var(--canvas-label)"
            style={{ pointerEvents: "none" }}
          >
            {fitText(shortName(member.name), 0.95, 0.15)}
          </text>
          <text
            x={cx}
            y={0.99}
            textAnchor="middle"
            fontSize={0.1}
            fill="var(--canvas-label)"
            opacity={0.75}
            style={{ pointerEvents: "none" }}
          >
            {role}
          </text>
          {lab && (
            <g transform="translate(0.62 0.03)">
              <rect width={0.36} height={0.16} rx={0.05} fill={ring} />
              <text
                x={0.18}
                y={0.08}
                dy="0.35em"
                textAnchor="middle"
                fontSize={0.1}
                fontWeight={600}
                fill={readableText(ring)}
                style={{ pointerEvents: "none" }}
              >
                {fitText(lab.shortName, 0.34, 0.1)}
              </text>
            </g>
          )}
        </>
      )}
      {locked && (
        <g transform={`translate(${lod === "near" ? 0.02 : 0.06} 0.04)`} aria-hidden>
          <rect
            width={0.2}
            height={0.2}
            rx={0.05}
            fill="var(--card)"
            stroke="var(--border)"
            strokeWidth={0.02}
          />
          <rect x={0.05} y={0.09} width={0.1} height={0.08} rx={0.015} fill="var(--foreground)" />
          <path
            d="M0.07 0.09 v-0.025 a0.03 0.03 0 0 1 0.06 0 v0.025"
            fill="none"
            stroke="var(--foreground)"
            strokeWidth={0.018}
          />
        </g>
      )}
      <title>{`${member.name} · ${role}${lab ? ` · ${lab.name}` : ""}`}</title>
    </g>
  );
});
