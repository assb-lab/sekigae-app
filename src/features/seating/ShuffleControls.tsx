/** シャッフル: 範囲・シード（表示/コピー/再現）・進捗/中断・ロック管理。#117 #118 #119 */
import { Copy, Dices, Loader2, Lock, LockOpen, Pin, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SeatPlan } from "@/domain/schema";
import type { SolveScope } from "@/engine";
import { formatSeed, parseSeed } from "@/lib/rng";
import { isEditableTarget } from "@/lib/keyboard";
import { useRooms } from "@/store/selectors";
import { locksToPinRules, setLocked } from "./actions";
import { useSeatingUi } from "./seatingStore";
import type { SeatingSolver } from "./useSeatingSolver";

type ScopeKind = "all" | "rooms" | "unassignedOnly";

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pts = values
    .map(
      (v, i) => `${(i / (values.length - 1)) * 60},${16 - ((v - min) / (max - min || 1)) * 14 - 1}`,
    )
    .join(" ");
  return (
    <svg viewBox="0 0 60 16" className="h-4 w-14" aria-hidden>
      <polyline points={pts} fill="none" stroke="var(--primary)" strokeWidth={1.4} />
    </svg>
  );
}

export function ShuffleControls({ solver, plan }: { solver: SeatingSolver; plan: SeatPlan }) {
  const { t } = useTranslation("seating");
  const rooms = useRooms();
  const selectedRoomIds = useSeatingUi((s) => s.selectedRoomIds);
  const toggleRoom = useSeatingUi((s) => s.toggleRoom);
  const presets = useSeatingUi((s) => s.presets);
  const [scope, setScope] = useState<ScopeKind>("all");
  const [seedText, setSeedText] = useState("");
  const running = solver.status === "running";

  const scopeValue = (): SolveScope =>
    scope === "rooms" && selectedRoomIds.length
      ? { kind: "rooms", roomIds: selectedRoomIds }
      : scope === "unassignedOnly"
        ? { kind: "unassignedOnly" }
        : { kind: "all" };

  const shuffle = (seed?: number) =>
    void solver.run({ presets: presets.length ? presets : ["random"], scope: scopeValue(), seed });

  // Shift+S でシャッフル
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.shiftKey &&
        e.key.toLowerCase() === "s" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !isEditableTarget(e.target)
      ) {
        e.preventDefault();
        if (!running) shuffle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const seed = plan.seed !== undefined ? formatSeed(plan.seed) : null;

  return (
    <div className="flex flex-wrap items-center gap-1.5" data-tour="seating-shuffle">
      {running ? (
        <Button size="sm" variant="secondary" onClick={solver.cancel} data-testid="cancel-shuffle">
          <Loader2 className="animate-spin" />
          {t("shuffle.running")}
          <Square className="size-3" />
        </Button>
      ) : (
        <Button size="sm" onClick={() => shuffle()} data-testid="shuffle" className="shadow-sm">
          <Dices />
          {t("shuffle.button")}
        </Button>
      )}
      {running && <Sparkline values={solver.trail} />}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="text-xs" data-testid="shuffle-scope">
            {t(`shuffle.scope.${scope}`)}
            {scope === "rooms" && selectedRoomIds.length > 0 && ` (${selectedRoomIds.length})`}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>{t("shuffle.scope.label")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={scope} onValueChange={(v) => setScope(v as ScopeKind)}>
            {(["all", "rooms", "unassignedOnly"] as const).map((k) => (
              <DropdownMenuRadioItem key={k} value={k}>
                {t(`shuffle.scope.${k}`)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          {scope === "rooms" && (
            <>
              <DropdownMenuSeparator />
              {rooms.map((r) => (
                <DropdownMenuCheckboxItem
                  key={r.id}
                  checked={selectedRoomIds.includes(r.id)}
                  onCheckedChange={() => toggleRoom(r.id)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {r.name}
                </DropdownMenuCheckboxItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost" className="font-mono text-xs" data-testid="seed-button">
            {t("shuffle.seed")}: {seed ?? "—"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-2" align="start">
          <p className="text-muted-foreground text-xs">{t("shuffle.seedHelp")}</p>
          {seed && (
            <Button
              size="sm"
              variant="outline"
              className="w-full font-mono"
              onClick={() => {
                void navigator.clipboard?.writeText(seed);
                toast.success(t("shuffle.copied"));
              }}
            >
              <Copy />
              {seed}
            </Button>
          )}
          <form
            className="flex gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              const s = parseSeed(seedText);
              if (s === null) return void toast.error(t("shuffle.invalidSeed"));
              shuffle(s);
            }}
          >
            <Input
              value={seedText}
              onChange={(e) => setSeedText(e.target.value)}
              placeholder="ABC2345"
              className="h-8 font-mono uppercase"
              data-testid="seed-input"
            />
            <Button size="sm" type="submit" data-testid="seed-run">
              {t("shuffle.reproduce")}
            </Button>
          </form>
          {solver.status === "done" && (
            <p className="text-muted-foreground text-[11px]">{t("shuffle.reproNote")}</p>
          )}
        </PopoverContent>
      </Popover>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="text-xs" data-testid="locks-menu">
            <Lock className="size-3.5" />
            {plan.locks.length}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>{t("lock.title", { count: plan.locks.length })}</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setLocked(Object.keys(plan.assignment), true)}>
            <Lock />
            {t("lock.lockAll")}
          </DropdownMenuItem>
          {rooms.map((r) => (
            <DropdownMenuItem
              key={r.id}
              onSelect={() =>
                setLocked(
                  r.seats.filter((s) => plan.assignment[s.id]).map((s) => s.id),
                  true,
                )
              }
            >
              <Lock />
              {t("lock.lockRoom", { room: r.name })}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onSelect={() => setLocked(plan.locks, false)} data-testid="unlock-all">
            <LockOpen />
            {t("lock.unlockAll")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              const n = locksToPinRules();
              toast.success(t("lock.toRulesDone", { count: n }));
            }}
            disabled={!plan.locks.length}
          >
            <Pin />
            {t("lock.toRules")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
