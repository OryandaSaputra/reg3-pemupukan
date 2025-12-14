"use client";

import React, { useMemo, useState } from "react";
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
import { RefreshCcw, Save, Upload } from "lucide-react";
import Swal from "sweetalert2";

type Kategori = "TM" | "TBM" | "BIBITAN" | "";

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
  kgPupuk: string; // otomatis = inv * dosis (untuk input manual)
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

// ============== HELPER ANGKA & HEADER ==============

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

export default function RealisasiTambah() {
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);

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
    setForm({
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
  };

  // ============ SUBMIT MANUAL ============

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        // default ke 1 kalau kosong/0 supaya konsisten dengan Rencana
        aplikasi: Number(toNumberLoose(form.aplikasi) || 1),
        dosis: toNumberLoose(form.dosis),
        kg_pupuk: toNumberLoose(form.kgPupuk),
      };

      const res = await fetch("/api/pemupukan/realisasi", {
        method: "POST",
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
            "Gagal menyimpan realisasi pemupukan. Silakan cek kembali data atau hubungi admin.",
          icon: "error",
          confirmButtonText: "OK",
        });
        throw new Error(text || "Gagal menyimpan realisasi");
      }

      Swal.fire({
        title: "Berhasil",
        text: "Realisasi pemupukan berhasil disimpan ke database.",
        icon: "success",
        confirmButtonText: "OK",
      });

      reset();
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

  // ============ IMPORT DARI EXCEL (BULK) ============

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const pickedFile = e.target.files?.[0];
    e.target.value = "";
    if (!pickedFile) return;

    if (!form.kategori) {
      Swal.fire({
        title: "Kategori belum dipilih",
        text: "Pilih kategori (TM / TBM / BIBITAN) dulu, kategori ini akan dipakai untuk semua baris Excel.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    setImporting(true);

    type ImportRealisasiResponse = {
      message?: string;
      count?: number;
      deleted?: number;
      totalParsed?: number;
      sheetName?: string;
      sheetNames?: string[];
    };

    async function upload(file: File, sheetName?: string) {
      const fd = new FormData();
      fd.append("file", file); // ✅ file sudah pasti File, bukan undefined
      fd.append("kategori", form.kategori);
      if (sheetName) fd.append("sheetName", sheetName);

      return fetch("/api/pemupukan/realisasi", {
        method: "POST",
        body: fd,
      });
    }

    try {
      // 1) coba upload tanpa sheetName
      let res = await upload(pickedFile);

      // 2) jika server minta pilih sheet (tetap bisa milih sheet)
      if (res.status === 409) {
        const info: ImportRealisasiResponse = await res.json();
        const sheetNames = info.sheetNames ?? [];

        if (!sheetNames.length) {
          Swal.fire({
            title: "Gagal",
            text:
              info.message ||
              "Server meminta memilih sheet, tapi daftar sheet tidak tersedia.",
            icon: "error",
            confirmButtonText: "OK",
          });
          return;
        }

        const { value: picked } = await Swal.fire({
          title: "Pilih Sheet",
          text: "Pilih nama sheet yang berisi data realisasi pemupukan.",
          icon: "question",
          input: "select",
          inputOptions: sheetNames.reduce<Record<string, string>>((acc, name) => {
            acc[name] = name;
            return acc;
          }, {}),
          inputValue: sheetNames[0],
          showCancelButton: true,
          confirmButtonText: "Pakai sheet ini",
          cancelButtonText: "Batal",
        });

        if (!picked) return;

        // upload ulang dengan sheetName
        res = await upload(pickedFile, String(picked));
      }

      if (!res.ok) {
        const text = await res.text();
        Swal.fire({
          title: "Import gagal",
          text: text || "Gagal import realisasi. Pastikan format Excel sesuai.",
          icon: "error",
          confirmButtonText: "OK",
        });
        return;
      }

      const json: ImportRealisasiResponse = await res.json();

      const inserted = json.count ?? 0;
      const deleted = json.deleted ?? 0;
      const parsed = json.totalParsed ?? 0;
      const sheetName = json.sheetName ? ` (${json.sheetName})` : "";

      Swal.fire({
        title: "Import selesai",
        html: `Sheet${sheetName}<br/>Terbaca <b>${parsed}</b> baris, tersimpan <b>${inserted}</b> baris (replace).<br/>Duplikat terhapus <b>${deleted}</b> baris.`,
        icon: inserted > 0 ? "success" : "warning",
        confirmButtonText: "OK",
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: "Gagal import",
        text: "Terjadi kesalahan saat upload/import di server.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <section id="real-tambah" className="space-y-3 scroll-mt-24">
      <SectionHeader
        title="Realisasi Pemupukan - Tambah Data"
        desc="Isi data realisasi secara manual atau import dari Excel."
      />

      <Card className="glass-surface rounded-2xl border border-[--glass-border] shadow-[0_18px_45px_rgba(3,18,9,0.85)]">
        <CardHeader className="pb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-[13px]">Formulir Realisasi</CardTitle>

          <div className="flex items-center gap-2">
            {/* input file disembunyikan, dipicu melalui label + button */}
            <label className="inline-flex items-center gap-2">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleImportExcel}
                disabled={importing}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 border-emerald-600/70 text-emerald-50 hover:bg-emerald-900/70"
                disabled={importing}
                asChild
              >
                <span>
                  <Upload className="h-4 w-4" />
                  {importing ? "Import..." : "Import dari Excel"}
                </span>
              </Button>
            </label>
          </div>
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
            <div className="flex items-center gap-2 pt-2">
              <Button
                type="submit"
                disabled={submitting}
                className="gap-2 bg-emerald-500/90 text-emerald-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
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
                    <Save className="h-4 w-4" /> Simpan
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-emerald-600/70 text-emerald-50 hover:bg-emerald-900/70"
                onClick={reset}
              >
                <RefreshCcw className="h-4 w-4" /> Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {importing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-xl border border-[--glass-border] bg-slate-950/90 px-4 py-3 text-emerald-50 shadow-[0_18px_40px_rgba(0,0,0,0.9)]">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
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
            <span className="text-sm">
              Mengimport data dari Excel (bulk), mohon tunggu...
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
