"use client";

import React, { useMemo, useState } from "react";
import SectionHeader from "../components/SectionHeader";
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
import { KEBUN_LABEL } from "../constants";
import { RefreshCcw, Save, Upload } from "lucide-react";
import Swal from "sweetalert2";
import { toIsoDateJakarta } from "../dateHelpers";

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

// normalisasi header untuk matching fleksibel
const normalize = (s: string) =>
  String(s ?? "")
    .normalize("NFKD")
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase();

// cari kandidat sebelum index tertentu (untuk KEBUN, KODE KEBUN, AFD, dll)
function findBefore(
  header: string[],
  startIdx: number,
  candidates: string[]
): number {
  const candNorm = candidates.map(normalize);
  for (let i = startIdx - 1; i >= 0; i--) {
    if (candNorm.includes(header[i])) return i;
  }
  return -1;
}

// cari kandidat setelah index tertentu (untuk TT, BLOK, LUAS, dst)
function findAfter(
  header: string[],
  startIdx: number,
  candidates: string[]
): number {
  const candNorm = candidates.map(normalize);
  for (let i = startIdx + 1; i < header.length; i++) {
    if (candNorm.includes(header[i])) return i;
  }
  return -1;
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
        aplikasi: Number(toNumberLoose(form.aplikasi)),
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

  const handleImportExcel = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
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
        cellDates: false,
      });

      const sheetNames = workbook.SheetNames;
      if (!sheetNames.length) {
        await Swal.fire({
          title: "File kosong",
          text: "Workbook tidak memiliki sheet.",
          icon: "warning",
        });
        setImporting(false);
        return;
      }

      // === PILIH SHEET ===
      let selectedSheetName = sheetNames[0];

      if (sheetNames.length > 1) {
        const { value: picked } = await Swal.fire({
          title: "Pilih Sheet",
          text: "Pilih nama sheet yang berisi data realisasi pemupukan.",
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
          setImporting(false);
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

      // === CARI HEADER REALISASI ===
      let realHeaderRowIndex = -1;
      let realHeaderNorm: string[] = [];
      let idxTanggal = -1;

      const maxScan = Math.min(rows.length, 20); // scan 20 baris teratas saja
      for (let rIdx = 0; rIdx < maxScan; rIdx++) {
        const norm = rows[rIdx].map((h) => normalize(String(h ?? "")));
        const tIndex = norm.findIndex(
          (c) => c === "TANGGAL" || c === "TGL"
        );
        if (tIndex !== -1) {
          realHeaderRowIndex = rIdx;
          realHeaderNorm = norm;
          idxTanggal = tIndex;
          break;
        }
      }

      if (realHeaderRowIndex === -1 || idxTanggal === -1) {
        console.log("DEBUG rows[0..5] = ", rows.slice(0, 5));
        Swal.fire({
          title: "Header Realisasi tidak ditemukan",
          html:
            "Tidak dapat menemukan header tabel Realisasi.<br/>" +
            "Pastikan ada kolom <b>TANGGAL</b> di bagian kanan sheet (tabel Realisasi).",
          icon: "error",
          confirmButtonText: "OK",
        });
        return;
      }

      // === MAPPING KOLOM RELATIF TANGGAL ===
      const idxAfd = findBefore(realHeaderNorm, idxTanggal, [
        "AFD",
        "AFDELING",
      ]);
      const idxKodeKebun = findBefore(realHeaderNorm, idxAfd, [
        "KODEKEBUN",
        "KODE_KEBUN",
      ]);
      const idxKebun = findBefore(realHeaderNorm, idxKodeKebun, ["KEBUN"]);

      const idxTt = findAfter(realHeaderNorm, idxTanggal, [
        "TT",
        "TAHUNTANAM",
      ]);
      const idxBlok = findAfter(realHeaderNorm, idxTt, ["BLOK"]);
      const idxLuas = findAfter(realHeaderNorm, idxBlok, [
        "LUAS",
        "LUASHA",
      ]);
      const idxInv = findAfter(realHeaderNorm, idxLuas, [
        "INV",
        "POKOK",
        "JUMLAHPOKOK",
      ]);
      const idxJenisPupuk = findAfter(realHeaderNorm, idxInv, [
        "JENISPUPUK",
        "PUPUK",
      ]);
      const idxAplikasi = findAfter(realHeaderNorm, idxJenisPupuk, [
        "APLIKASI",
        "APLIKASIKE",
      ]);
      const idxDosis = findAfter(realHeaderNorm, idxAplikasi, [
        "DOSIS",
        "DOSISKGPOKOK",
      ]);
      const idxKgPupuk = findAfter(realHeaderNorm, idxDosis, [
        "KGPUKUP",
        "KGPUPUK",
        "KGPUPUKTOTAL",
      ]);

      const requiredIdx = [
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
      ];

      if (requiredIdx.some((i) => i === -1)) {
        console.log("HEADER REALISASI NORMALIZED:", realHeaderNorm, {
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
          title: "Header Realisasi tidak lengkap",
          html:
            "Berhasil menemukan kolom <b>TANGGAL</b>, tetapi kolom lain belum lengkap.<br/>" +
            "Pastikan di tabel Realisasi ada header:<br/>" +
            "<b>KEBUN, KODE KEBUN, AFD, TANGGAL, TT, BLOK, LUAS, INV, JENIS PUPUK, APLIKASI, DOSIS, KG PUPUK</b>",
          icon: "error",
          confirmButtonText: "OK",
        });
        return;
      }

      // === KUMPULKAN PAYLOAD REALISASI ===
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

      // berhenti setelah beberapa baris realisasi kosong berturut-turut
      let started = false;
      let emptyAfterData = 0;
      const MAX_EMPTY_AFTER_DATA = 5;

      for (let i = realHeaderRowIndex + 1; i < rows.length; i++) {
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
        const tanggalRaw = row[idxTanggal];

        const luasCell = idxLuas >= 0 ? row[idxLuas] : "";
        const invCell = row[idxInv];
        const jenisPupukCell = idxJenisPupuk >= 0 ? row[idxJenisPupuk] : "";
        const aplikasiCell = idxAplikasi >= 0 ? row[idxAplikasi] : "";
        const dosisCell = idxDosis >= 0 ? row[idxDosis] : "";
        const kgPupukCell = idxKgPupuk >= 0 ? row[idxKgPupuk] : "";

        // cek baris kosong berdasarkan kolom realisasi
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

        // mulai data realisasi
        started = true;
        emptyAfterData = 0;

        // ---- forward-fill kebun & kode kebun ----
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

        // ---- tanggal (pakai helper timezone Jakarta) ----
        const parsedDate = toIsoDateJakarta(tanggalRaw ?? "");
        let tanggalFinal: string | null | "-" = null;

        if (!tanggalRaw || String(tanggalRaw).trim() === "") {
          tanggalFinal = null; // tanggal kosong → null
        } else if (parsedDate) {
          tanggalFinal = parsedDate; // tanggal valid → "YYYY-MM-DD"
        } else {
          tanggalFinal = "-"; // ada isi tapi tak bisa diparse
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

        // filter: hanya baris yang benar-benar punya data realisasi
        const hasRealData =
          (tanggalFinal && tanggalFinal !== "-") ||
          invNum > 0 ||
          luasNum > 0 ||
          (jenisPupukStr && jenisPupukStr !== "-") ||
          aplikasiNum > 0 ||
          dosisNum > 0 ||
          kgPupukNum > 0;

        if (!hasRealData) {
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
          aplikasi: aplikasiNum,
          dosis: dosisNum,
          kg_pupuk: kgPupukNum,
        });
      }

      if (!payloads.length) {
        Swal.fire({
          title: "Tidak ada data",
          text: "Tidak ada baris valid pada tabel Realisasi yang dapat diimport.",
          icon: "warning",
          confirmButtonText: "OK",
        });
        return;
      }

      // === KIRIM BULK DALAM CHUNK (untuk >500 baris) ===
      const CHUNK_SIZE = 300;
      let totalInserted = 0;
      let totalSent = 0;

      for (let i = 0; i < payloads.length; i += CHUNK_SIZE) {
        const chunk = payloads.slice(i, i + CHUNK_SIZE);
        totalSent += chunk.length;

        try {
          const res = await fetch("/api/pemupukan/realisasi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(chunk), // kirim array
          });

          if (!res.ok) {
            console.error("Bulk import error status:", res.status);
            continue;
          }

          const json = (await res.json().catch(
            () => null as unknown
          )) as { count?: number } | null;
          const insertedFromApi = json?.count ?? 0;

          totalInserted += insertedFromApi;
        } catch (err) {
          console.error("Bulk chunk error:", err);
        }
      }

      const totalFailed = totalSent - totalInserted;

      Swal.fire({
        title: "Import selesai",
        html: `Berhasil import <b>${totalInserted}</b> baris dari tabel Realisasi.<br/>Gagal / terlewat <b>${totalFailed}</b> baris.`,
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
  };

  return (
    <section id="real-tambah" className="space-y-2 scroll-mt-24">
      <SectionHeader
        title="Realisasi Pemupukan - Tambah Data"
        desc="Isi data realisasi secara manual atau import dari Excel."
      />

      <Card className="bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-[13px]">Formulir Realisasi</CardTitle>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2">
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
                className="gap-2"
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

        <CardContent className="pt-2">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Kategori */}
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Kategori Tanaman
              </p>
              <div className="max-w-xs">
                <Select
                  value={form.kategori}
                  onValueChange={(v) => onChange("kategori", v as Kategori)}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Pilih kategori (TM / TBM / BIBITAN)" />
                  </SelectTrigger>
                  <SelectContent>
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
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Identitas Lokasi
              </p>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-4">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    Nama Kebun
                  </label>
                  <Select
                    value={form.kebun}
                    onValueChange={(v) => onChange("kebun", v)}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Pilih kebun" />
                    </SelectTrigger>
                    <SelectContent>
                      {kebunOptions.map((o) => (
                        <SelectItem key={o.code} value={o.code}>
                          {o.name} ({o.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-12 md:col-span-4">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    Kode Kebun
                  </label>
                  <Input
                    value={form.kodeKebun}
                    onChange={(e) =>
                      onChange("kodeKebun", e.target.value.toUpperCase())
                    }
                    placeholder="mis. 3E18"
                    className="h-10"
                  />
                </div>
                <div className="col-span-12 md:col-span-4">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tanggal
                  </label>
                  <Input
                    type="date"
                    value={form.tanggal}
                    onChange={(e) => onChange("tanggal", e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="col-span-6 md:col-span-3">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    AFD
                  </label>
                  <Select
                    value={form.afd}
                    onValueChange={(v) => onChange("afd", v)}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="AFD" />
                    </SelectTrigger>
                    <SelectContent>
                      {AFD_OPTIONS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-6 md:col-span-3">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    TT (Tahun Tanam)
                  </label>
                  <Input
                    inputMode="numeric"
                    value={form.tt}
                    onChange={(e) =>
                      onChange("tt", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="mis. 2004"
                    className="h-10"
                    maxLength={4}
                  />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    Blok
                  </label>
                  <Input
                    value={form.blok}
                    onChange={(e) =>
                      onChange("blok", e.target.value.toUpperCase())
                    }
                    placeholder="mis. D6"
                    className="h-10"
                  />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    Luas (Ha)
                  </label>
                  <Input
                    inputMode="decimal"
                    value={form.luas}
                    onChange={(e) => onChange("luas", e.target.value)}
                    placeholder="mis. 29,82"
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* Detail Pemupukan */}
            <div className="space-y-3">
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Detail Pemupukan
              </p>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-6 md:col-span-2">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
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
                    className="h-10"
                  />
                </div>

                <div className="col-span-12 md:col-span-3">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    Jenis Pupuk
                  </label>
                  <Select
                    value={form.jenisPupuk}
                    onValueChange={(v) => onChange("jenisPupuk", v)}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Pilih jenis pupuk" />
                    </SelectTrigger>
                    <SelectContent>
                      {JENIS_PUPUK.map((j) => (
                        <SelectItem key={j} value={j}>
                          {j.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-6 md:col-span-2">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
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
                    className="h-10"
                  />
                </div>

                <div className="col-span-6 md:col-span-2">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
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
                    className="h-10"
                  />
                </div>

                <div className="col-span-12 md:col-span-3">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400">
                    KG Pupuk (Total) — otomatis = INV × Dosis
                  </label>
                  <Input
                    inputMode="decimal"
                    value={form.kgPupuk}
                    readOnly
                    className="h-10 bg-slate-50 dark:bg-slate-900/40"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" disabled={submitting} className="gap-2">
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
                className="gap-2"
                onClick={reset}
              >
                <RefreshCcw className="h-4 w-4" /> Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {importing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg">
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
            <span className="text-sm text-slate-700">
              Mengimport data dari Excel (bulk), mohon tunggu...
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
