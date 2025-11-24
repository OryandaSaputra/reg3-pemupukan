import SectionHeader from "../components/SectionHeader";
// import ScopeCard from "../components/ScopeCard"; // sudah tidak dipakai
import { Card, CardContent } from "@/components/ui/card";
import StatLine from "../components/StatLine";

export default function Ikhtisar({
  totals,
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
