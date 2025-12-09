"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import SectionHeader from "../../shared/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { KEBUN_LABEL } from "../../../_config/constants";
import { ArrowLeft, RefreshCcw, Save } from "lucide-react";
import Swal from "sweetalert2";
import { useRouter, useSearchParams } from "next/navigation";

type Kategori = "TM" | "TBM" | "BIBITAN" | "";

type FormData = {
  id: number | null;
  kategori: Kategori;
  kebun: string;
  kodeKebun: string;
  tanggal: string; // YYYY-MM-DD (boleh kosong → null di backend)
  afd: string;
  tt: string;
  blok: string;
  luas: string;
  inv: string;
  jenisPupuk: string;
  aplikasi: string;
  dosis: string;
  kgPupuk: string; // otomatis = inv * dosis
};

type ApiRencana = {
  id: number;
  kategori: Kategori;
  kebun: string;
  kodeKebun: string;
  tanggal: string | null;
  afd: string;
  tt: string;
  blok: string;
  luasHa: number;
  inv: number;
  jenisPupuk: string;
  aplikasiKe: number;
  dosisKgPerPokok: number;
  kgPupuk: number;
  createdAt: string;
  updatedAt: string;
};

const JENIS_PUPUK = [
  "NPK 13.6.27.4",
  "NPK 12.12.17.2",
  "UREA",
  "TSP",
  "MOP",
  "RP",
  "DOLOMITE",
  "BORATE",
  "CuSO4",
  "ZnSO4",
];

const AFD_OPTIONS = Array.from({ length: 10 }, (_, i) =>
  `AFD${String(i + 1).padStart(2, "0")}`
);

// ============== HELPER ANGKA & TANGGAL ==============

function toNumberLoose(
  v: string | number | Date | null | undefined
): number {
  if (v === null || v === undefined || v === "") return 0;
  if (v instanceof Date) return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

// Hitung KG pupuk = INV * Dosis, balikan string (supaya bisa ditaruh ke input)
function computeKgPupuk(invStr: string, dosisStr: string): string {
  const inv = toNumberLoose(invStr);
  const dosis = toNumberLoose(dosisStr);
  const kg = inv * dosis;
  if (!Number.isFinite(kg) || kg === 0) return "";
  return String(kg);
}

// konversi ISO/Date string dari server → "YYYY-MM-DD" lokal
function toLocalYmd(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// helper: normalisasi kategori dari API ke union type
function normalizeKategori(k: string | null | undefined): Kategori {
  if (!k) return "";
  const up = k.toUpperCase();
  if (up === "TM" || up === "TBM" || up === "BIBITAN") return up;
  return "";
}

const INITIAL_FORM: FormData = {
  id: null,
  kategori: "",
  kebun: "",
  kodeKebun: "",
  tanggal: "",
  afd: "AFD01",
  tt: "",
  blok: "",
  luas: "",
  inv: "",
  jenisPupuk: "NPK 13.6.27.4",
  aplikasi: "1",
  dosis: "1",
  kgPupuk: "",
};

/* ===================[ KOMPONEN CONTENT ]=================== */

function RencanaEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<FormData>(() => ({ ...INITIAL_FORM }));

  const kebunOptions = useMemo(
    () =>
      Object.keys(KEBUN_LABEL).map((k) => ({
        code: k,
        name: KEBUN_LABEL[k] ?? k,
      })),
    []
  );

  const onChange = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((s) => ({ ...s, [key]: value }));
    },
    []
  );

  // ============ LOAD DATA AWAL ============

  const loadData = useCallback(
    async (id: number) => {
      try {
        setLoadingInitial(true);

        // API /rencana GET saat ini belum support ?id=,
        // jadi kita panggil tanpa query dan filter di sisi client.
        const res = await fetch("/api/pemupukan/rencana", {
          cache: "no-store",
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("Gagal fetch rencana:", text);
          await Swal.fire({
            title: "Gagal mengambil data",
            text:
              text ||
              "Tidak dapat mengambil data rencana dari server. Silakan coba lagi atau hubungi admin.",
            icon: "error",
            confirmButtonText: "OK",
          });
          return;
        }

        const json = await res.json();
        const dataArray: ApiRencana[] = Array.isArray(json)
          ? json
          : json.data;

        const found = dataArray.find((row) => row.id === id);
        if (!found) {
          await Swal.fire({
            title: "Data tidak ditemukan",
            text: `Data rencana dengan ID ${id} tidak ditemukan.`,
            icon: "warning",
            confirmButtonText: "OK",
          });
          return;
        }

        const tanggalYmd = toLocalYmd(found.tanggal);
        const luasStr = found.luasHa ? String(found.luasHa) : "";
        const invStr = found.inv ? String(found.inv) : "";
        const dosisStr = found.dosisKgPerPokok
          ? String(found.dosisKgPerPokok)
          : "";
        const kgPupukStr =
          found.kgPupuk && found.kgPupuk > 0
            ? String(found.kgPupuk)
            : computeKgPupuk(invStr, dosisStr);

        setForm({
          id: found.id,
          kategori: normalizeKategori(found.kategori),
          kebun: found.kebun || "",
          kodeKebun: found.kodeKebun || "",
          tanggal: tanggalYmd,
          afd: found.afd || "AFD01",
          tt: found.tt || "",
          blok: found.blok || "",
          luas: luasStr,
          inv: invStr,
          jenisPupuk: found.jenisPupuk || "NPK 13.6.27.4",
          aplikasi: found.aplikasiKe ? String(found.aplikasiKe) : "1",
          dosis: dosisStr || "1",
          kgPupuk: kgPupukStr,
        });
      } catch (err) {
        console.error(err);
        await Swal.fire({
          title: "Terjadi kesalahan",
          text: "Tidak dapat memuat data rencana. Cek console atau hubungi admin.",
          icon: "error",
          confirmButtonText: "OK",
        });
      } finally {
        setLoadingInitial(false);
      }
    },
    []
  );

  const resetToInitial = useCallback(async () => {
    if (!idParam) return;
    const idNum = Number(idParam);
    if (!Number.isFinite(idNum) || idNum <= 0) return;
    await loadData(idNum);
  }, [idParam, loadData]);

  useEffect(() => {
    if (!idParam) {
      Swal.fire({
        title: "ID tidak valid",
        text: "Parameter ID tidak ditemukan di URL.",
        icon: "error",
        confirmButtonText: "OK",
      }).then(() => {
        router.push("/pemupukan/rencana/riwayat");
      });
      return;
    }

    const idNum = Number(idParam);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      Swal.fire({
        title: "ID tidak valid",
        text: "Parameter ID pada URL tidak valid.",
        icon: "error",
        confirmButtonText: "OK",
      }).then(() => {
        router.push("/pemupukan/rencana/riwayat");
      });
      return;
    }

    loadData(idNum);
  }, [idParam, loadData, router]);

  // ============ SUBMIT EDIT ============

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.id) return;

      if (!form.kategori) {
        Swal.fire({
          title: "Kategori belum dipilih",
          text: "Silakan pilih kategori (TM / TBM / BIBITAN) terlebih dahulu.",
          icon: "warning",
          confirmButtonText: "OK",
        });
        return;
      }

      setSubmitting(true);
      try {
        const payload = {
          id: form.id,
          kategori: form.kategori,
          kebun: form.kebun,
          kode_kebun: form.kodeKebun.trim(),
          tanggal: form.tanggal || null, // boleh null
          afd: form.afd,
          tt: form.tt.trim(),
          blok: form.blok.trim().toUpperCase(),
          luas: toNumberLoose(form.luas),
          inv: Math.round(toNumberLoose(form.inv)),
          jenis_pupuk: form.jenisPupuk,
          aplikasi: Number(toNumberLoose(form.aplikasi) || 1),
          dosis: toNumberLoose(form.dosis),
          kg_pupuk: toNumberLoose(form.kgPupuk),
        };

        const res = await fetch("/api/pemupukan/rencana", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("Error response:", text);

          Swal.fire({
            title: "Gagal menyimpan",
            text:
              text ||
              "Gagal mengupdate rencana pemupukan. Silakan cek kembali data atau hubungi admin.",
            icon: "error",
            confirmButtonText: "OK",
          });

          throw new Error(text || "Gagal mengupdate rencana");
        }

        await Swal.fire({
          title: "Berhasil",
          text: "Rencana pemupukan berhasil diperbarui.",
          icon: "success",
          confirmButtonText: "OK",
        });

        router.push("/pemupukan/rencana/riwayat");
      } catch (err) {
        console.error(err);
        Swal.fire({
          title: "Terjadi kesalahan",
          text: "Gagal menyimpan data. Cek console atau hubungi admin.",
          icon: "error",
          confirmButtonText: "OK",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [form, router]
  );

  // ============ RENDER STATE LOADING / NOT FOUND ============

  if (loadingInitial) {
    return (
      <section className="space-y-3">
        <SectionHeader
          title="Edit Rencana Pemupukan"
          desc="Memuat data rencana yang dipilih…"
        />
        <Card className="glass-surface rounded-2xl border border-[--glass-border] shadow-[0_18px_45px_rgba(3,18,9,0.85)]">
          <CardContent className="py-10 flex items-center justify-center text-sm text-emerald-50">
            Memuat data…
          </CardContent>
        </Card>
      </section>
    );
  }

  if (!form.id) {
    // kalau gagal load / tidak ada data
    return (
      <section className="space-y-3">
        <SectionHeader
          title="Edit Rencana Pemupukan"
          desc="Data tidak ditemukan."
        />
        <Card className="glass-surface rounded-2xl border border-[--glass-border] shadow-[0_18px_45px_rgba(3,18,9,0.85)]">
          <CardContent className="py-10 flex flex-col items-center justify-center gap-3 text-sm text-emerald-50">
            <span>Data rencana tidak ditemukan atau sudah dihapus.</span>
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-emerald-600/70 text-emerald-50 hover:bg-emerald-900/70"
              onClick={() => router.push("/pemupukan/rencana/riwayat")}
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Riwayat Rencana
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  // ============ RENDER FORM ============

  return (
    <section id="rencana-edit" className="space-y-3 scroll-mt-24">
      <SectionHeader
        title="Rencana Pemupukan - Edit Data"
        desc={`Edit data rencana pemupukan (ID: ${form.id})`}
      />

      <div className="flex justify-between items-center mb-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 border-emerald-600/70 text-emerald-50 hover:bg-emerald-900/70"
          onClick={() => router.push("/pemupukan/rencana/riwayat")}
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Riwayat
        </Button>
      </div>

      <Card className="glass-surface rounded-2xl border border-[--glass-border] shadow-[0_18px_45px_rgba(3,18,9,0.85)]">
        <CardHeader className="pb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-[13px] text-emerald-50">
            Formulir Rencana (Edit)
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-3">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Kategori */}
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-emerald-100/80">
                Kategori Tanaman
              </p>
              <div className="max-w-xs">
                <Select
                  value={form.kategori}
                  onValueChange={(v) => onChange("kategori", v as Kategori)}
                >
                  <SelectTrigger className="h-9 w-full border-emerald-700/60 bg-slate-950/60 text-emerald-50 placeholder:text-emerald-200/40">
                    <SelectValue placeholder="Pilih kategori (TM / TBM / BIBITAN)" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 text-emerald-50 border border-emerald-700/70">
                    <SelectItem value="TM">
                      TM (Tanaman Menghasilkan)
                    </SelectItem>
                    <SelectItem value="TBM">
                      TBM (Tanaman Belum Menghasilkan)
                    </SelectItem>
                    <SelectItem value="BIBITAN">BIBITAN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Identitas Lokasi */}
            <div className="space-y-3">
              <p className="text-[11px] font-medium text-emerald-100/80">
                Identitas Lokasi
              </p>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-4">
                  <label className="text-[11px] text-emerald-100/70">
                    Nama Kebun
                  </label>
                  <Select
                    value={form.kebun}
                    onValueChange={(v) => onChange("kebun", v)}
                  >
                    <SelectTrigger className="h-10 w-full border-emerald-700/60 bg-slate-950/60 text-emerald-50">
                      <SelectValue placeholder="Pilih kebun" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 text-emerald-50 border border-emerald-700/70">
                      {kebunOptions.map((o) => (
                        <SelectItem key={o.code} value={o.code}>
                          {o.name} ({o.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-12 md:col-span-4">
                  <label className="text-[11px] text-emerald-100/70">
                    Kode Kebun
                  </label>
                  <Input
                    value={form.kodeKebun}
                    onChange={(e) =>
                      onChange("kodeKebun", e.target.value.toUpperCase())
                    }
                    placeholder="mis. 3E18"
                    className="h-10 border-emerald-700/60 bg-slate-950/60 text-emerald-50 placeholder:text-emerald-200/40"
                  />
                </div>

                <div className="col-span-12 md:col-span-4">
                  <label className="text-[11px] text-emerald-100/70">
                    Tanggal (opsional)
                  </label>
                  <Input
                    type="date"
                    value={form.tanggal}
                    onChange={(e) => onChange("tanggal", e.target.value)}
                    className="h-10 border-emerald-700/60 bg-slate-950/60 text-emerald-50"
                  />
                </div>

                <div className="col-span-6 md:col-span-3">
                  <label className="text-[11px] text-emerald-100/70">
                    AFD
                  </label>
                  <Select
                    value={form.afd}
                    onValueChange={(v) => onChange("afd", v)}
                  >
                    <SelectTrigger className="h-10 w-full border-emerald-700/60 bg-slate-950/60 text-emerald-50">
                      <SelectValue placeholder="AFD" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 text-emerald-50 border border-emerald-700/70">
                      {AFD_OPTIONS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-6 md:col-span-3">
                  <label className="text-[11px] text-emerald-100/70">
                    TT (Tahun Tanam)
                  </label>
                  <Input
                    inputMode="numeric"
                    value={form.tt}
                    onChange={(e) =>
                      onChange("tt", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="mis. 2004"
                    className="h-10 border-emerald-700/60 bg-slate-950/60 text-emerald-50 placeholder:text-emerald-200/40"
                    maxLength={4}
                  />
                </div>

                <div className="col-span-6 md:col-span-3">
                  <label className="text-[11px] text-emerald-100/70">
                    Blok
                  </label>
                  <Input
                    value={form.blok}
                    onChange={(e) =>
                      onChange("blok", e.target.value.toUpperCase())
                    }
                    placeholder="mis. D6"
                    className="h-10 border-emerald-700/60 bg-slate-950/60 text-emerald-50 placeholder:text-emerald-200/40"
                  />
                </div>

                <div className="col-span-6 md:col-span-3">
                  <label className="text-[11px] text-emerald-100/70">
                    Luas (Ha)
                  </label>
                  <Input
                    inputMode="decimal"
                    value={form.luas}
                    onChange={(e) => onChange("luas", e.target.value)}
                    placeholder="mis. 29,82"
                    className="h-10 border-emerald-700/60 bg-slate-950/60 text-emerald-50 placeholder:text-emerald-200/40"
                  />
                </div>
              </div>
            </div>

            {/* Detail Pemupukan */}
            <div className="space-y-3">
              <p className="text-[11px] font-medium text-emerald-100/80">
                Detail Pemupukan
              </p>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-6 md:col-span-2">
                  <label className="text-[11px] text-emerald-100/70">
                    INV (Pokok)
                  </label>
                  <Input
                    inputMode="numeric"
                    value={form.inv}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, "");
                      setForm((prev) => ({
                        ...prev,
                        inv: raw,
                        kgPupuk: computeKgPupuk(raw, prev.dosis),
                      }));
                    }}
                    placeholder="mis. 2067"
                    className="h-10 border-emerald-700/60 bg-slate-950/60 text-emerald-50 placeholder:text-emerald-200/40"
                  />
                </div>

                <div className="col-span-12 md:col-span-3">
                  <label className="text-[11px] text-emerald-100/70">
                    Jenis Pupuk
                  </label>
                  <Select
                    value={form.jenisPupuk}
                    onValueChange={(v) => onChange("jenisPupuk", v)}
                  >
                    <SelectTrigger className="h-10 w-full border-emerald-700/60 bg-slate-950/60 text-emerald-50">
                      <SelectValue placeholder="Pilih jenis pupuk" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 text-emerald-50 border border-emerald-700/70">
                      {JENIS_PUPUK.map((j) => (
                        <SelectItem key={j} value={j}>
                          {j.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-6 md:col-span-2">
                  <label className="text-[11px] text-emerald-100/70">
                    Aplikasi (ke-)
                  </label>
                  <Input
                    inputMode="numeric"
                    value={form.aplikasi}
                    onChange={(e) =>
                      onChange(
                        "aplikasi",
                        e.target.value.replace(/[^\d]/g, "")
                      )
                    }
                    className="h-10 border-emerald-700/60 bg-slate-950/60 text-emerald-50"
                  />
                </div>

                <div className="col-span-6 md:col-span-2">
                  <label className="text-[11px] text-emerald-100/70">
                    Dosis (Kg/pokok)
                  </label>
                  <Input
                    inputMode="decimal"
                    value={form.dosis}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        dosis: raw,
                        kgPupuk: computeKgPupuk(prev.inv, raw),
                      }));
                    }}
                    placeholder="mis. 1"
                    className="h-10 border-emerald-700/60 bg-slate-950/60 text-emerald-50 placeholder:text-emerald-200/40"
                  />
                </div>

                <div className="col-span-12 md:col-span-3">
                  <label className="text-[11px] text-emerald-100/70">
                    KG Pupuk (Total) — otomatis = INV × Dosis
                  </label>
                  <Input
                    inputMode="decimal"
                    value={form.kgPupuk}
                    readOnly
                    className="h-10 border-emerald-700/60 bg-slate-900/70 text-emerald-50"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button
                type="submit"
                disabled={submitting}
                className="gap-2 bg-emerald-500/90 text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Menyimpan…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Simpan Perubahan
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="gap-2 border-emerald-600/70 text-emerald-50 hover:bg-emerald-900/70"
                onClick={resetToInitial}
              >
                <RefreshCcw className="h-4 w-4" /> Reset ke Data Awal
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

/* ===================[ WRAPPER DENGAN SUSPENSE ]=================== */

export default function RencanaEditPage() {
  return (
    <Suspense
      fallback={
        <section className="space-y-3">
          <SectionHeader
            title="Edit Rencana Pemupukan"
            desc="Menyiapkan halaman edit rencana…"
          />
          <Card className="glass-surface rounded-2xl border border-[--glass-border] shadow-[0_18px_45px_rgba(3,18,9,0.85)]">
            <CardContent className="py-10 flex items-center justify-center text-sm text-emerald-50">
              Memuat parameter dan data awal…
            </CardContent>
          </Card>
        </section>
      }
    >
      <RencanaEditContent />
    </Suspense>
  );
}
