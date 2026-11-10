/**
 * 色分けモード（#121）。チップの塗り色と凡例を同じ関数から作る。
 * 研究室はどのモードでもチップの縁取り + 略称で常に区別できる（色だけに頼らない）。
 */
import type { Gender } from "@/domain/genders";
import { GENDERS } from "@/domain/genders";
import { ROLE_ORDER, type RoleKey } from "@/domain/roles";
import type { ID, Lab, Member } from "@/domain/schema";
import { GENDER_COLORS, ROLE_COLORS, type Scheme } from "@/graphics/palette";
import { CHANGE_KINDS, type ChangeKind } from "@/features/members/lib/diff";

export const COLOR_MODES = ["role", "lab", "gender", "diff"] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

export const CHANGE_COLORS: Record<ChangeKind, { light: string; dark: string }> = {
  sameSeat: { light: "#0284c7", dark: "#38bdf8" },
  sameRoom: { light: "#059669", dark: "#34d399" },
  differentRoom: { light: "#d97706", dark: "#fbbf24" },
  new: { light: "#7c3aed", dark: "#a78bfa" },
  unassigned: { light: "#64748b", dark: "#94a3b8" },
};

export const NO_LAB_COLOR = { light: "#94a3b8", dark: "#64748b" };

/** 凡例キー（クリックで強調）: "role:m1" / "lab:<id>" / "lab:none" / "gender:male" / "diff:new" */
export type LegendKey = string;

export interface ColorCtx {
  scheme: Scheme;
  labs: ReadonlyMap<ID, Lab>;
  changes?: ReadonlyMap<ID, ChangeKind>;
}

export function legendKeyOf(mode: ColorMode, m: Member, ctx: ColorCtx): LegendKey {
  switch (mode) {
    case "role":
      return `role:${m.role}`;
    case "lab":
      return m.labId && ctx.labs.has(m.labId) ? `lab:${m.labId}` : "lab:none";
    case "gender":
      return `gender:${m.gender}`;
    case "diff":
      return `diff:${ctx.changes?.get(m.id) ?? "unassigned"}`;
  }
}

export function labColor(m: Pick<Member, "labId">, ctx: ColorCtx): string {
  const lab = m.labId ? ctx.labs.get(m.labId) : undefined;
  return lab?.color ?? NO_LAB_COLOR[ctx.scheme];
}

export function chipFill(mode: ColorMode, m: Member, ctx: ColorCtx): string {
  switch (mode) {
    case "role":
      return ROLE_COLORS[m.role][ctx.scheme];
    case "lab":
      return labColor(m, ctx);
    case "gender":
      return GENDER_COLORS[m.gender][ctx.scheme];
    case "diff":
      return CHANGE_COLORS[ctx.changes?.get(m.id) ?? "unassigned"][ctx.scheme];
  }
}

export interface LegendItem {
  key: LegendKey;
  color: string;
  /** 翻訳済みでない識別子（role / lab id / gender / change kind） */
  value: string;
  kind: ColorMode;
  count: number;
}

export function legendItems(
  mode: ColorMode,
  members: readonly Member[],
  ctx: ColorCtx,
): LegendItem[] {
  const counts = new Map<LegendKey, number>();
  for (const m of members) {
    const k = legendKeyOf(mode, m, ctx);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const make = (value: string, color: string): LegendItem => {
    const key = `${mode}:${value}`;
    return { key, color, value, kind: mode, count: counts.get(key) ?? 0 };
  };
  switch (mode) {
    case "role":
      return ROLE_ORDER.map((r: RoleKey) => make(r, ROLE_COLORS[r][ctx.scheme])).filter(
        (x) => x.count,
      );
    case "lab":
      return [
        ...[...ctx.labs.values()].map((l) => make(l.id, l.color)),
        make("none", NO_LAB_COLOR[ctx.scheme]),
      ].filter((x) => x.count);
    case "gender":
      return GENDERS.map((g: Gender) => make(g, GENDER_COLORS[g][ctx.scheme])).filter(
        (x) => x.count,
      );
    case "diff":
      return CHANGE_KINDS.map((k) => make(k, CHANGE_COLORS[k][ctx.scheme]));
  }
}
