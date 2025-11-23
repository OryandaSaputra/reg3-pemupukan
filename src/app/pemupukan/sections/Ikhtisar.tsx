import SectionHeader from "../components/SectionHeader";
// import ScopeCard from "../components/ScopeCard"; // sudah tidak dipakai
import { Card, CardContent } from "@/components/ui/card";
import StatLine from "../components/StatLine";
import {
  CalendarDays,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

export default function Ikhtisar({
  totals,
  realisasiHarian = 0,
  rencanaBesok = 0,
  tanggalHariIni,
  tanggalBesok,
}: {
  totals: {
    totalRencana: number;
    totalRealisasi: number;
    tmRencana: number;
    tmRealisasi: number;
    tbmRencana: number;
    tbmRealisasi: number;
    bibRencana: number;
    bibRealisasi: number;
    dtmRencana: number;
    dbrRencana: number;
    dtmRealisasi: number;
    dbrRealisasi: number;
  };
  realisasiHarian?: number;
  rencanaBesok?: number;
  tanggalHariIni?: string;
  tanggalBesok?: string;
}) {
  const {
    totalRencana,
    totalRealisasi,
    tmRencana,
    tmRealisasi,
    tbmRencana,
    tbmRealisasi,
    bibRencana,
    bibRealisasi,
    dtmRencana,
    dbrRencana,
    dtmRealisasi,
    dbrRealisasi,
  } = totals;

  const num = (v: number) => v.toLocaleString("id-ID");
  const fmtDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  };

  const labelHarian = `Realisasi Harian${tanggalHariIni ? ` (${fmtDate(tanggalHariIni)})` : ""
    } (Kg)`;
  const labelRencana = `Rencana Besok${tanggalBesok ? ` (${fmtDate(tanggalBesok)})` : ""
    } (Kg)`;

  const pct = rencanaBesok > 0 ? (realisasiHarian / rencanaBesok) * 100 : 0;
  const deltaKg = realisasiHarian - rencanaBesok;

  type Tone = "good" | "warn" | "bad" | "neutral";
  const tone: Tone =
    rencanaBesok <= 0 ? "neutral" : pct >= 100 ? "good" : pct >= 80 ? "warn" : "bad";

  type ToneSpec = {
    ring: string;
    bg: string;
    bar: string;
    text: string;
    strip: string;
    IconMain: LucideIcon;
    IconDeltaUp: LucideIcon;
    IconDeltaDown: LucideIcon;
  };

  const toneMap: Record<Tone, ToneSpec> = {
    good: {
      ring: "ring-emerald-200/70 dark:ring-emerald-900",
      bg: "bg-emerald-50/60 dark:bg-emerald-950/30",
      bar: "bg-emerald-500",
      text: "text-emerald-700 dark:text-emerald-300",
      strip: "bg-emerald-500",
      IconMain: CheckCircle2,
      IconDeltaUp: TrendingUp,
      IconDeltaDown: TrendingDown,
    },
    warn: {
      ring: "ring-amber-200/70 dark:ring-amber-900",
      bg: "bg-amber-50/60 dark:bg-amber-950/30",
      bar: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-300",
      strip: "bg-amber-500",
      IconMain: AlertTriangle,
      IconDeltaUp: TrendingUp,
      IconDeltaDown: TrendingDown,
    },
    bad: {
      ring: "ring-rose-200/70 dark:ring-rose-900",
      bg: "bg-rose-50/60 dark:bg-rose-950/30",
      bar: "bg-rose-500",
      text: "text-rose-700 dark:text-rose-300",
      strip: "bg-rose-500",
      IconMain: TrendingDown,
      IconDeltaUp: TrendingUp,
      IconDeltaDown: TrendingDown,
    },
    neutral: {
      ring: "ring-slate-200/70 dark:ring-slate-800",
      bg: "bg-white/80 dark:bg-slate-900/60",
      bar: "bg-slate-500",
      text: "text-slate-600 dark:text-slate-300",
      strip: "bg-slate-300 dark:bg-slate-700",
      IconMain: CalendarDays,
      IconDeltaUp: TrendingUp,
      IconDeltaDown: TrendingDown,
    },
  };

  const T = toneMap[tone];

  const kpiCardCx =
    "h-full shadow-sm hover:shadow-md transition-shadow rounded-2xl ring-1 " +
    "bg-white/80 dark:bg-slate-900/60 ring-slate-200/60 dark:ring-slate-800";

  // helper: warna progress hijau kalau real >= ren, merah kalau belum tercapai
  const progressClass = (real: number, plan: number) =>
    plan > 0 && real < plan
      ? "text-rose-600 dark:text-rose-400"
      : "text-emerald-700 dark:text-emerald-300";

  const pctProgress = (real: number, plan: number) =>
    plan > 0 ? ((real / plan) * 100).toFixed(2) : "0.00";

  // helper render kartu TM / TBM / Bibitan
  const renderScopeCard = (
    shortLabel: string,
    longLabel: string,
    plan: number,
    real: number,
  ) => (
    <Card className="h-full rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-white/80 dark:bg-slate-900/70 ring-1 ring-slate-200/70 dark:ring-slate-800">
      <CardContent className="pt-4 pb-3 px-4 space-y-3">
        <div>
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-100">
            {shortLabel}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {longLabel}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="space-y-0.5">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Rencana (Kg)
            </div>
            <div className="font-semibold text-slate-800 dark:text-slate-100">
              {num(plan)}
            </div>
          </div>
          <div className="space-y-0.5 text-right">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Realisasi (Kg)
            </div>
            <div className="font-semibold text-slate-800 dark:text-slate-100">
              {num(real)}
            </div>
          </div>
        </div>

        <div
          className={
            "flex items-center justify-between text-xs font-semibold mt-1 " +
            progressClass(real, plan)
          }
        >
          <span>Progress</span>
          <span>{pctProgress(real, plan)}%</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <section className="space-y-4">
      <SectionHeader title="Ikhtisar" desc="Dibagi berdasarkan TM, TBM, dan Bibitan" />

      {/* Row Scope TM / TBM / Bibitan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {renderScopeCard(
          "TM",
          "Tanaman Menghasilkan (TM)",
          tmRencana,
          tmRealisasi,
        )}
        {renderScopeCard(
          "TBM",
          "Tanaman Belum Menghasilkan (TBM)",
          tbmRencana,
          tbmRealisasi,
        )}
        {renderScopeCard(
          "Bibitan",
          "Bibitan",
          bibRencana,
          bibRealisasi,
        )}
      </div>

      {/* 4 KPI cards di bawahnya */}
      <div
        className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        role="region"
        aria-label="Ringkasan KPI"
      >
        {/* Total Rencana */}
        <Card className={kpiCardCx}>
          <CardContent className="pt-4 pb-3">
            <StatLine label="Total Rencana (Kg)" value={num(totalRencana)} />
          </CardContent>
        </Card>

        {/* Total Realisasi */}
        <Card className={kpiCardCx}>
          <CardContent className="pt-4 pb-3">
            <StatLine label="Total Realisasi (Kg)" value={num(totalRealisasi)} />
          </CardContent>
        </Card>

        {/* DTM card TANPA persen progress */}
        <Card className={kpiCardCx}>
          <CardContent className="pt-4 pb-3 space-y-1">
            <div className="text-[11px] font-medium text-slate-500 mb-1">
              DTM (Real / Ren)
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>Realisasi</span>
              <span className="font-medium">{num(dtmRealisasi)} Kg</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>Rencana</span>
              <span className="font-medium">{num(dtmRencana)} Kg</span>
            </div>
          </CardContent>
        </Card>

        {/* DBR card TANPA persen progress */}
        <Card className={kpiCardCx}>
          <CardContent className="pt-4 pb-3 space-y-1">
            <div className="text-[11px] font-medium text-slate-500 mb-1">
              DBR (Real / Ren)
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>Realisasi</span>
              <span className="font-medium">{num(dbrRealisasi)} Kg</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>Rencana</span>
              <span className="font-medium">{num(dbrRencana)} Kg</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
