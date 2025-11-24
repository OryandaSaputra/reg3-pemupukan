// src/app/logout/page.tsx
"use client";

import React, { Suspense, useState } from "react";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogOut, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

function LogoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // jika ada ?from=/xxx akan dikembalikan ke sana ketika batal
  const from = searchParams.get("from") || "/pemupukan";

  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    // kalau mau clear localStorage lain, tambahkan di sini
    // localStorage.removeItem("ptpn4-username");

    setLoading(true);

    await signOut({
      callbackUrl: "/login",
      redirect: true,
    });

    // tidak perlu setLoading(false) karena akan redirect & unmount
  };

  const handleCancel = () => {
    if (loading) return; // cegah klik saat sedang logout
    router.push(from);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 px-4 relative">
      <motion.div
        className="max-w-md w-full space-y-4 text-emerald-50"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header kecil */}
        <motion.div
          className="flex items-center gap-2 text-xs text-emerald-100/80"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50">
            <LogOut className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium tracking-wide">Konfirmasi Logout</span>
            <span className="text-[11px] text-emerald-100/70">
              Anda akan keluar dari Dashboard Pemupukan Regional III
            </span>
          </div>
        </motion.div>

        {/* Card utama */}
        <motion.div
          className="bg-emerald-900/40 rounded-2xl border border-emerald-500/30 shadow-xl shadow-emerald-900/40 p-5 backdrop-blur-md"
          initial={{ opacity: 0, y: 10, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.18 }}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <div className="h-10 w-10 rounded-full bg-rose-500/15 border border-rose-400/60 flex items-center justify-center">
                <LogOut className="h-5 w-5 text-rose-300" />
              </div>
            </div>

            <div className="flex-1 space-y-1.5">
              <h1 className="text-base font-semibold tracking-wide text-emerald-50">
                Yakin ingin logout?
              </h1>
              <p className="text-xs leading-snug text-emerald-100/80">
                Sesi Anda pada sistem pemupukan akan diakhiri. Untuk mengakses kembali dashboard,
                Anda perlu login ulang menggunakan akun yang sama.
              </p>

              <div className="mt-3 rounded-lg bg-emerald-950/40 border border-emerald-700/40 px-3 py-2">
                <p className="text-[11px] text-emerald-100/75 leading-snug">
                  <span className="font-medium text-emerald-200">Catatan:</span> Pastikan tidak
                  ada proses input atau impor data yang belum tersimpan sebelum Anda logout.
                </p>
              </div>
            </div>
          </div>

          {/* Tombol aksi */}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium rounded-xl px-3 py-2.5 bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-900/40 border border-rose-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <LogOut className="h-4 w-4" />
              <span>{loading ? "Sedang logout..." : "Ya, logout sekarang"}</span>
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium rounded-xl px-3 py-2.5 border border-emerald-400/50 text-emerald-100 bg-emerald-900/40 hover:bg-emerald-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Batal & kembali</span>
            </button>
          </div>
        </motion.div>

        {/* Footer kecil */}
        <motion.p
          className="mt-4 text-[11px] text-center text-emerald-100/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          © {new Date().getFullYear()} PTPN 4 • Divisi Tanaman • Regional III
        </motion.p>
      </motion.div>

      {/* 🔄 FULLSCREEN LOADING SPINNER – sama style dengan login */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative flex items-center justify-center">
              {/* Lingkaran luar berputar */}
              <div className="h-24 w-24 rounded-full border-2 border-emerald-500/20 border-t-emerald-300/90 animate-spin" />

              {/* Logo PTPN 4 di tengah */}
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
                PTPN 4 • Divisi Tanaman
              </p>
              <p className="text-sm text-emerald-100/80">
                Mengakhiri sesi & keluar dari dashboard...
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default function LogoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 px-4">
          <div className="flex flex-col items-center text-emerald-100/90 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <LogOut className="h-4 w-4 animate-pulse" />
              <span>Sedang menyiapkan halaman logout...</span>
            </div>
            <p className="text-[11px] text-emerald-200/70">
              Mohon tunggu sebentar...
            </p>
          </div>
        </div>
      }
    >
      <LogoutPageContent />
    </Suspense>
  );
}
