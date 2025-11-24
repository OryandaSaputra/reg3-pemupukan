"use client";

import React, { useEffect, useState } from "react";
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

export default function MobileSidebar({
  sidebarOpen,
  setSidebarOpen,
  setFilterOpen,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  setFilterOpen: (v: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  // Matikan spinner ketika route berubah (halaman sudah load)
  useEffect(() => {
    if (loading) {
      setLoading(false);
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

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
          className="absolute inset-0 bg-black/40"
          onClick={() => setSidebarOpen(false)}
        />

        {/* panel */}
        <div className="absolute left-0 top-0 h-full w-72 bg-white text-slate-900 shadow-xl border-r border-slate-200 flex flex-col">
          {/* Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 bg-white/95">
            <div className="flex items-center gap-3">
              <Image
                src="https://www.ptpn4.co.id/build/assets/Logo%20PTPN%20IV-CyWK9qsP.png"
                alt="Logo PTPN IV Regional III"
                width={36}
                height={36}
                unoptimized
                className="h-9 w-auto object-contain"
              />
              <div className="leading-tight">
                <h1 className="text-[11px] uppercase tracking-wider text-slate-700">
                  PT Perkebunan Nusantara IV
                </h1>
                <p className="text-[10px] text-slate-500">Regional III</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-slate-100"
            >
              <XIcon className="h-5 w-5 text-slate-600" />
            </button>
          </div>

          {/* Body = menu + logout */}
          <div className="flex-1 flex flex-col justify-between">
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

              {/* Section Realisasi */}
              <p className="mt-3 mb-1 px-3 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                Realisasi Pemupukan
              </p>

              <button
                type="button"
                onClick={() =>
                  navigateWithLoading("/pemupukan/realisasi/tambah")
                }
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 text-left"
              >
                <Factory className="h-4 w-4 text-slate-500" />
                <span>Tambah Data</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigateWithLoading("/pemupukan/realisasi/riwayat")
                }
                className="w-full px-3 py-1.5 rounded-lg hover:bg-slate-100 text-left"
              >
                Tabel Realisasi
              </button>

              {/* Section Rencana */}
              <p className="mt-3 mb-1 px-3 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                Rencana Pemupukan
              </p>

              <button
                type="button"
                onClick={() =>
                  navigateWithLoading("/pemupukan/rencana/tambah")
                }
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 text-left"
              >
                <Calendar className="h-4 w-4 text-slate-500" />
                <span>Tambah Data</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigateWithLoading("/pemupukan/rencana/riwayat")
                }
                className="w-full px-3 py-1.5 rounded-lg hover:bg-slate-100 text-left"
              >
                Tabel Rencana
              </button>

              {/* Komposisi per Jenis */}
              <button
                type="button"
                onClick={() => navigateWithLoading("/pemupukan/komposisi")}
                className="mt-3 w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition text-left"
              >
                <TrendingUp className="h-4 w-4" />
                Komposisi per Jenis
              </button>

              {/* Buka Filter */}
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  setFilterOpen(true);
                }}
                className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
              >
                <FilterIcon className="h-4 w-4" /> Buka Filter
              </button>
            </nav>

            {/* Logout */}
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
        </div>
      </div>

      {/* Spinner overlay */}
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
              {/* Logo di tengah */}
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
