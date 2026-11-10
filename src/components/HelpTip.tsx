/** 用語の説明を出す小さな (?) ボタン（クリック / フォーカスでポップオーバー）。#144 */
import { CircleHelp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type GlossaryKey = "strength" | "weight" | "depth" | "seed" | "lock" | "condition";

export function HelpTip({ term, className }: { term: GlossaryKey; className?: string }) {
  const { t } = useTranslation();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "text-muted-foreground hover:text-foreground inline-flex size-5 items-center justify-center rounded-full",
            className,
          )}
          aria-label={t("glossary.ariaLabel", { term: t(`glossary.${term}.title`) })}
          data-testid={`help-${term}`}
        >
          <CircleHelp className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-sm" side="top">
        <p className="mb-1 font-semibold">{t(`glossary.${term}.title`)}</p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {t(`glossary.${term}.body`)}
        </p>
      </PopoverContent>
    </Popover>
  );
}
