import { describe, expect, it } from "vite-plus/test";
import { createRoom } from "../factory";
import { roomSchema, type Seat } from "../schema";
import { computeAdjacency } from "./adjacency";
import { computeRoomDepth } from "./depth";
import { resizeRoom, seatAt } from "./room";
import {
  MAX_SEAT_SPAN,
  seatCells,
  seatCenter,
  seatCovers,
  seatSize,
  seatSpan,
  seatsOverlap,
} from "./seat";

const seat = (
  id: string,
  x: number,
  y: number,
  facing: Seat["facing"] = "n",
  span?: number,
): Seat => ({
  id,
  x,
  y,
  facing,
  label: id,
  tags: [],
  ...(span ? { span } : {}),
});

describe("seat footprint", () => {
  it("defaults to 1×1 and clamps span", () => {
    expect(seatSpan({})).toBe(1);
    expect(seatSpan({ span: 0 })).toBe(1);
    expect(seatSpan({ span: 99 })).toBe(MAX_SEAT_SPAN);
    expect(seatSize(seat("a", 0, 0))).toEqual({ w: 1, h: 1 });
  });

  it("extends sideways from the sitter: horizontal for n/s, vertical for e/w", () => {
    expect(seatSize(seat("a", 0, 0, "n", 3))).toEqual({ w: 3, h: 1 });
    expect(seatSize(seat("a", 0, 0, "s", 2))).toEqual({ w: 2, h: 1 });
    expect(seatSize(seat("a", 0, 0, "e", 3))).toEqual({ w: 1, h: 3 });
    expect(seatCells(seat("a", 1, 2, "w", 2))).toEqual([
      { x: 1, y: 2 },
      { x: 1, y: 3 },
    ]);
    expect(seatCenter(seat("a", 1, 0, "n", 3))).toEqual({ x: 2.5, y: 0.5 });
    expect(seatCovers(seat("a", 1, 0, "n", 3), 3, 0)).toBe(true);
    expect(seatCovers(seat("a", 1, 0, "n", 3), 4, 0)).toBe(false);
  });

  it("detects overlap between footprints", () => {
    expect(seatsOverlap(seat("a", 0, 0, "n", 3), seat("b", 2, 0))).toBe(true);
    expect(seatsOverlap(seat("a", 0, 0, "n", 3), seat("b", 3, 0))).toBe(false);
    expect(seatsOverlap(seat("a", 0, 0, "e", 2), seat("b", 0, 1))).toBe(true);
  });

  it("finds wide seats from any covered cell", () => {
    const room = createRoom({
      name: "A",
      width: 5,
      height: 3,
      seats: [seat("boss", 1, 0, "s", 3)],
    });
    expect(seatAt(room, 3, 0)?.id).toBe("boss");
    expect(seatAt(room, 4, 0)).toBeUndefined();
  });
});

describe("wide seats in derived geometry", () => {
  it("counts any covered cell for adjacency", () => {
    // 1×3 の机の右端に隣接する席、下に隣接する席
    const room = createRoom({
      name: "A",
      width: 5,
      height: 3,
      seats: [
        seat("boss", 0, 0, "s", 3),
        seat("right", 3, 0),
        seat("below", 2, 1),
        seat("far", 4, 2),
      ],
    });
    const adj4 = computeAdjacency([room], 4);
    expect(adj4.get("boss")).toEqual(new Set(["right", "below"]));
    expect(adj4.get("right")!.has("boss")).toBe(true);
    expect(adj4.get("boss")!.has("boss")).toBe(false);
    expect(computeAdjacency([room], 8).get("far")).toEqual(new Set());
  });

  it("blocks all covered cells for depth and uses the closest one", () => {
    const room = createRoom({
      name: "A",
      width: 5,
      height: 3,
      seats: [seat("boss", 1, 1, "n", 3)],
      entrances: [{ id: "e", x: 0, y: 2, side: "s" }],
    });
    const d = computeRoomDepth(room);
    // 机の左端 (1,1) は入口 (0,2) から 2 歩
    expect(d.seats.get("boss")!.dist).toBe(2);
    expect(d.cells[1 * 5 + 2]).toBeGreaterThan(0);
  });

  it("drops wide seats that no longer fit after resizing", () => {
    const room = createRoom({
      name: "A",
      width: 5,
      height: 2,
      seats: [seat("boss", 2, 0, "n", 3)],
    });
    expect(resizeRoom(room, 5, 2).seats).toHaveLength(1);
    expect(resizeRoom(room, 4, 2).seats).toHaveLength(0);
  });

  it("validates footprints in the schema", () => {
    const ok = createRoom({ name: "A", width: 3, height: 1, seats: [seat("a", 0, 0, "n", 3)] });
    expect(roomSchema.safeParse(ok).success).toBe(true);
    const out = createRoom({ name: "A", width: 3, height: 1, seats: [seat("a", 1, 0, "n", 3)] });
    expect(roomSchema.safeParse(out).success).toBe(false);
    const legacy = createRoom({ name: "A", width: 1, height: 1, seats: [seat("a", 0, 0)] });
    const parsed = roomSchema.parse(legacy);
    expect(parsed.seats[0]!.span).toBeUndefined();
  });
});
