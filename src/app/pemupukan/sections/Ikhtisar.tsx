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

  // warna progress hijau kalau real >= ren, merah kalau belum tercapai
  const progressClass = (real: number, plan: number) =>
    plan > 0 && real < plan
      ? "text-rose-600 dark:text-rose-400"
      : "text-emerald-700 dark:text-emerald-300";

  const pctProgress = (real: number, plan: number) =>
    plan > 0 ? ((real / plan) * 100).toFixed(2) : "0.00";

  const deltaClass = (real: number, plan: number) => {
    const diff = real - plan;
    if (diff < 0) return "text-rose-600 dark:text-rose-400";
    if (diff > 0) return "text-emerald-700 dark:text-emerald-300";
    return "text-slate-600 dark:text-slate-300";
  };

  const deltaLabel = (real: number, plan: number) => {
    const diff = real - plan;
    if (plan === 0 && real === 0) return "Belum ada rencana dan realisasi.";
    if (plan === 0 && real > 0) return "Realisasi tanpa rencana.";
    if (diff < 0) return "Belum tercapai.";
    if (diff > 0) return "Melebihi rencana.";
    return "Sesuai rencana.";
  };

  const formatDelta = (real: number, plan: number) => {
    const diff = real - plan;
    if (diff === 0) return "0 Kg";
    const sign = diff > 0 ? "+" : "-";
    return `${sign}${num(Math.abs(diff))} Kg`;
  };

  const ProgressBar = ({ real, plan }: { real: number; plan: number }) => {
    const pct =
      plan > 0 ? Math.min((real / plan) * 100, 120) : 0; // allow sedikit >100% untuk over-achieve
    const barWidth = Math.min(pct, 100); // visual bar max 100%
    const isBehind = plan > 0 && real < plan;

    return (
      <div className="w-full mt-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={
            "h-full rounded-full transition-all " +
            (isBehind
              ? "bg-rose-500 dark:bg-rose-400"
              : "bg-emerald-500 dark:bg-emerald-400")
          }
          style={{ width: `${barWidth}%` }}
        />
      </div>
    );
  };

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

        <div className="space-y-1 mt-1 text-xs">
          <div
            className={
              "flex items-center justify-between font-semibold " +
              progressClass(real, plan)
            }
          >
            <span>Progress</span>
            <span>{pctProgress(real, plan)}%</span>
          </div>

          <ProgressBar real={real} plan={plan} />

          <div
            className={
              "flex items-center justify-between text-[11px] " +
              deltaClass(real, plan)
            }
          >
            <span>Selisih</span>
            <span className="font-semibold">{formatDelta(real, plan)}</span>
          </div>

          <div className={"text-[11px] " + deltaClass(real, plan)}>
            {deltaLabel(real, plan)}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Ikhtisar"
        desc="Dibagi berdasarkan TM, TBM, dan Bibitan"
      />

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
        {renderScopeCard("Bibitan", "Bibitan", bibRencana, bibRealisasi)}
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
            <StatLine
              label="Total Realisasi (Kg)"
              value={num(totalRealisasi)}
            />
          </CardContent>
        </Card>

        {/* DTM card dengan progress & delta */}
        <Card className={kpiCardCx}>
          <CardContent className="pt-4 pb-3 space-y-1.5">
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

            <ProgressBar real={dtmRealisasi} plan={dtmRencana} />

            <div
              className={
                "flex items-center justify-between mt-0.5 text-[11px] " +
                deltaClass(dtmRealisasi, dtmRencana)
              }
            >
              <span>Selisih</span>
              <span className="font-semibold">
                {formatDelta(dtmRealisasi, dtmRencana)}
              </span>
            </div>
            <div
              className={
                "text-[11px] " + deltaClass(dtmRealisasi, dtmRencana)
              }
            >
              {deltaLabel(dtmRealisasi, dtmRencana)}
            </div>
          </CardContent>
        </Card>

        {/* DBR card dengan progress & delta */}
        <Card className={kpiCardCx}>
          <CardContent className="pt-4 pb-3 space-y-1.5">
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

            <ProgressBar real={dbrRealisasi} plan={dbrRencana} />

            <div
              className={
                "flex items-center justify-between mt-0.5 text-[11px] " +
                deltaClass(dbrRealisasi, dbrRencana)
              }
            >
              <span>Selisih</span>
              <span className="font-semibold">
                {formatDelta(dbrRealisasi, dbrRencana)}
              </span>
            </div>
            <div
              className={
                "text-[11px] " + deltaClass(dbrRealisasi, dbrRencana)
              }
            >
              {deltaLabel(dbrRealisasi, dbrRencana)}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
