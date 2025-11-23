// src/app/logout/page.tsx
"use client";

import { signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogOut, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function LogoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/pemupukan";

  const handleLogout = async () => {
    // Kalau mau benar-benar “bersih”, bisa tambahkan clear localStorage lain di sini
    // localStorage.removeItem("ptpn5-username");

    await signOut({
      callbackUrl: "/login",
      redirect: true,
    });
  };

  const handleCancel = () => {
    router.push(from);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 px-4">
      {/* Pattern halus di background */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.12] bg-[radial-gradient(circle_at_0_0,white_0,transparent_55%),radial-gradient(circle_at_100%_0,white_0,transparent_55%)]" />

      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        {/* Badge kecil di atas kartu */}
        <motion.div
          className="mb-3 flex justify-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-900/60 px-3 py-1 text-[11px] tracking-[0.18em] uppercase text-emerald-100 shadow-lg shadow-black/30 backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            PTPN 4 Regional III • Dashboard Pemupukan
          </div>
        </motion.div>

        {/* Card utama */}
        <motion.div
          className="relative w-full rounded-3xl bg-white/98 shadow-2xl shadow-black/40 border border-slate-100 px-7 py-8 space-y-5"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.35, ease: "easeOut" }}
        >
          {/* Icon + judul */}
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100 shadow-inner">
              <LogOut className="h-5 w-5 text-emerald-700" />
            </div>
            <div className="space-y-1">
              <h1 className="text-lg sm:text-xl font-semibold text-slate-900">
                Keluar dari Akun
              </h1>
              <p className="text-sm text-slate-600">
                Anda akan keluar dari sesi Dashboard Pemupukan. Pastikan semua
                perubahan sudah disimpan sebelum melanjutkan.
              </p>
            </div>
          </div>

          {/* Info / warning */}
          <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-900 space-y-1.5">
            <p className="font-semibold flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
              Perhatian
            </p>
            <p>
              Setelah logout, Anda perlu memasukkan kembali{" "}
              <span className="font-medium">username</span> dan{" "}
              <span className="font-medium">password</span> untuk mengakses
              kembali dashboard.
            </p>
          </div>

          {/* Tombol aksi */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              onClick={handleLogout}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-sm font-medium py-2.5 shadow-md shadow-emerald-800/50 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <LogOut className="h-4 w-4" />
              Keluar sekarang
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white text-slate-700 text-sm font-medium py-2.5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Batal & kembali
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
    </div>
  );
}
