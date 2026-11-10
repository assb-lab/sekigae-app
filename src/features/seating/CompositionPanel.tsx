/** 全部屋の研究室構成の比較（右パネル下）。#160 */
import { useTranslation } from "react-i18next";
import type { ID, Lab, Room } from "@/domain/schema";
import { formatPercent } from "@/lib/format";
import type { Compositions } from "./lib/composition";

export function CompositionPanel({
  rooms,
  comps,
  labs,
}: {
  rooms: Room[];
  comps: Compositions;
  labs: ReadonlyMap<ID, Lab>;
}) {
  const { t, i18n } = useTranslation("seating");
  if (!labs.size) return null;
  return (
    <section className="border-t px-3 py-2" data-testid="composition-panel">
      <h3 className="text-muted-foreground mb-2 text-xs font-semibold">{t("composition.title")}</h3>
      <ul className="space-y-1.5">
        {[{ id: "__all__", name: t("composition.overall") }, ...rooms].map((r) => {
          const shares =
            r.id === "__all__"
              ? comps.overall.map((o) => ({ labId: o.labId, count: o.count, share: o.share }))
              : (comps.rooms.get(r.id)?.labs ?? []);
          const imbalance = r.id === "__all__" ? 0 : (comps.rooms.get(r.id)?.imbalance ?? 0);
          return (
            <li key={r.id} className="text-xs">
              <div className="mb-0.5 flex justify-between">
                <span className="truncate">{r.name}</span>
                {r.id !== "__all__" && (
                  <span className={imbalance > 0.35 ? "text-warning" : "text-muted-foreground"}>
                    {t("composition.imbalance", { value: formatPercent(imbalance, i18n.language) })}
                  </span>
                )}
              </div>
              <div className="bg-muted flex h-2.5 overflow-hidden rounded-full">
                {shares.map((s) => {
                  const lab = s.labId ? labs.get(s.labId) : undefined;
                  return (
                    <div
                      key={s.labId ?? "none"}
                      style={{ width: `${s.share * 100}%`, background: lab?.color ?? "#94a3b8" }}
                      className="transition-[width] duration-500"
                      title={`${lab?.name ?? "—"}: ${s.count} (${formatPercent(s.share, i18n.language)})`}
                    />
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
