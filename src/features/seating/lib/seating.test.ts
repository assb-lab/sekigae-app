import { describe, expect, it } from "vite-plus/test";
import { createLab, createMember } from "@/domain/factory";
import { makeProject } from "@/test/factories";
import { chipFill, legendItems, legendKeyOf } from "./colors";
import { computeCompositions } from "./composition";
import { nearestSeat, nextSeatInDirection, seatAt, seatPositions } from "./hit";
import { shortName } from "./names";
import { applyDrop, canDrop, ruleDelta } from "./placement";

describe("placement", () => {
  const a = { s1: "m1", s2: "m2" };
  it("assigns, replaces, moves, swaps and unassigns", () => {
    expect(applyDrop(a, "m3", { kind: "seat", seatId: "s3" })).toMatchObject({ kind: "assign" });
    expect(applyDrop(a, "m3", { kind: "seat", seatId: "s1" })).toMatchObject({
      kind: "replace",
      other: "m1",
      assignment: { s1: "m3", s2: "m2" },
    });
    expect(applyDrop(a, "m1", { kind: "seat", seatId: "s3" }).assignment).toEqual({
      s2: "m2",
      s3: "m1",
    });
    expect(applyDrop(a, "m1", { kind: "seat", seatId: "s2" })).toMatchObject({
      kind: "swap",
      assignment: { s1: "m2", s2: "m1" },
    });
    expect(applyDrop(a, "m1", { kind: "tray" }).assignment).toEqual({ s2: "m2" });
    expect(applyDrop(a, "m3", { kind: "tray" }).kind).toBe("none");
  });

  it("respects locks", () => {
    const locks = new Set(["s1"]);
    expect(canDrop(a, locks, "m1", { kind: "seat", seatId: "s3" })).toBe(false);
    expect(canDrop(a, locks, "m2", { kind: "seat", seatId: "s1" })).toBe(false);
    expect(canDrop(a, locks, "m2", { kind: "tray" })).toBe(true);
  });

  it("computes rule deltas", () => {
    const v = (ruleId: string, violation: number, strength: "hard" | "soft" = "hard") => ({
      ruleId,
      strength,
      weight: 1,
      violation,
      score: violation,
      memberIds: [],
      seatIds: [],
    });
    const d = ruleDelta([v("r1", 1), v("r2", 2, "soft")], [v("r1", 0), v("r3", 1)], {
      before: 3,
      after: 1,
    });
    expect(d.created).toEqual(["r3"]);
    expect(d.resolved).toEqual(["r1"]);
    expect(d.hardDelta).toBe(0);
  });
});

describe("hit and keyboard navigation", () => {
  const p = makeProject("small");
  const rooms = p.layout.rooms;
  it("finds seats by world coordinates", () => {
    const first = seatPositions(rooms)[0]!;
    expect(seatAt(rooms, first.x + 0.5, first.y + 0.5)?.seat.id).toBe(first.seat.id);
    expect(seatAt(rooms, -10, -10)).toBeUndefined();
    // 席のすぐ隣（椅子のあたり）でも拾う
    expect(nearestSeat(rooms, first.x - 0.2, first.y + 0.5)?.seat.id).toBe(first.seat.id);
    expect(nearestSeat(rooms, -10, -10)).toBeUndefined();
  });
  it("moves focus in a direction", () => {
    const first = seatPositions(rooms)[0]!;
    const right = nextSeatInDirection(rooms, first.seat.id, "right");
    expect(right).toBeDefined();
    expect(right).not.toBe(first.seat.id);
    expect(nextSeatInDirection(rooms, null, "down")).toBe(first.seat.id);
  });
});

describe("compositions and colors", () => {
  const labs = [
    createLab({ id: "L1", name: "A研", color: "#ff0000" }),
    createLab({ id: "L2", name: "B研", color: "#0000ff" }),
  ];
  const members = [
    createMember({ id: "m1", name: "青木 誠", role: "m1", labId: "L1" }),
    createMember({ id: "m2", name: "Ken Morita", role: "d1", labId: "L2" }),
  ];
  const p = makeProject("small");
  const room = p.layout.rooms[0]!;
  it("measures lab shares and imbalance", () => {
    const c = computeCompositions([room], members, labs, { [room.seats[0]!.id]: "m1" });
    const rc = c.rooms.get(room.id)!;
    expect(rc.total).toBe(1);
    expect(rc.labs[0]).toMatchObject({ labId: "L1", share: 1 });
    expect(rc.imbalance).toBeCloseTo(0.5);
  });
  it("colors chips and builds legends", () => {
    const ctx = { scheme: "light" as const, labs: new Map(labs.map((l) => [l.id, l])) };
    expect(chipFill("lab", members[0]!, ctx)).toBe("#ff0000");
    expect(legendKeyOf("role", members[1]!, ctx)).toBe("role:d1");
    expect(legendItems("lab", members, ctx).map((x) => x.value)).toEqual(["L1", "L2"]);
  });
  it("shortens names", () => {
    expect(shortName("青木 誠")).toBe("青木");
    expect(shortName("Ken Morita")).toBe("Morita");
    expect(shortName("Solo")).toBe("Solo");
  });
});
