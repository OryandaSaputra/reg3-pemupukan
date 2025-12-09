"use client";

import React, {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import Swal from "sweetalert2";
import { RefreshCcw, Save } from "lucide-react";

type Kategori = "TM" | "TBM" | "BIBITAN" | "";

type ApiRealisasi = {
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

type FormData = {
  kategori: Kategori;
  kebun: string;
  kodeKebun: string;
  tanggal: string; // YYYY-MM-DD
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

// ================= HELPER ANGKA & TANGGAL =================

function toNumberLoose(
  v: string | number | Date | null | undefined
): number {
  if (v === null || v === undefined || v === "") return 0;
  if (v instanceof Date) return 0;
  const n = Number(String(v).replace(",", ".")); // dukung koma
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

function toLocalYmd(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ================== KOMPONEN UTAMA EDIT ===================

function RealisasiEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");

  const [recordId, setRecordId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadingDone, setInitialLoadingDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<FormData>({
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
  });

  const kebunOptions = useMemo(
    () =>
      Object.keys(KEBUN_LABEL).map((k) => ({
        code: k,
        name: KEBUN_LABEL[k] ?? k,
      })),
    []
  );

  const onChange = <K extends keyof FormData>(
    key: K,
    value: FormData[K]
  ) => {
    setForm((s) => ({ ...s, [key]: value }));
  };

  const reset = () => {
    // reset ke data awal yang sudah dimuat (bukan kosong total)
    if (!recordId) return;
    fetchRecord(recordId, true);
  };

  // ================= FETCH DATA SATU RECORD =================

  async function fetchRecord(id: number, showToastOnError = false) {
    try {
      setLoading(true);

      // Gunakan GET tanpa query param → backend akan kembalikan semua data
      const res = await fetch("/api/pemupukan/realisasi", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Gagal mengambil data realisasi");
      }

      const json = await res.json();
      const dataArray: ApiRealisasi[] = Array.isArray(json)
        ? json
        : json.data;

      const found = dataArray.find((r) => r.id === id);

      if (!found) {
        if (showToastOnError || !initialLoadingDone) {
          await Swal.fire({
            title: "Data tidak ditemukan",
            text: "Realisasi dengan ID tersebut tidak ditemukan.",
            icon: "error",
            confirmButtonText: "OK",
          });
        }
        router.push("/pemupukan/realisasi/riwayat");
        return;
      }

      setRecordId(found.id);

      setForm({
        kategori: found.kategori,
        kebun: found.kebun,
        kodeKebun: found.kodeKebun ?? "",
        tanggal: toLocalYmd(found.tanggal),
        afd: found.afd || "AFD01",
        tt: found.tt ?? "",
        blok: found.blok ?? "",
        luas: found.luasHa ? String(found.luasHa) : "",
        inv: found.inv ? String(found.inv) : "",
        jenisPupuk: found.jenisPupuk || "NPK 13.6.27.4",
        aplikasi: found.aplikasiKe ? String(found.aplikasiKe) : "1",
        dosis: found.dosisKgPerPokok
          ? String(found.dosisKgPerPokok)
          : "1",
        kgPupuk: found.kgPupuk
          ? String(found.kgPupuk)
          : computeKgPupuk(
              found.inv ? String(found.inv) : "",
              found.dosisKgPerPokok
                ? String(found.dosisKgPerPokok)
                : ""
            ),
      });
    } catch (err) {
      console.error(err);
      await Swal.fire({
        title: "Terjadi kesalahan",
        text: "Gagal memuat data realisasi. Silakan coba lagi atau hubungi admin.",
        icon: "error",
        confirmButtonText: "OK",
      });
      router.push("/pemupukan/realisasi/riwayat");
    } finally {
      setLoading(false);
      setInitialLoadingDone(true);
    }
  }

  useEffect(() => {
    if (!idParam) {
      Swal.fire({
        title: "ID tidak ditemukan",
        text: "Parameter ?id diperlukan untuk mengedit realisasi.",
        icon: "error",
        confirmButtonText: "OK",
      }).then(() => {
        router.push("/pemupukan/realisasi/riwayat");
      });
      return;
    }

    const idNum = Number(idParam);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      Swal.fire({
        title: "ID tidak valid",
        text: "ID realisasi tidak valid.",
        icon: "error",
        confirmButtonText: "OK",
      }).then(() => {
        router.push("/pemupukan/realisasi/riwayat");
      });
      return;
    }

    fetchRecord(idNum);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idParam]);

  // ========================= SUBMIT EDIT =========================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recordId) {
      await Swal.fire({
        title: "Data belum siap",
        text: "Data realisasi belum selesai dimuat.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    if (!form.kategori) {
      Swal.fire({
        title: "Kategori belum dipilih",
        text: "Silakan pilih kategori (TM / TBM / BIBITAN) terlebih dahulu.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    if (!form.tanggal) {
      Swal.fire({
        title: "Tanggal belum diisi",
        text: "Tanggal realisasi wajib diisi.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        id: recordId,
        kategori: form.kategori,
        kebun: form.kebun,
        kode_kebun: form.kodeKebun.trim(),
        tanggal: form.tanggal, // "YYYY-MM-DD" → backend parseTanggalIsoJakarta
        afd: form.afd,
        tt: form.tt.trim(),
        blok: form.blok.trim().toUpperCase(),
        luas: toNumberLoose(form.luas),
        inv: Math.round(toNumberLoose(form.inv)),
        jenis_pupuk: form.jenisPupuk,
        // konsisten: default 1 jika kosong/0
        aplikasi: Number(toNumberLoose(form.aplikasi) || 1),
        dosis: toNumberLoose(form.dosis),
        kg_pupuk: toNumberLoose(form.kgPupuk),
      };

      const res = await fetch("/api/pemupukan/realisasi", {
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
            "Gagal mengupdate realisasi pemupukan. Silakan cek kembali data atau hubungi admin.",
          icon: "error",
          confirmButtonText: "OK",
        });
        return;
      }

      await Swal.fire({
        title: "Berhasil",
        text: "Realisasi pemupukan berhasil diperbarui.",
        icon: "success",
        confirmButtonText: "OK",
      });

      // Setelah update, kembali ke riwayat
      router.push("/pemupukan/realisasi/riwayat");
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
  };

  // ========================= RENDER =========================

  if (!initialLoadingDone && loading) {
    return (
      <section className="space-y-3">
        <SectionHeader
          title="Edit Realisasi Pemupukan"
          desc="Memuat data realisasi untuk diedit…"
        />
        <Card className="glass-surface rounded-2xl border border-[--glass-border] shadow-[0_18px_45px_rgba(3,18,9,0.85)]">
          <CardContent className="py-10 flex items-center justify-center text-sm text-emerald-50/80">
            Memuat data…
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section id="real-edit" className="space-y-3 scroll-mt-24">
      <SectionHeader
        title="Realisasi Pemupukan - Edit Data"
        desc="Perbarui data realisasi yang sudah tersimpan di database."
      />

      <Card className="glass-surface rounded-2xl border border-[--glass-border] shadow-[0_18px_45px_rgba(3,18,9,0.85)]">
        <CardHeader className="pb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-[13px] text-emerald-50">
            Formulir Edit Realisasi
          </CardTitle>
          {recordId && (
            <p className="text-[11px] text-emerald-100/70">
              ID Realisasi:{" "}
              <span className="font-mono rounded-full border border-emerald-700/70 bg-slate-950/70 px-2 py-0.5 text-[10px]">
                {recordId}
              </span>
            </p>
          )}
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
                    Tanggal
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
                onClick={reset}
              >
                <RefreshCcw className="h-4 w-4" /> Reset ke Data Awal
              </Button>

              <Button
                type="button"
                variant="outline"
                className="gap-2 border-emerald-600/70 text-emerald-50 hover:bg-emerald-900/70"
                onClick={() => router.push("/pemupukan/realisasi/riwayat")}
              >
                Kembali ke Riwayat
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

// ================== WRAPPER DENGAN SUSPENSE ===================

export default function RealisasiEditPage() {
  return (
    <Suspense
      fallback={
        <section className="space-y-3">
          <SectionHeader
            title="Realisasi Pemupukan - Edit Data"
            desc="Menyiapkan halaman edit realisasi…"
          />
          <Card className="glass-surface rounded-2xl border border-[--glass-border] shadow-[0_18px_45px_rgba(3,18,9,0.85)]">
            <CardContent className="py-10 flex items-center justify-center text-sm text-emerald-50/80">
              Memuat parameter dan data awal…
            </CardContent>
          </Card>
        </section>
      }
    >
      <RealisasiEditContent />
    </Suspense>
  );
}
