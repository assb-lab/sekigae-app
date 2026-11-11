/**
 * 席のトップビュー（机 + 椅子）。facing の方向に机がある（= 座る人が向く方向）。
 * 通常は 1×1 セル。span ≥ 2 は横長の机（部長席など）で、座る人の左右方向に span セル伸びる
 * （北/南向きは横長、東/西向きは縦長。(x, y) はフットプリントの左上）。
 * 状態: 空席 / 割当済み(occupied) / ロック / 違反 / 選択 / ハイライト。
 * children はセル左上原点・回転しない座標系で上に重ねる（席配置画面のメンバーチップなど）。
 */
import { memo, useState, type ReactNode } from "react";
import { seatSize, seatSpan } from "@/domain/geometry/seat";
import type { Facing } from "@/domain/schema";
import { useLod } from "./context";
import { deskCenter, FACING_ANGLE, fitText } from "./geometry";
import type { Lod } from "./viewport";

export interface SeatVisualState {
  occupied?: boolean;
  locked?: boolean;
  violation?: boolean;
  selected?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
}

export interface SeatGlyphProps extends SeatVisualState {
  /** 部屋ローカルのセル座標 */
  x: number;
  y: number;
  facing: Facing;
  /** 横長の机の幅（セル数、既定 1） */
  span?: number;
  label?: string;
  /** 割当済みのときの色（役職色など）。未指定なら選択色 */
  accent?: string;
  /** 詳細度（未指定ならキャンバスの現在値） */
  lod?: Lod;
  /** プレビュー用の半透明表示 */
  ghost?: boolean;
  /** プレビューで置けない位置 */
  invalid?: boolean;
  showLabel?: boolean;
  seatId?: string;
  children?: ReactNode;
}

/** 0→270 のような逆回りを避け、最短方向へ回す角度 */
function useSmoothAngle(target: number) {
  const [s, setS] = useState({ target, angle: target });
  if (s.target !== target) {
    const delta = ((((target - s.angle) % 360) + 540) % 360) - 180;
    const next = { target, angle: s.angle + delta };
    setS(next);
    return next.angle;
  }
  return s.angle;
}

export const SeatGlyph = memo(function SeatGlyph({
  x,
  y,
  facing,
  span: spanProp,
  label,
  accent,
  lod: lodProp,
  occupied,
  locked,
  violation,
  selected,
  highlighted,
  dimmed,
  ghost,
  invalid,
  showLabel = true,
  seatId,
  children,
}: SeatGlyphProps) {
  const ctxLod = useLod();
  const lod = lodProp ?? ctxLod;
  const angle = useSmoothAngle(FACING_ANGLE[facing]);
  const fillAccent = accent ?? "var(--canvas-selection)";
  const desk = invalid ? "var(--canvas-violation)" : "var(--canvas-desk)";
  const deskStroke = invalid ? "var(--canvas-violation)" : "var(--canvas-desk-stroke)";
  const span = seatSpan({ span: spanProp });
  const { w: fw, h: fh } = seatSize({ facing, span });
  const dc = deskCenter(facing, fw, fh);
  // 回転前の座標系（机が上・椅子が下、幅 span × 奥行き 1）で、中央の 1 セル分のオフセット
  const mid = (span - 1) / 2;

  return (
    <g
      className="sk-seat"
      transform={`translate(${x} ${y})`}
      opacity={ghost ? (invalid ? 0.45 : 0.7) : dimmed ? 0.4 : 1}
      data-seat-id={seatId}
      data-state={
        [
          occupied && "occupied",
          locked && "locked",
          violation && "violation",
          selected && "selected",
          highlighted && "highlighted",
        ]
          .filter(Boolean)
          .join(" ") || "empty"
      }
    >
      {selected && (
        <rect
          className="sk-seat-ring sk-px2"
          x={0.03}
          y={0.03}
          width={fw - 0.06}
          height={fh - 0.06}
          rx={0.16}
          fill="var(--canvas-selection)"
          fillOpacity={0.16}
          stroke="var(--canvas-selection)"
        />
      )}
      {highlighted && (
        <rect
          className="sk-seat-highlight sk-px3"
          x={-0.02}
          y={-0.02}
          width={fw + 0.04}
          height={fh + 0.04}
          rx={0.2}
          fill="var(--sk-highlight)"
          fillOpacity={0.2}
          stroke="var(--sk-highlight)"
        />
      )}
      {lod === "far" ? (
        <rect
          x={0.1}
          y={0.1}
          width={fw - 0.2}
          height={fh - 0.2}
          rx={0.14}
          fill={occupied ? fillAccent : desk}
          stroke={deskStroke}
          strokeWidth={0.05}
        />
      ) : (
        // フットプリントの中心で回転する（1×1 のときは従来どおりセル中心）
        <g transform={`translate(${fw / 2} ${fh / 2})`}>
          <g
            className="sk-seat-rot"
            style={{ transform: `rotate(${angle}deg)`, transformOrigin: "0px 0px" }}
          >
            <g transform={`translate(${-span / 2} -0.5)`}>
              {/* 椅子（背もたれ・座面・肘掛け）。横長の机では中央に 1 脚 */}
              <g transform={mid ? `translate(${mid} 0)` : undefined}>
                <rect
                  className="sk-chair"
                  x={0.27}
                  y={0.86}
                  width={0.46}
                  height={0.09}
                  rx={0.045}
                  fill={occupied ? fillAccent : "var(--sk-chair-back)"}
                  opacity={occupied ? 0.85 : 1}
                />
                <rect
                  className="sk-chair"
                  x={0.3}
                  y={0.58}
                  width={0.4}
                  height={0.3}
                  rx={0.1}
                  fill={occupied ? fillAccent : "var(--canvas-chair)"}
                />
                <rect
                  x={0.25}
                  y={0.62}
                  width={0.06}
                  height={0.2}
                  rx={0.03}
                  fill="var(--sk-chair-back)"
                />
                <rect
                  x={0.69}
                  y={0.62}
                  width={0.06}
                  height={0.2}
                  rx={0.03}
                  fill="var(--sk-chair-back)"
                />
              </g>
              {/* 机 */}
              <rect
                className="sk-desk"
                x={0.06}
                y={0.06}
                width={span - 0.12}
                height={0.48}
                rx={0.07}
                fill={desk}
                fillOpacity={invalid ? 0.35 : 1}
                stroke={deskStroke}
                strokeWidth={0.035}
                data-span={span > 1 ? span : undefined}
              />
              {lod === "near" && !invalid && (
                <g transform={mid ? `translate(${mid} 0)` : undefined}>
                  {/* モニター（奥側の細いバー）。ラベルが無いときはキーボードも */}
                  <rect
                    x={0.28}
                    y={0.09}
                    width={0.44}
                    height={0.05}
                    rx={0.02}
                    fill="var(--sk-monitor)"
                  />
                  {!(label && showLabel) && (
                    <rect
                      x={0.34}
                      y={0.34}
                      width={0.32}
                      height={0.1}
                      rx={0.02}
                      fill="var(--canvas-desk-stroke)"
                      opacity={0.35}
                    />
                  )}
                </g>
              )}
              {occupied && (
                <circle
                  cx={0.5 + mid}
                  cy={0.72}
                  r={0.12}
                  fill="var(--canvas-floor)"
                  opacity={0.85}
                />
              )}
            </g>
          </g>
        </g>
      )}
      {violation && (
        <rect
          className="sk-seat-violation sk-px3"
          x={-0.04}
          y={-0.04}
          width={fw + 0.08}
          height={fh + 0.08}
          rx={0.2}
          fill="none"
          stroke="var(--canvas-violation)"
        />
      )}
      {locked && lod !== "far" && (
        <g transform={`translate(${fw - 0.16} 0.16)`}>
          <circle
            r={0.15}
            fill="var(--sk-locked)"
            stroke="var(--canvas-floor)"
            strokeWidth={0.03}
          />
          <path
            d="M-0.05 -0.01V-0.04A0.05 0.05 0 0 1 0.05 -0.04V-0.01"
            fill="none"
            stroke="white"
            strokeWidth={0.025}
          />
          <rect x={-0.07} y={-0.02} width={0.14} height={0.1} rx={0.02} fill="white" />
        </g>
      )}
      {showLabel && label && lod === "near" && !ghost && !children && (
        <text
          x={dc.x}
          y={dc.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={0.17}
          fontWeight={600}
          fill="var(--canvas-label)"
        >
          {fitText(label, fw - 0.2, 0.17)}
        </text>
      )}
      {children}
    </g>
  );
});
