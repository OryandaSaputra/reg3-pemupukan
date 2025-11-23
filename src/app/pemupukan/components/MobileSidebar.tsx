import Image from "next/image";
import { Database, TrendingUp, X as XIcon, Filter as FilterIcon } from "lucide-react";
import Link from "next/link";

export default function MobileSidebar({
  sidebarOpen, setSidebarOpen, setFilterOpen,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  setFilterOpen: (v: boolean) => void;
}) {
  if (!sidebarOpen) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
      <div className="absolute left-0 top-0 h-full w-72 bg-gradient-to-b from-[--ptpn-green-dark] to-[--ptpn-green] text-slate-900 dark:text-slate-100 shadow-xl">
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <Image src="https://www.ptpn4.co.id/build/assets/Logo%20PTPN%20IV-CyWK9qsP.png" alt="Logo PTPN IV Regional III" width={36} height={36} unoptimized className="h-9 w-auto object-contain drop-shadow" />
            <div className="leading-tight">
              <h1 className="text-sm font-semibold">Dashboard Pemupukan</h1>
              <p className="text-[10px] text-slate-100/80">Regional III</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-white/10">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="px-3 py-4 text-sm space-y-1">
          <Link href="/pemupukan" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 transition">
            <Database className="h-4 w-4" /> Home
          </Link>

          {/* Realisasi */}
          <Link href="/pemupukan/realisasi/tambah" onClick={() => setSidebarOpen(false)} className="block px-3 py-1.5 rounded-lg hover:bg-white/10">Tambah Data Realisasi</Link>
          <Link href="/pemupukan/realisasi/tabel" onClick={() => setSidebarOpen(false)} className="block px-3 py-1.5 rounded-lg hover:bg-white/10">Tabel Realisasi</Link>
          {/* BARU */}
          <Link href="/pemupukan/realisasi/riwayat" onClick={() => setSidebarOpen(false)} className="block px-3 py-1.5 rounded-lg hover:bg-white/10">Riwayat Realisasi</Link>

          {/* Rencana */}
          <Link href="/pemupukan/rencana/tambah" onClick={() => setSidebarOpen(false)} className="block px-3 py-1.5 rounded-lg hover:bg-white/10">Tambah Data Rencana</Link>
          <Link href="/pemupukan/rencana/tabel" onClick={() => setSidebarOpen(false)} className="block px-3 py-1.5 rounded-lg hover:bg-white/10">Tabel Rencana</Link>
          {/* BARU */}
          <Link href="/pemupukan/rencana/riwayat" onClick={() => setSidebarOpen(false)} className="block px-3 py-1.5 rounded-lg hover:bg-white/10">Riwayat Rencana</Link>

          <Link href="/pemupukan/komposisi" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10 transition">
            <TrendingUp className="h-4 w-4" /> Komposisi per Jenis
          </Link>

          <button
            onClick={() => { setSidebarOpen(false); setFilterOpen(true); }}
            className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
          >
            <FilterIcon className="h-4 w-4" /> Buka Filter
          </button>
        </nav>
      </div>
    </div>
  );
}
