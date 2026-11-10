/** エンジンの診断コードを翻訳済みの文に変換する */
import i18n from "@/i18n";
import type { Diagnostic } from "@/engine";
import type { Project } from "@/domain/schema";
import { memberIndex, seatIndex } from "@/store/selectors";

export function describeDiagnostic(d: Diagnostic, project: Project): string {
  const members = memberIndex(project.members);
  const seats = seatIndex(project.layout.rooms);
  const rule = d.ruleId ? project.rules.findIndex((r) => r.id === d.ruleId) : -1;
  const p = d.params as Record<string, unknown>;
  const name = (id: unknown) => (typeof id === "string" ? (members.get(id)?.name ?? id) : "");
  const seat = (id: unknown) => {
    const ref = typeof id === "string" ? seats.get(id) : undefined;
    return ref ? `${ref.room.name} ${ref.seat.label}` : typeof id === "string" ? id : "";
  };
  const names = (ids: unknown) => (Array.isArray(ids) ? ids.slice(0, 5).map(name).join("、") : "");
  return i18n.t(`diag.${d.code}` as never, {
    ns: "seating",
    rule: rule >= 0 ? `#${rule + 1}` : "",
    members: p.members,
    seats: p.seats,
    totalSeats: p.totalSeats,
    people: p.people,
    member: name(p.memberId),
    names: names(p.memberIds),
    seat: seat(p.seatId),
    defaultValue: d.code,
  });
}
