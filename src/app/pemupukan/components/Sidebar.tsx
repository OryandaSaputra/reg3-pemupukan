"use client";

import Image from "next/image";
import React from "react";
import {
  Database,
  Calendar,
  Factory,
  Filter as FilterIcon,
  ChevronDown,
  ChevronRight,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

  const handleLogout = () => {
    // Kalau ada data di localStorage yang mau dibersihkan, lakukan di sini
    if (typeof window !== "undefined") {
      localStorage.removeItem("ptpn5-username");
    }

    // Arahkan ke halaman konfirmasi logout
    router.push("/logout?from=/pemupukan");
  };

  return (
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
          <Link
            href="/pemupukan"
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition"
          >
            <Database className="h-4 w-4" /> Home
          </Link>

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
              <Link
                href="/pemupukan/realisasi/tambah"
                className="block px-3 py-1.5 rounded-lg hover:bg-slate-100"
              >
                Tambah Data
              </Link>
              <Link
                href="/pemupukan/realisasi/riwayat"
                className="block px-3 py-1.5 rounded-lg hover:bg-slate-100"
              >
                Tabel Realisasi
              </Link>
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
              <Link
                href="/pemupukan/rencana/tambah"
                className="block px-3 py-1.5 rounded-lg hover:bg-slate-100"
              >
                Tambah Data
              </Link>
              <Link
                href="/pemupukan/rencana/riwayat"
                className="block px-3 py-1.5 rounded-lg hover:bg-slate-100"
              >
                Tabel Rencana
              </Link>
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
  );
}
