// src/app/pemupukan/_components/dashboard/Ikhtisar.tsx
import SectionHeader from "../shared/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";

type Totals = {
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

const num = (v: number) => v.toLocaleString("id-ID");

const progressClass = (real: number, plan: number) =>
  plan > 0 && real < plan ? "text-rose-400" : "text-emerald-300";

const pctProgress = (real: number, plan: number) =>
  plan > 0 ? ((real / plan) * 100).toFixed(2) : "0.00";

const deltaClass = (real: number, plan: number) => {
  const diff = real - plan;
  if (diff < 0) return "text-rose-400";
  if (diff > 0) return "text-emerald-300";
  return "text-emerald-100/80";
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
  const pct = plan > 0 ? Math.min((real / plan) * 100, 120) : 0;
  const barWidth = Math.min(pct, 100);
  const isBehind = plan > 0 && real < plan;

  return (
    <div className="w-full mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div
        className={
          "h-full rounded-full transition-all " +
          (isBehind ? "bg-rose-400" : "bg-emerald-400")
        }
        style={{ width: `${barWidth}%` }}
      />
    </div>
  );
};

const kpiCardCx = "rounded-2xl glass-surface overflow-visible";

function ScopeCard({
  shortLabel,
  longLabel,
  plan,
  real,
}: {
  shortLabel: string;
  longLabel: string;
  plan: number;
  real: number;
}) {
  return (
    <Card className="rounded-2xl glass-surface overflow-visible hover:shadow-[0_22px_55px_rgba(3,18,9,0.9)] transition-shadow">
      <CardContent className="pt-4 pb-4 px-5 space-y-3 overflow-visible">
        <div>
          <div className="text-xs font-semibold text-emerald-50/95">
            {shortLabel}
          </div>
          <p className="text-[11px] text-emerald-100/75 mt-0.5">{longLabel}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="space-y-0.5">
            <div className="text-[11px] text-emerald-100/75">
              Rencana (Kg)
            </div>
            <div className="font-semibold text-emerald-50/95 break-words">
              {num(plan)}
            </div>
          </div>
          <div className="space-y-0.5 text-right">
            <div className="text-[11px] text-emerald-100/75">
              Realisasi (Kg)
            </div>
            <div className="font-semibold text-emerald-50/95 break-words">
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
}

export default function Ikhtisar({
  totals,
}: {
  totals: Totals;
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

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Ikhtisar"
        desc="Dibagi berdasarkan TM, TBM, dan Bibitan"
      />

      {/* Row Scope TM / TBM / Bibitan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ScopeCard
          shortLabel="TM"
          longLabel="Tanaman Menghasilkan (TM)"
          plan={tmRencana}
          real={tmRealisasi}
        />
        <ScopeCard
          shortLabel="TBM"
          longLabel="Tanaman Belum Menghasilkan (TBM)"
          plan={tbmRencana}
          real={tbmRealisasi}
        />
        <ScopeCard
          shortLabel="Bibitan"
          longLabel="Bibitan"
          plan={bibRencana}
          real={bibRealisasi}
        />
      </div>

      {/* 4 KPI cards di bawahnya */}
      <div
        className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        role="region"
        aria-label="Ringkasan KPI"
      >
        {/* Total Rencana */}
        <Card className={kpiCardCx}>
          <CardContent className="flex flex-col justify-center items-center py-6 px-4 min-h-[140px]">
            <div className="text-[11px] text-emerald-100/75 text-center mb-1">
              Total Rencana (Kg)
            </div>
            <div className="text-xl font-bold text-emerald-50/95 text-center break-words">
              {num(totalRencana)}
            </div>
          </CardContent>
        </Card>

        {/* Total Realisasi */}
        <Card className={kpiCardCx}>
          <CardContent className="flex flex-col justify-center items-center py-6 px-4 min-h-[140px]">
            <div className="text-[11px] text-emerald-100/75 text-center mb-1">
              Total Realisasi (Kg)
            </div>
            <div className="text-xl font-bold text-emerald-50/95 text-center break-words">
              {num(totalRealisasi)}
            </div>
          </CardContent>
        </Card>

        {/* DTM */}
        <Card className={kpiCardCx}>
          <CardContent className="pt-4 pb-4 px-5 space-y-1.5 min-h-[140px] overflow-visible">
            <div className="text-[11px] font-medium text-emerald-100/80 mb-1">
              DTM (Real / Ren)
            </div>
            <div className="flex items-center justify-between text-xs text-emerald-100/80">
              <span>Realisasi</span>
              <span className="font-medium break-words">
                {num(dtmRealisasi)} Kg
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-emerald-100/80">
              <span>Rencana</span>
              <span className="font-medium break-words">
                {num(dtmRencana)} Kg
              </span>
            </div>

            <ProgressBar real={dtmRealisasi} plan={dtmRencana} />

            <div
              className={
                "flex items-center justify-between mt-0.5 text-[11px] " +
                deltaClass(dtmRealisasi, dtmRencana)
              }
            >
              <span>Selisih</span>
              <span className="font-semibold break-words">
                {formatDelta(dtmRealisasi, dtmRencana)}
              </span>
            </div>
            <div className={"text-[11px] " + deltaClass(dtmRealisasi, dtmRencana)}>
              {deltaLabel(dtmRealisasi, dtmRencana)}
            </div>
          </CardContent>
        </Card>

        {/* DBR */}
        <Card className={kpiCardCx}>
          <CardContent className="pt-4 pb-4 px-5 space-y-1.5 min-h-[140px] overflow-visible">
            <div className="text-[11px] font-medium text-emerald-100/80 mb-1">
              DBR (Real / Ren)
            </div>
            <div className="flex items-center justify-between text-xs text-emerald-100/80">
              <span>Realisasi</span>
              <span className="font-medium break-words">
                {num(dbrRealisasi)} Kg
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-emerald-100/80">
              <span>Rencana</span>
              <span className="font-medium break-words">
                {num(dbrRencana)} Kg
              </span>
            </div>

            <ProgressBar real={dbrRealisasi} plan={dbrRencana} />

            <div
              className={
                "flex items-center justify-between mt-0.5 text-[11px] " +
                deltaClass(dbrRealisasi, dbrRencana)
              }
            >
              <span>Selisih</span>
              <span className="font-semibold break-words">
                {formatDelta(dbrRealisasi, dbrRencana)}
              </span>
            </div>
            <div className={"text-[11px] " + deltaClass(dbrRealisasi, dbrRencana)}>
              {deltaLabel(dbrRealisasi, dbrRencana)}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
