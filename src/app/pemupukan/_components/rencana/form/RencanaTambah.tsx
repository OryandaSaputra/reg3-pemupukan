"use client";

import React, { useMemo, useState, useCallback } from "react";
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
import { toIsoDateJakarta } from "../../../_services/dateHelpers";

type Kategori = "TM" | "TBM" | "BIBITAN" | "";

type FormData = {
  kategori: Kategori;
  kebun: string;
  kodeKebun: string;
  tanggal: string; // YYYY-MM-DD (boleh kosong)
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

// normalisasi header untuk matching fleksibel
const normalize = (s: string) =>
  String(s ?? "")
    .normalize("NFKD")
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase();

// Form default dipakai di useState & reset agar konsisten
const INITIAL_FORM: FormData = {
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

export default function RencanaTambah() {
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
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

  const reset = useCallback(() => {
    setForm(() => ({ ...INITIAL_FORM }));
  }, []);

  // ============ SUBMIT MANUAL ============

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
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

      setSubmitting(true);
      try {
        const payload = {
          kategori: form.kategori,
          kebun: form.kebun,
          kode_kebun: form.kodeKebun.trim(),
          tanggal: form.tanggal, // boleh "" → di backend jadi null
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
              "Gagal menyimpan rencana pemupukan. Silakan cek kembali data atau hubungi admin.",
            icon: "error",
            confirmButtonText: "OK",
          });

          throw new Error(text || "Gagal menyimpan rencana");
        }

        Swal.fire({
          title: "Berhasil",
          text: "Rencana pemupukan berhasil disimpan ke database.",
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
    },
    [form, reset]
  );

  // ============ IMPORT DARI EXCEL (BULK) ============

  const handleImportExcel = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // reset supaya bisa upload file sama dua kali
      e.target.value = "";
      if (!file) return;

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
      try {
        const XLSX = (await import("xlsx")) as typeof import("xlsx");
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {
          type: "array",
          cellDates: false, // disamakan dengan Realisasi
        });

        const sheetNames = workbook.SheetNames;
        if (!sheetNames.length) {
          await Swal.fire({
            title: "File kosong",
            text: "Workbook tidak memiliki sheet.",
            icon: "warning",
          });
          return;
        }

        // === PILIH SHEET ===
        let selectedSheetName = sheetNames[0];

        if (sheetNames.length > 1) {
          const { value: picked } = await Swal.fire({
            title: "Pilih Sheet",
            text: "Pilih nama sheet yang berisi data rencana pemupukan.",
            icon: "question",
            input: "select",
            inputOptions: sheetNames.reduce<Record<string, string>>(
              (acc, name) => {
                acc[name] = name;
                return acc;
              },
              {}
            ),
            inputValue: sheetNames[0],
            showCancelButton: true,
            confirmButtonText: "Pakai sheet ini",
            cancelButtonText: "Batal",
          });

          if (!picked) {
            return;
          }

          selectedSheetName = picked;
        }

        const sheet = workbook.Sheets[selectedSheetName];

        const rows = XLSX.utils.sheet_to_json<
          (string | number | Date | null)[]
        >(sheet, {
          header: 1,
          defval: "",
        });

        if (!rows.length) {
          Swal.fire({
            title: "File kosong",
            text: "Sheet Excel tidak memiliki data.",
            icon: "warning",
            confirmButtonText: "OK",
          });
          return;
        }

        // === CARI BARIS HEADER & BATAS KIRI (RENCANA) VS KANAN (REALISASI) ===
        let headerRowIndex = -1;
        let headerNorm: string[] = [];
        let idxTanggalBoundary = -1; // TANGGAL realisasi (batas kiri-kanan)

        const maxScan = Math.min(rows.length, 20);

        for (let r = 0; r < maxScan; r++) {
          const norm = rows[r].map((h) => normalize(String(h ?? "")));
          const tIndex = norm.findIndex(
            (c) => c === "TANGGAL" || c === "TGL"
          );
          if (tIndex !== -1) {
            headerRowIndex = r;
            headerNorm = norm;
            idxTanggalBoundary = tIndex;
            break;
          }
        }

        // Kalau tidak ketemu kolom TANGGAL sama sekali (sheet murni Rencana),
        // fallback ke cara lama: cari baris yang mirip header rencana.
        if (headerRowIndex === -1) {
          const targetHeaders = [
            "KEBUN",
            "KODE KEBUN",
            "AFD",
            "TT",
            "BLOK",
            "LUAS",
            "INV",
            "JENIS PUPUK",
            "APLIKASI",
            "DOSIS",
            "KG PUPUK",
          ].map(normalize);

          for (let r = 0; r < maxScan; r++) {
            const norm = rows[r].map((h) => normalize(String(h ?? "")));
            const matchCount = norm.filter((col) =>
              targetHeaders.includes(col)
            ).length;

            if (matchCount >= 4) {
              headerRowIndex = r;
              headerNorm = norm;
              break;
            }
          }
        }

        if (headerRowIndex === -1) {
          console.log(
            "Gagal menemukan baris header, rows[0..5] =",
            rows.slice(0, 5)
          );
          Swal.fire({
            title: "Header tidak sesuai",
            html:
              "Tidak dapat menemukan baris header tabel Rencana.<br/>" +
              "Pastikan di bagian kiri sheet ada header:<br/>" +
              "<b>KEBUN, KODE KEBUN, AFD, TT, BLOK, LUAS, INV, JENIS PUPUK, APLIKASI, DOSIS, KG PUPUK</b><br/>" +
              "Kolom <b>TANGGAL</b> bersifat opsional.",
            icon: "error",
            confirmButtonText: "OK",
          });
          return;
        }

        // Helper: cari index di BAGIAN KIRI (sebelum kolom TANGGAL realisasi)
        const findIdxLeft = (...candidates: string[]) => {
          const candNorms = candidates.map(normalize);
          const end =
            idxTanggalBoundary === -1
              ? headerNorm.length
              : idxTanggalBoundary;
          for (let i = 0; i < end; i++) {
            if (candNorms.includes(headerNorm[i])) return i;
          }
          return -1;
        };

        // Kalau tidak ada boundary TANGGAL (sheet murni Rencana), izinkan full-row
        const findIdxFallback = (...candidates: string[]) => {
          const candNorms = candidates.map(normalize);
          return headerNorm.findIndex((col) => candNorms.includes(col));
        };

        const finder =
          idxTanggalBoundary === -1 ? findIdxFallback : findIdxLeft;

        const idxKebun = finder("KEBUN");
        const idxKodeKebun = finder("KODEKEBUN", "KODE_KEBUN", "KODE KEBUN");
        const idxTanggal = finder("TANGGAL", "TGL"); // opsional
        const idxAfd = finder("AFD", "AFDELING");
        const idxTt = finder("TT", "TAHUNTANAM", "THNTANAM", "TAHUN TANAM");
        const idxBlok = finder("BLOK");
        const idxLuas = finder("LUAS", "LUASHA", "LUAS (HA)");
        const idxInv = finder("INV", "POKOK", "JUMLAHPOKOK", "JUMLAH POKOK");
        const idxJenisPupuk = finder(
          "JENISPUPUK",
          "JENIS PUPUK",
          "PUPUK"
        );
        const idxAplikasi = finder(
          "APLIKASI",
          "APLIKASIKE",
          "APLIKASI (KE-)"
        );
        const idxDosis = finder(
          "DOSIS",
          "DOSISKGPOKOK",
          "DOSIS (KG/POKOK)"
        );
        const idxKgPupuk = finder(
          "KGPUPUK",
          "KGPUPUKTOTAL",
          "KGPUKUP",
          "KG PUPUK",
          "KG PUPUK (TOTAL)"
        );

        const requiredIdx = [
          idxKebun,
          idxKodeKebun,
          idxAfd,
          idxTt,
          idxBlok,
          idxLuas,
          idxInv,
          idxJenisPupuk,
          idxAplikasi,
          idxDosis,
          idxKgPupuk,
        ];

        if (requiredIdx.some((i) => i === -1)) {
          console.log("HEADER RENCANA NORMALIZED:", headerNorm, {
            idxKebun,
            idxKodeKebun,
            idxTanggal,
            idxAfd,
            idxTt,
            idxBlok,
            idxLuas,
            idxInv,
            idxJenisPupuk,
            idxAplikasi,
            idxDosis,
            idxKgPupuk,
          });

          Swal.fire({
            title: "Header Rencana tidak lengkap",
            html:
              "Berhasil membaca sheet, tetapi kolom Rencana belum lengkap.<br/>" +
              "Pastikan di tabel Rencana (bagian kiri) ada header:<br/>" +
              "<b>KEBUN, KODE KEBUN, AFD, TT, BLOK, LUAS, INV, JENIS PUPUK, APLIKASI, DOSIS, KG PUPUK</b><br/>" +
              "Kolom <b>TANGGAL</b> boleh tidak ada.",
            icon: "error",
            confirmButtonText: "OK",
          });
          return;
        }

        // === KUMPULKAN PAYLOAD UNTUK BULK INSERT ===
        type BulkPayload = {
          kategori: string;
          kebun: string;
          kode_kebun: string;
          tanggal: string | null | "-";
          afd: string;
          tt: string;
          blok: string;
          luas: number;
          inv: number;
          jenis_pupuk: string;
          aplikasi: number;
          dosis: number;
          kg_pupuk: number;
        };

        const payloads: BulkPayload[] = [];

        // forward-fill kebun & kode kebun (karena merge)
        let lastKebun = "";
        let lastKodeKebun = "";

        let started = false;
        let emptyAfterData = 0;
        const MAX_EMPTY_AFTER_DATA = 5;

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) {
            if (started) {
              emptyAfterData++;
              if (emptyAfterData >= MAX_EMPTY_AFTER_DATA) break;
            }
            continue;
          }

          const kebunRaw = row[idxKebun];
          const kodeKebunRaw = row[idxKodeKebun];
          const tanggalRaw = idxTanggal >= 0 ? row[idxTanggal] : "";

          const luasCell = idxLuas >= 0 ? row[idxLuas] : "";
          const invCell = row[idxInv];

          const jenisPupukCell =
            idxJenisPupuk >= 0 ? row[idxJenisPupuk] : "";
          const aplikasiCell = idxAplikasi >= 0 ? row[idxAplikasi] : "";
          const dosisCell = idxDosis >= 0 ? row[idxDosis] : "";
          const kgPupukCell =
            idxKgPupuk >= 0 ? row[idxKgPupuk] : "";

          const isRowEmpty =
            String(kebunRaw ?? "").trim() === "" &&
            String(kodeKebunRaw ?? "").trim() === "" &&
            String(tanggalRaw ?? "").trim() === "" &&
            String(luasCell ?? "").trim() === "" &&
            String(invCell ?? "").trim() === "" &&
            String(jenisPupukCell ?? "").trim() === "" &&
            String(aplikasiCell ?? "").trim() === "" &&
            String(dosisCell ?? "").trim() === "" &&
            String(kgPupukCell ?? "").trim() === "";

          if (isRowEmpty) {
            if (started) {
              emptyAfterData++;
              if (emptyAfterData >= MAX_EMPTY_AFTER_DATA) break;
            }
            continue;
          }

          started = true;
          emptyAfterData = 0;

          // forward-fill kebun & kode kebun
          let kebunStr = String(kebunRaw ?? "").trim();
          let kodeKebunStr = String(kodeKebunRaw ?? "").trim();

          if (kebunStr) {
            lastKebun = kebunStr;
          } else if (lastKebun) {
            kebunStr = lastKebun;
          }

          if (kodeKebunStr) {
            lastKodeKebun = kodeKebunStr;
          } else if (lastKodeKebun) {
            kodeKebunStr = lastKodeKebun;
          }

          if (!kebunStr) kebunStr = "-";
          if (!kodeKebunStr) kodeKebunStr = "-";

          const parsedDate = tanggalRaw
            ? toIsoDateJakarta(tanggalRaw)
            : "";

          let tanggalFinal: string | null | "-" = null;
          if (!tanggalRaw || String(tanggalRaw).trim() === "") {
            tanggalFinal = null;
          } else if (parsedDate) {
            tanggalFinal = parsedDate;
          } else {
            tanggalFinal = "-";
          }

          const afdStr =
            idxAfd >= 0 ? (String(row[idxAfd] ?? "").trim() || "-") : "-";

          const ttStr =
            idxTt >= 0 ? (String(row[idxTt] ?? "").trim() || "-") : "-";

          const blokStr =
            idxBlok >= 0
              ? (String(row[idxBlok] ?? "").trim().toUpperCase() || "-")
              : "-";

          const jenisPupukStr =
            idxJenisPupuk >= 0
              ? (String(jenisPupukCell ?? "").trim() || "-")
              : "-";

          const invNum = toNumberLoose(invCell);
          const luasNum = toNumberLoose(luasCell);

          const aplikasiStr = String(aplikasiCell ?? "").trim();
          const dosisStr = String(dosisCell ?? "").trim();
          const kgPupukStr = String(kgPupukCell ?? "").trim();

          let aplikasiNum = aplikasiStr ? toNumberLoose(aplikasiStr) : 0;
          let dosisNum = dosisStr ? toNumberLoose(dosisStr) : 0;
          let kgPupukNum = kgPupukStr ? toNumberLoose(kgPupukStr) : 0;

          if (!Number.isFinite(aplikasiNum)) aplikasiNum = 0;
          if (!Number.isFinite(dosisNum)) dosisNum = 0;
          if (!Number.isFinite(kgPupukNum)) kgPupukNum = 0;

          // kalau di Excel KG PUPUK kosong → hitung INV * DOSIS
          if (kgPupukNum === 0 && invNum > 0 && dosisNum > 0) {
            kgPupukNum = invNum * dosisNum;
          }

          const hasPlanData =
            (tanggalFinal && tanggalFinal !== "-") ||
            invNum > 0 ||
            luasNum > 0 ||
            (jenisPupukStr && jenisPupukStr !== "-") ||
            aplikasiNum > 0 ||
            dosisNum > 0 ||
            kgPupukNum > 0;

          if (!hasPlanData) {
            emptyAfterData++;
            if (emptyAfterData >= MAX_EMPTY_AFTER_DATA) break;
            continue;
          }

          emptyAfterData = 0;

          payloads.push({
            kategori: form.kategori,
            kebun: kebunStr,
            kode_kebun: kodeKebunStr,
            tanggal: tanggalFinal,
            afd: afdStr,
            tt: ttStr,
            blok: blokStr,
            luas: luasNum,
            inv: Math.round(invNum),
            jenis_pupuk: jenisPupukStr,
            aplikasi: aplikasiNum || 1,
            dosis: dosisNum,
            kg_pupuk: kgPupukNum,
          });
        }

        if (!payloads.length) {
          Swal.fire({
            title: "Tidak ada data",
            text: "Tidak ada baris valid yang dapat diimport dari tabel Rencana (bagian kiri).",
            icon: "warning",
            confirmButtonText: "OK",
          });
          return;
        }

        // === KIRIM BULK DALAM CHUNK (untuk >500 baris) ===
        const CHUNK_SIZE = 500;
        let totalInserted = 0;
        let totalSent = 0;

        for (let i = 0; i < payloads.length; i += CHUNK_SIZE) {
          const chunk = payloads.slice(i, i + CHUNK_SIZE);
          totalSent += chunk.length;

          try {
            const res = await fetch("/api/pemupukan/rencana", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(chunk), // kirim array
            });

            if (!res.ok) {
              console.error("Bulk import error status:", res.status);
              continue;
            }

            const json = await res.json().catch(() => null as unknown);
            const insertedFromApi =
              json && typeof json === "object" && "count" in json
                ? Number((json as { count: number }).count)
                : 0;

            totalInserted += insertedFromApi;
          } catch (err) {
            console.error("Bulk chunk error:", err);
          }
        }

        const totalFailed = totalSent - totalInserted;

        Swal.fire({
          title: "Import selesai",
          html: `Berhasil import <b>${totalInserted}</b> baris Rencana.<br/>Gagal / terlewat <b>${totalFailed}</b> baris.`,
          icon:
            totalInserted > 0 && totalFailed === 0 ? "success" : "warning",
          confirmButtonText: "OK",
        });
      } catch (err) {
        console.error(err);
        Swal.fire({
          title: "Gagal membaca Excel",
          text:
            "Terjadi kesalahan saat membaca file Excel. Pastikan format file sudah benar.",
          icon: "error",
          confirmButtonText: "OK",
        });
      } finally {
        setImporting(false);
      }
    },
    [form.kategori]
  );

  return (
    <section id="rencana-tambah" className="space-y-3 scroll-mt-24">
      <SectionHeader
        title="Rencana Pemupukan - Tambah Data"
        desc="Isi data rencana secara manual atau import dari Excel."
      />

      <Card className="glass-surface rounded-2xl border border-[--glass-border] shadow-[0_18px_45px_rgba(3,18,9,0.85)]">
        <CardHeader className="pb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-[13px] text-emerald-50">
            Formulir Rencana
          </CardTitle>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleImportExcel}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 border-emerald-600/70 text-emerald-50 hover:bg-emerald-900/70"
                disabled={importing}
              >
                <Upload className="h-4 w-4" />
                {importing ? "Import..." : "Import dari Excel"}
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
