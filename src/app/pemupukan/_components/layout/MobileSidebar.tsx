"use client";

import { useEffect, useState, memo } from "react";
import Image from "next/image";
import {
  Database,
  TrendingUp,
  X as XIcon,
  Filter as FilterIcon,
  Calendar,
  Factory,
  LogOut,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";

type MobileSidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  setFilterOpen: (v: boolean) => void;
};

function MobileSidebar({
  sidebarOpen,
  setSidebarOpen,
  setFilterOpen,
}: MobileSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  // Matikan spinner ketika route berubah (halaman sudah load)
  useEffect(() => {
    setLoading(false);
  }, [pathname]);

  if (!sidebarOpen) return null;

  const navigateWithLoading = (href: string) => {
    setLoading(true);
    setSidebarOpen(false);
    router.push(href);
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ptpn5-username");
    }
    navigateWithLoading("/logout?from=/pemupukan");
  };

  return (
    <>
      <div className="fixed inset-0 z-50 lg:hidden">
        {/* backdrop */}
        <div
          className="absolute inset-0 bg-black/55 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />

        {/* panel */}
        <div className="absolute left-0 top-0 h-full w-72 bg-[--sidebar] text-[--sidebar-foreground] shadow-[0_26px_55px_rgba(0,0,0,0.9)] border-r border-[--sidebar-border] flex flex-col rounded-r-3xl backdrop-blur-2xl overflow-hidden">
          {/* Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-white/15 bg-white/5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 rounded-2xl bg-white/10 border border-white/35 flex items-center justify-center overflow-hidden shadow-[0_10px_25px_rgba(0,0,0,0.45)]">
                <Image
                  src="https://www.ptpn4.co.id/build/assets/Logo%20PTPN%20IV-CyWK9qsP.png"
                  alt="Logo PTPN IV Regional III"
                  width={36}
                  height={36}
                  unoptimized
                  className="h-8 w-auto object-contain"
                />
              </div>
              <div className="leading-tight">
                <h1 className="text-[11px] uppercase tracking-[0.2em] text-emerald-100/80">
                  PT Perkebunan Nusantara IV
                </h1>
                <p className="text-[10px] text-emerald-100/60">
                  Regional III
                </p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg bg-white/0 hover:bg-white/10 border border-transparent hover:border-white/25 transition-colors"
            >
              <XIcon className="h-5 w-5 text-emerald-50/80" />
            </button>
          </div>

          {/* Body = menu + logout */}
          <div className="flex-1 flex flex-col justify-between">
            <nav className="px-3 py-4 text-sm space-y-1 text-emerald-50/90">
              {/* Home */}
              <button
                type="button"
                onClick={() => navigateWithLoading("/pemupukan")}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/0 hover:bg-white/10 border border-transparent hover:border-white/20 transition-colors text-left"
              >
                <Database className="h-4 w-4 text-emerald-100/80" />
                Home
              </button>

              {/* Section Realisasi */}
              <p className="mt-3 mb-1 px-3 text-[11px] font-semibold tracking-wide text-emerald-200/70 uppercase">
                Realisasi Pemupukan
              </p>

              <button
                type="button"
                onClick={() =>
                  navigateWithLoading("/pemupukan/realisasi/tambah")
                }
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/0 hover:bg-white/10 border border-transparent hover:border-white/20 text-left text-[13px]"
              >
                <Factory className="h-4 w-4 text-emerald-200/80" />
                <span>Tambah Data</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigateWithLoading("/pemupukan/realisasi/riwayat")
                }
                className="w-full px-3 py-1.5 rounded-lg bg-white/0 hover:bg-white/10 border border-transparent hover:border-white/20 text-left text-[13px]"
              >
                Tabel Realisasi
              </button>

              {/* Section Rencana */}
              <p className="mt-3 mb-1 px-3 text-[11px] font-semibold tracking-wide text-emerald-200/70 uppercase">
                Rencana Pemupukan
              </p>

              <button
                type="button"
                onClick={() =>
                  navigateWithLoading("/pemupukan/rencana/tambah")
                }
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/0 hover:bg-white/10 border border-transparent hover:border-white/20 text-left text-[13px]"
              >
                <Calendar className="h-4 w-4 text-emerald-200/80" />
                <span>Tambah Data</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigateWithLoading("/pemupukan/rencana/riwayat")
                }
                className="w-full px-3 py-1.5 rounded-lg bg-white/0 hover:bg-white/10 border border-transparent hover:border-white/20 text-left text-[13px]"
              >
                Tabel Rencana
              </button>

              {/* Komposisi per Jenis */}
              <button
                type="button"
                onClick={() => navigateWithLoading("/pemupukan/komposisi")}
                className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/0 hover:bg-white/10 border border-transparent hover:border-white/20 transition-colors text-left"
              >
                <TrendingUp className="h-4 w-4 text-emerald-100/80" />
                Komposisi per Jenis
              </button>

              {/* Buka Filter */}
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  setFilterOpen(true);
                }}
                className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-[--glass-border] text-emerald-50/95 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <FilterIcon className="h-4 w-4" /> Buka Filter
              </button>
            </nav>

            {/* Logout */}
            <div className="px-3 pb-4 pt-2 border-t border-white/15 bg-white/0 backdrop-blur-xl">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-emerald-300/90 text-emerald-50 font-semibold bg-gradient-to-r from-emerald-500/60 via-emerald-600/70 to-emerald-500/60 hover:from-emerald-400/70 hover:via-emerald-500/80 hover:to-emerald-400/70 shadow-[0_14px_35px_rgba(4,120,87,0.65)] transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Spinner overlay */}
      {loading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-2xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative flex items-center justify-center">
              {/* Lingkaran luar berputar */}
              <div className="h-24 w-24 rounded-full border-2 border-emerald-400/25 border-t-emerald-200/95 animate-spin" />
              {/* Logo di tengah */}
              <div className="absolute h-16 w-16 rounded-2xl bg-white/90 flex items-center justify-center shadow-[0_18px_45px_rgba(6,40,18,0.8)] backdrop-blur-xl overflow-hidden border border-emerald-100/80">
                <Image
                  src="https://www.ptpn4.co.id/build/assets/Logo%20PTPN%20IV-CyWK9qsP.png"
                  alt="PTPN 4"
                  fill
                  unoptimized
                  className="object-contain p-1.5"
                />
              </div>
            </div>

            <div className="text-center space-y-1">
              <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-emerald-50/90">
                PTPN 4 • DIVISI TANAMAN
              </p>
              <p className="text-sm text-emerald-50/80">
                Memuat Dashboard Pemupukan...
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

export default memo(MobileSidebar);
