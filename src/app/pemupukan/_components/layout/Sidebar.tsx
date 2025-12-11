"use client";

import Image from "next/image";
import { useState, useEffect, memo } from "react";
import {
  Database,
  Calendar,
  Factory,
  Filter as FilterIcon,
  ChevronDown,
  ChevronRight,
  LogOut,
  CloudRain,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";

type SidebarProps = {
  navRealOpen: boolean;
  setNavRealOpen: React.Dispatch<React.SetStateAction<boolean>>;
  navRencanaOpen: boolean;
  setNavRencanaOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setFilterOpen: (v: boolean) => void;
  bestKebun?: { kebun: string; rencana: number; progress: number };
};

function Sidebar({
  navRealOpen,
  setNavRealOpen,
  navRencanaOpen,
  setNavRencanaOpen,
  setFilterOpen,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(false);

  // Begitu URL berubah (halaman baru sudah aktif) → matikan spinner
  useEffect(() => {
    setLoading(false);
  }, [pathname]);

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
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 sticky top-0 self-start h-[100dvh] overflow-y-auto rounded-3xl border border-[--sidebar-border] bg-[--sidebar] text-[--sidebar-foreground] backdrop-blur-2xl shadow-[0_20px_45px_rgba(2,12,6,0.85)]">
        {/* HEADER */}
        <div className="h-16 px-4 flex items-center gap-3 border-b border-white/15 bg-white/5 backdrop-blur-xl">
          <div className="relative h-9 w-9 rounded-2xl bg-white/10 border border-white/35 flex items-center justify-center overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
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
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-100/80">
              PT Perkebunan Nusantara IV
            </p>
            <p className="text-[10px] text-emerald-100/60">Regional III</p>
          </div>
        </div>

        {/* BODY = menu + logout di bawah */}
        <div className="flex-1 flex flex-col justify-between">
          {/* MENU */}
          <nav className="px-3 py-4 text-sm space-y-1 text-emerald-50/90">
            {/* Home */}
            <button
              type="button"
              onClick={() => navigateWithLoading("/pemupukan")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/0 hover:bg-white/10 border border-transparent hover:border-white/20 transition-colors text-left"
            >
              <Database className="h-4 w-4 text-emerald-100/80" />
              <span>Home</span>
            </button>

            {/* Realisasi */}
            <button
              type="button"
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/0 hover:bg-white/10 border border-transparent hover:border-white/20 transition-colors"
              onClick={() => setNavRealOpen((s) => !s)}
            >
              <span className="flex items-center gap-2">
                <Factory className="h-4 w-4 text-emerald-100/80" />{" "}
                <span>Realisasi Pemupukan</span>
              </span>
              {navRealOpen ? (
                <ChevronDown className="h-4 w-4 text-emerald-100/80" />
              ) : (
                <ChevronRight className="h-4 w-4 text-emerald-100/80" />
              )}
            </button>
            {navRealOpen && (
              <div className="pl-8 space-y-1">
                <button
                  type="button"
                  onClick={() =>
                    navigateWithLoading("/pemupukan/realisasi/tambah")
                  }
                  className="w-full block px-3 py-1.5 rounded-lg bg-white/0 hover:bg-white/8 border border-transparent hover:border-white/15 text-left text-emerald-50/85 text-[13px]"
                >
                  Tambah Data
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigateWithLoading("/pemupukan/realisasi/riwayat")
                  }
                  className="w-full block px-3 py-1.5 rounded-lg bg-white/0 hover:bg-white/8 border border-transparent hover:border-white/15 text-left text-emerald-50/85 text-[13px]"
                >
                  Tabel Realisasi
                </button>
              </div>
            )}

            {/* Rencana */}
            <button
              type="button"
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/0 hover:bg-white/10 border border-transparent hover:border-white/20 transition-colors"
              onClick={() => setNavRencanaOpen((s) => !s)}
            >
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-100/80" />{" "}
                <span>Rencana Pemupukan</span>
              </span>
              {navRencanaOpen ? (
                <ChevronDown className="h-4 w-4 text-emerald-100/80" />
              ) : (
                <ChevronRight className="h-4 w-4 text-emerald-100/80" />
              )}
            </button>
            {navRencanaOpen && (
              <div className="pl-8 space-y-1">
                <button
                  type="button"
                  onClick={() =>
                    navigateWithLoading("/pemupukan/rencana/tambah")
                  }
                  className="w-full block px-3 py-1.5 rounded-lg bg-white/0 hover:bg-white/8 border border-transparent hover:border-white/15 text-left text-emerald-50/85 text-[13px]"
                >
                  Tambah Data
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigateWithLoading("/pemupukan/rencana/riwayat")
                  }
                  className="w-full block px-3 py-1.5 rounded-lg bg-white/0 hover:bg-white/8 border border-transparent hover:border-white/15 text-left text-emerald-50/85 text-[13px]"
                >
                  Tabel Rencana
                </button>
              </div>
            )}

            {/* Curah Hujan */}
            <button
              type="button"
              onClick={() => navigateWithLoading("/pemupukan/curah-hujan")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/0 hover:bg-white/10 border border-transparent hover:border-white/20 transition-colors text-left"
            >
              <CloudRain className="h-4 w-4 text-emerald-100/80" />
              <span>Curah Hujan</span>
            </button>


            {/* Buka Filter */}
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-[--glass-border] bg-white/5 text-emerald-50/95 hover:bg-white/10 transition-colors"
            >
              <FilterIcon className="h-4 w-4" /> Buka Filter
            </button>
          </nav>

          {/* LOGOUT – di bawah sidebar */}
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
      </aside>

      {/* FULLSCREEN LOADING SPINNER */}
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

              {/* Logo di tengah lingkaran */}
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

export default memo(Sidebar);
