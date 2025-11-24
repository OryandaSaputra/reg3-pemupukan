// src/app/login/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signIn, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession(); // ⬅️ pantau status session

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [scrollY, setScrollY] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const usernameRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  // Parallax effect
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY || 0);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Prefill username & autofocus
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

  // Jika session sudah authenticated (baik dari login baru maupun
  // user yang buka /login padahal sudah login), langsung redirect.
  useEffect(() => {
    if (status === "authenticated") {
      // setLoading(false); // pastikan loading dimatikan (kalau masih di sini)
      router.replace("/pemupukan");
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      username,
      password,
      redirect: false, // biar kita yang kontrol redirect
    });

    if (res?.error) {
      setError("Username atau password salah.");
      setLoading(false); // matikan loading kalau gagal
      passwordRef.current?.focus();
      return;
    }

    // Kalau berhasil, biarkan loading tetap true.
    // Saat NextAuth update session → status = "authenticated"
    // → useEffect di atas akan redirect ke /pemupukan
    // dan halaman login (termasuk overlay) otomatis ke-unmount.

    if (remember) {
      localStorage.setItem("ptpn5-username", username);
    } else {
      localStorage.removeItem("ptpn5-username");
    }
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
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          transform: `translateY(${scrollY * -0.15}px)`,
          transition: "transform 0.05s linear",
        }}
      />

      {/* Overlay gradient */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-emerald-900/80 via-emerald-900/60 to-emerald-950/90" />

      {/* Main content */}
      <div className="min-h-screen w-full flex items-center justify-center px-4 py-10">
        <motion.div
          className="w-full max-w-5xl"
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl shadow-emerald-950/40 bg-emerald-900/60 border border-emerald-700/40 backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            {/* Kiri: info sistem */}
            <div className="hidden md:flex flex-col justify-between px-10 py-10 text-emerald-50 bg-emerald-900/90">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.45 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="relative h-10 w-10 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-emerald-900/60 overflow-hidden">
                    <Image
                      src="https://www.ptpn4.co.id/build/assets/Logo%20PTPN%20IV-CyWK9qsP.png"
                      alt="PTPN 4"
                      fill
                      unoptimized
                      className="object-contain p-1"
                    />
                  </div>
                  <span className="text-xs tracking-[0.25em] uppercase">
                    PTPN 4 • DIVISI TANAMAN
                  </span>
                </div>

                <h1 className="text-3xl font-semibold leading-tight mb-2">
                  Dashboard Pemupukan
                </h1>
                <h2 className="text-2xl font-semibold text-emerald-300 mb-6">
                  PTPN 4 Regional III
                </h2>

                <p className="text-sm text-emerald-100/80 mb-6 max-w-md">
                  Akses terpusat untuk memantau rencana dan realisasi pemupukan,
                  analisis progres per kebun, serta laporan pendukung keputusan
                  Divisi Tanaman.
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
                      transition={{ delay: 0.35 + i * 0.08, duration: 0.4 }}
                    >
                      <span className="mt-1 h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center text-[10px]">
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
                © {new Date().getFullYear()} PTPN 4 • Dashboard Pemupukan Divisi
                Tanaman
              </motion.p>
            </div>

            {/* Kanan: form login */}
            <motion.div
              className="bg-white rounded-l-3xl md:rounded-l-none px-8 sm:px-10 py-10 flex flex-col justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.55 }}
            >
              <div className="mb-8">
                {/* Logo kecil utk mobile */}
                <div className="flex items-center gap-2 mb-2 md:hidden">
                  <div className="relative h-8 w-8 rounded-2xl bg-white flex items-center justify-center shadow-md shadow-emerald-900/40 overflow-hidden">
                    <Image
                      src="/ptpn4-logo.png"
                      alt="PTPN 4"
                      fill
                      className="object-contain p-1"
                    />
                  </div>
                  <span className="text-[11px] tracking-[0.25em] uppercase text-emerald-700">
                    PTPN 4 • DIVISI TANAMAN
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-emerald-950">
                  Masuk Akun
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Gunakan kredensial yang telah ditetapkan Divisi Tanaman.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">
                    Username
                  </label>
                  <div className="relative rounded-xl border border-emerald-200/80 bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/70 transition-all">
                    <input
                      ref={usernameRef}
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none bg-transparent"
                      placeholder="Masukkan username"
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">
                    Password
                  </label>
                  <div className="relative rounded-xl border border-emerald-200/80 bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/70 transition-all">
                    <input
                      ref={passwordRef}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl px-3.5 py-2.5 pr-10 text-sm outline-none bg-transparent"
                      placeholder="Masukkan password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors"
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

                {/* Remember + lupa password (dummy) */}
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-slate-600">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Ingat saya</span>
                  </label>
                  <button
                    type="button"
                    className="text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Lupa password?
                  </button>
                </div>

                {/* Error message */}
                {error && (
                  <motion.p
                    key={error} // supaya animasi re-trigger saat error berubah
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 24 }}
                    className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
                  >
                    {error}
                  </motion.p>
                )}

                {/* Tombol masuk */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium py-2.5 shadow-lg shadow-emerald-700/40 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Sedang masuk..." : "Masuk"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* 🔄 FULLSCREEN LOADING SPINNER – hilang setelah masuk dashboard */}
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
                Memuat Dashboard Pemupukan...
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
