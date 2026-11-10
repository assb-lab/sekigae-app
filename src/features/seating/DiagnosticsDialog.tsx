/** 実行できない理由（エンジンの診断）を表示するダイアログ。#118 */
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Diagnostic } from "@/engine";
import { useProjectStore } from "@/store/project";
import { describeDiagnostic } from "./diagnostics";

export function DiagnosticsDialog({
  diagnostics,
  onClose,
}: {
  diagnostics: Diagnostic[] | null;
  onClose: () => void;
}) {
  const { t } = useTranslation("seating");
  const project = useProjectStore((s) => s.project);
  return (
    <Dialog open={!!diagnostics} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="diagnostics-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="text-warning size-5" />
            {t("diag.title")}
          </DialogTitle>
          <DialogDescription>{t("diag.body")}</DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          {(diagnostics ?? []).map((d, i) => (
            <li key={i}>{describeDiagnostic(d, project)}</li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" asChild>
            <Link to="/rules" onClick={onClose}>
              {t("diag.openRules")}
            </Link>
          </Button>
          <Button onClick={onClose}>{t("diag.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
