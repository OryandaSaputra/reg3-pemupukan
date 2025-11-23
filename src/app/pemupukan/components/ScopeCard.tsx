import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatLine from "./StatLine";
import { Factory } from "lucide-react";

export default function ScopeCard({
  scope, rencana, realisasi, icon,
}: { scope: "TM" | "TBM" | "Bibitan"; rencana: number; realisasi: number; icon?: React.ReactNode; }) {
  const progress = rencana ? (realisasi / rencana) * 100 : 0;
  return (
    <Card className="bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-[13px] flex items-center gap-2">
          <span>{scope}</span>
          <span className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#00A45A] to-[#006B3F] text-white">
            {icon ?? <Factory className="h-4 w-4" />}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <StatLine label="Realisasi (Kg)" value={realisasi.toLocaleString("id-ID")} />
        <StatLine label="Rencana (Kg)" value={rencana.toLocaleString("id-ID")} />
        <StatLine label="Progress" value={`${progress.toFixed(1)}%`} />
      </CardContent>
    </Card>
  );
}
