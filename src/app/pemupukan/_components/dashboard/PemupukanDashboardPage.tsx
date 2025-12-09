// src/app/pemupukan/_components/dashboard/PemupukanDashboardPage.tsx
import dynamic from "next/dynamic";
import IkhtisarSection from "./Ikhtisar";
import LogAktivitasSection from "./LogAktivitas";
import { getDashboardData } from "@/app/pemupukan/_services/pemupukanDashboard";
import type { SearchParams } from "@/app/pemupukan/_services/pemupukanFilters";

// Visualisasi biasanya berisi chart berat → bagusnya di-render di client saja
const VisualisasiSection = dynamic(
  () =>
    import(
      "@/app/pemupukan/_components/dashboard/visualisasi/Visualisasi"
    ),
  {
    // ssr: false, // ⚡ hindari SSR untuk komponen chart yang berat
    loading: () => (
      <div className="mt-4 rounded-2xl border border-[--glass-border] bg-[--glass-bg] px-4 py-6 text-xs text-emerald-100/80">
        Memuat visualisasi pemupukan...
      </div>
    ),
  }
);

type PemupukanDashboardPageProps = {
  searchParams?: SearchParams;
};

export default async function PemupukanDashboardPage({
  searchParams,
}: PemupukanDashboardPageProps) {
  // Server side data fetching untuk dashboard (satu sumber kebenaran)
  const {
    tmRows,
    tbmRows,
    tmTbmRows,
    totals,
    aggPupuk,
    headerDates,
    realWindow,
    realCutoffDate,
    hasUserDateFilter,
  } = await getDashboardData(searchParams);

  return (
    <>
      <IkhtisarSection
        totals={totals}
        // nilai harian/besok bisa diisi kemudian dari getDashboardData jika nanti Anda tambahkan
        realisasiHarian={0}
        rencanaBesok={0}
        tanggalHariIni={headerDates.today}
        tanggalBesok={undefined}
      />

      {/* Visualisasi berat dipindahkan ke client via dynamic import */}
      <VisualisasiSection
        barPerKebun={[]}
        aggPupuk={aggPupuk}
        stokVsSisa={[]}
        tmRows={tmRows}
        tbmRows={tbmRows}
        tmTbmRows={tmTbmRows}
        headerDates={headerDates}
        realWindow={realWindow}
        realCutoffDate={realCutoffDate}
        hasUserFilter={hasUserDateFilter}
      />

      <LogAktivitasSection />
    </>
  );
}
