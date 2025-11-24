"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";
import {
  Database,
  Calendar,
  Factory,
  Filter as FilterIcon,
  ChevronDown,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";

export default function Sidebar({
  navRealOpen,
  setNavRealOpen,
  navRencanaOpen,
  setNavRencanaOpen,
  setFilterOpen,
}: {
  navRealOpen: boolean;
  setNavRealOpen: React.Dispatch<React.SetStateAction<boolean>>;
  navRencanaOpen: boolean;
  setNavRencanaOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setFilterOpen: (v: boolean) => void;
  bestKebun?: { kebun: string; rencana: number; progress: number };
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(false);

  // Begitu URL berubah (halaman baru sudah aktif) → matikan spinner
  useEffect(() => {
    if (loading) {
      setLoading(false);
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigateWithLoading = (href: string) => {
    setLoading(true);
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
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 sticky top-0 self-start h-[100dvh] overflow-y-auto border-r border-slate-200 bg-white">
        {/* HEADER */}
        <div className="h-16 px-4 flex items-center gap-3 border-b border-slate-200">
          <Image
            src="https://www.ptpn4.co.id/build/assets/Logo%20PTPN%20IV-CyWK9qsP.png"
            alt="Logo PTPN IV Regional III"
            width={36}
            height={36}
            unoptimized
            className="h-9 w-auto object-contain"
          />
          <div className="leading-tight">
            <p className="text-[11px] uppercase tracking-wider text-slate-700">
              PT Perkebunan Nusantara IV
            </p>
            <p className="text-[10px] text-slate-500">Regional III</p>
          </div>
        </div>

        {/* BODY = menu + logout di bawah */}
        <div className="flex-1 flex flex-col justify-between">
          {/* MENU */}
          <nav className="px-3 py-4 text-sm space-y-1 text-slate-800">
            {/* Home */}
            <button
              type="button"
              onClick={() => navigateWithLoading("/pemupukan")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition text-left"
            >
              <Database className="h-4 w-4" />
              Home
            </button>

            {/* Realisasi */}
            <button
              type="button"
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 transition"
              onClick={() => setNavRealOpen((s) => !s)}
            >
              <span className="flex items-center gap-2">
                <Factory className="h-4 w-4" /> Realisasi Pemupukan
              </span>
              {navRealOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {navRealOpen && (
              <div className="pl-8 space-y-1">
                <button
                  type="button"
                  onClick={() =>
                    navigateWithLoading("/pemupukan/realisasi/tambah")
                  }
                  className="w-full block px-3 py-1.5 rounded-lg hover:bg-slate-100 text-left"
                >
                  Tambah Data
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigateWithLoading("/pemupukan/realisasi/riwayat")
                  }
                  className="w-full block px-3 py-1.5 rounded-lg hover:bg-slate-100 text-left"
                >
                  Tabel Realisasi
                </button>
              </div>
            )}

            {/* Rencana */}
            <button
              type="button"
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 transition"
              onClick={() => setNavRencanaOpen((s) => !s)}
            >
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Rencana Pemupukan
              </span>
              {navRencanaOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {navRencanaOpen && (
              <div className="pl-8 space-y-1">
                <button
                  type="button"
                  onClick={() =>
                    navigateWithLoading("/pemupukan/rencana/tambah")
                  }
                  className="w-full block px-3 py-1.5 rounded-lg hover:bg-slate-100 text-left"
                >
                  Tambah Data
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigateWithLoading("/pemupukan/rencana/riwayat")
                  }
                  className="w-full block px-3 py-1.5 rounded-lg hover:bg-slate-100 text-left"
                >
                  Tabel Rencana
                </button>
              </div>
            )}

            {/* Buka Filter */}
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            >
              <FilterIcon className="h-4 w-4" /> Buka Filter
            </button>
          </nav>

          {/* LOGOUT – di bawah sidebar */}
          <div className="px-3 pb-4 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-emerald-500 text-emerald-600 font-semibold bg-white hover:bg-emerald-50 transition"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* FULLSCREEN LOADING SPINNER */}
      {loading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-emerald-950/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative flex items-center justify-center">
              {/* Lingkaran luar berputar */}
              <div className="h-24 w-24 rounded-full border-2 border-emerald-500/20 border-t-emerald-300/90 animate-spin" />

              {/* Logo di tengah lingkaran */}
              <div className="absolute h-16 w-16 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-emerald-900/60 overflow-hidden">
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
              <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-emerald-100/90">
                PTPN 4 • DIVISI TANAMAN
              </p>
              <p className="text-sm text-emerald-100/80">
                Memuat Dashboard Pemupukan...
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
