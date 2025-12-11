// src/app/pemupukan/curah-hujan/page.tsx

import CurahHujanSection from "../_components/dashboard/visualisasi/CurahHujanSection";

export const metadata = {
  title: "Curah Hujan | Dashboard Pemupukan",
};

export default function CurahHujanPage() {
  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-50">
          Curah Hujan
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Visualisasi akumulasi curah hujan harian per kebun berdasarkan data
          hasil import file Excel.
        </p>
      </div>

      {/* Section yang sudah kita buat sebelumnya */}
      <CurahHujanSection />
    </div>
  );
}
