// src/app/login/LoginClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/pemupukan";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [scrollY, setScrollY] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const usernameRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  // Parallax
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY || 0);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Prefill username + focus
  useEffect(() => {
    const saved = localStorage.getItem("ptpn5-username");
    if (saved) {
      setUsername(saved);
      setRemember(true);
      passwordRef.current?.focus();
    } else {
      usernameRef.current?.focus();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Username atau password salah.");
      setLoading(false);
      passwordRef.current?.focus();
      return;
    }

    if (remember) {
      localStorage.setItem("ptpn5-username", username);
    } else {
      localStorage.removeItem("ptpn5-username");
    }

    // langsung ke dashboard (atau callbackUrl kalau ada)
    router.replace(callbackUrl);
  };

  return (
    <motion.div
      className="relative min-h-screen w-full overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Parallax background layer */}
      <div
        className="pointer-events-none fixed inset-0 -z-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 0% 0%, rgba(16,185,129,0.35), transparent 55%), radial-gradient(circle at 100% 100%, rgba(21,128,61,0.45), transparent 55%)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          transform: `translateY(${scrollY * -0.15}px)`,
          transition: "transform 0.05s linear",
        }}
      />

      {/* Overlay gradient */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-emerald-950/95 via-emerald-900/85 to-slate-950" />

      {/* Main content */}
      <div className="flex min-h-screen w-full items-center justify-center px-4 py-10">
        <motion.div
          className="w-full max-w-5xl"
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <motion.div
            className="grid grid-cols-1 overflow-hidden rounded-3xl border border-emerald-700/40 bg-emerald-900/70 shadow-2xl shadow-emerald-950/50 backdrop-blur-md md:grid-cols-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            {/* Kiri: info sistem */}
            <div className="hidden flex-col justify-between bg-emerald-950/70 px-10 py-10 text-emerald-50 md:flex">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.45 }}
              >
                <div className="mb-6 flex items-center gap-3">
                  <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-emerald-900/70">
                    <Image
                      src="https://www.ptpn4.co.id/build/assets/Logo%20PTPN%20IV-CyWK9qsP.png"
                      alt="PTPN 4"
                      fill
                      unoptimized
                      className="object-contain p-1"
                    />
                  </div>
                  <span className="text-xs uppercase tracking-[0.25em] text-emerald-100/90">
                    PTPN 4 • DIVISI TANAMAN
                  </span>
                </div>

                <h1 className="mb-2 text-3xl font-semibold leading-tight">
                  Dashboard Pemupukan
                </h1>
                <h2 className="mb-6 text-2xl font-semibold text-emerald-300">
                  PTPN 4 Regional III
                </h2>

                <p className="mb-6 max-w-md text-sm text-emerald-100/80">
                  Akses terpusat untuk memantau rencana dan realisasi
                  pemupukan, analisis progres per kebun, serta laporan
                  pendukung keputusan Divisi Tanaman.
                </p>

                <ul className="space-y-3 text-sm">
                  {[
                    "Data terpusat & tersinkronisasi per kebun.",
                    "Monitoring rencana vs realisasi secara real-time.",
                    "Keamanan akses dengan akun Divisi Tanaman.",
                  ].map((text, i) => (
                    <motion.li
                      key={text}
                      className="flex items-start gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.35 + i * 0.08,
                        duration: 0.4,
                      }}
                    >
                      <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full border border-emerald-400/70 bg-emerald-500/25 text-[10px]">
                        ✓
                      </span>
                      <span>{text}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              <motion.p
                className="mt-8 text-[11px] text-emerald-200/70"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                © {new Date().getFullYear()} PTPN 4 • Dashboard Pemupukan
                Divisi Tanaman
              </motion.p>
            </div>

            {/* Kanan: form login */}
            <motion.div
              className="flex flex-col justify-center bg-slate-950/90 px-8 py-10 text-slate-50 sm:px-10 md:rounded-l-none"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.55 }}
            >
              <div className="mb-8">
                {/* Logo kecil utk mobile */}
                <div className="mb-2 flex items-center gap-2 md:hidden">
                  <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md shadow-emerald-900/50">
                    <Image
                      src="https://www.ptpn4.co.id/build/assets/Logo%20PTPN%20IV-CyWK9qsP.png"
                      alt="PTPN 4"
                      fill
                      unoptimized
                      className="object-contain p-1"
                    />
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.25em] text-emerald-300">
                    PTPN 4 • DIVISI TANAMAN
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-emerald-100 sm:text-2xl">
                  Masuk Akun
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Gunakan kredensial yang telah ditetapkan Divisi Tanaman.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Username
                  </label>
                  <div className="relative rounded-xl border border-emerald-700/60 bg-slate-900/80 transition-all focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/70">
                    <input
                      ref={usernameRef}
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full rounded-xl bg-transparent px-3.5 py-2.5 text-sm text-emerald-50 outline-none placeholder:text-slate-500"
                      placeholder="Masukkan username"
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Password
                  </label>
                  <div className="relative rounded-xl border border-emerald-700/60 bg-slate-900/80 transition-all focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/70">
                    <input
                      ref={passwordRef}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl bg-transparent px-3.5 py-2.5 pr-10 text-sm text-emerald-50 outline-none placeholder:text-slate-500"
                      placeholder="Masukkan password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 transition-colors hover:text-slate-300"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <motion.p
                    key={error}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 24,
                    }}
                    className="rounded-lg border border-red-500/40 bg-red-900/40 px-3 py-2 text-xs text-red-100"
                  >
                    {error}
                  </motion.p>
                )}

                {/* Tombol masuk */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/90 py-2.5 text-sm font-medium text-emerald-950 shadow-[0_12px_30px_rgba(16,185,129,0.55)] transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Sedang masuk..." : "Masuk"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Fullscreen loading ketika submit */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/85 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative flex items-center justify-center">
              <div className="h-24 w-24 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-300/90" />
              <div className="absolute flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-emerald-900/60">
                <Image
                  src="https://www.ptpn4.co.id/build/assets/Logo%20PTPN%20IV-CyWK9qsP.png"
                  alt="PTPN 4"
                  fill
                  unoptimized
                  className="object-contain p-1.5"
                />
              </div>
            </div>
            <div className="space-y-1 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-100/90">
                PTPN 4 • Divisi Tanaman
              </p>
              <p className="text-sm text-emerald-100/80">
                Memuat Dashboard Pemupukan...
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
