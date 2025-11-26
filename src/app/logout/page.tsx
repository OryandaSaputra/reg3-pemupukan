// src/app/logout/page.tsx
"use client";

import React, { Suspense, useState } from "react";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

// 🔥 Hapus semua cookie next-auth
function clearAllCookies() {
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;");
  });
}

function LogoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const from = searchParams.get("from") || "/pemupukan";

  // "none" | "logout" | "cancel"
  const [loadingMode, setLoadingMode] = useState<"none" | "logout" | "cancel">(
    "none"
  );
  const loading = loadingMode !== "none";

  const handleLogout = async () => {
    setLoadingMode("logout");

    // 🔥 clear semua cookie dan localstorage
    clearAllCookies();
    localStorage.clear();

    await signOut({
      redirect: true,
      callbackUrl: "/login",
    });
  };

  const handleCancel = () => {
    if (loading) return;
    setLoadingMode("cancel");
    router.push(from);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 px-4 relative">
      <motion.div
        className="max-w-md w-full space-y-4 text-emerald-50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold tracking-wide">Logout</h1>
          <p className="text-sm text-emerald-100/80">
            Yakin ingin keluar dari sistem pemupukan?
          </p>
        </div>

        <div className="bg-emerald-900/40 rounded-2xl border border-emerald-500/30 shadow-xl shadow-emerald-900/40 p-5 backdrop-blur-md text-center">
          <p className="text-xs text-emerald-100/80 mb-4">
            Sesi Anda akan diakhiri. Pastikan semua pekerjaan telah disimpan.
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center text-xs font-medium rounded-xl px-3 py-2.5 bg-rose-500 hover:bg-rose-600 text-white shadow shadow-rose-900/40 disabled:opacity-60"
            >
              {loadingMode === "logout" ? "Sedang logout..." : "Ya, logout"}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center text-xs font-medium rounded-xl px-3 py-2.5 border border-emerald-300/50 text-emerald-100 bg-emerald-900/40 hover:bg-emerald-800/70 disabled:opacity-60"
            >
              {loadingMode === "cancel" ? "Kembali..." : "Batal"}
            </button>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-center text-emerald-100/80">
          © {new Date().getFullYear()} PTPN 4 • Divisi Tanaman • Regional III
        </p>
      </motion.div>

      {/* LOADING OVERLAY */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative flex items-center justify-center">
              <div className="h-20 w-20 rounded-full border-2 border-emerald-500/20 border-t-emerald-300 animate-spin" />

              <div className="absolute h-14 w-14 rounded-xl bg-white flex items-center justify-center overflow-hidden shadow">
                <Image
                  src="https://www.ptpn4.co.id/build/assets/Logo%20PTPN%20IV-CyWK9qsP.png"
                  alt="PTPN 4"
                  fill
                  unoptimized
                  className="object-contain p-1.5"
                />
              </div>
            </div>

            <p className="text-sm text-emerald-100/80">
              {loadingMode === "logout"
                ? "Mengakhiri sesi..."
                : "Membatalkan..."}
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default function LogoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LogoutPageContent />
    </Suspense>
  );
}
