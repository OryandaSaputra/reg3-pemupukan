// src/app/pemupukan/_components/dashboard/visualisasi/CurahHujanSection.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  LabelList,
} from "recharts";

import ChartCard from "../../shared/ChartCard";
import { KEBUN_LABEL, KEBUN_ORDER } from "../../../_config/constants"; import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { motion } from "framer-motion";

// =======================[ HELPER WAKTU ASIA/JAKARTA ]=======================

/**
 * Konversi "sekarang" ke tanggal di zona waktu Asia/Jakarta (UTC+7),
 * lalu kembalikan sebagai string "YYYY-MM-DD" untuk input type="date".
 *
 * Ini TIDAK tergantung timezone browser/server.
 */
function getTodayJakartaString(): string {
  const now = new Date();

  // Waktu UTC dalam ms
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;

  // Tambah offset Asia/Jakarta +7 jam
  const jakartaMs = utcMs + 7 * 60 * 60 * 1000;
  const jakarta = new Date(jakartaMs);

  const yyyy = jakarta.getUTCFullYear();
  const mm = String(jakarta.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(jakarta.getUTCDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Dapatkan string tanggal "YYYY-MM-DD" untuk hari pertama dari bulan
 * berjalan di zona waktu Asia/Jakarta.
 */
function getFirstDayOfCurrentMonthJakartaString(): string {
  const now = new Date();

  // Waktu UTC sekarang
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;

  // Konversi ke Asia/Jakarta
  const jakartaMs = utcMs + 7 * 60 * 60 * 1000;
  const jakarta = new Date(jakartaMs);

  const year = jakarta.getUTCFullYear();
  const month = jakarta.getUTCMonth(); // 0-based

  // Buat Date di UTC yang mewakili "tanggal 1 bulan ini"
  const firstJakarta = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

  const yyyy = firstJakarta.getUTCFullYear();
  const mm = String(firstJakarta.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(firstJakarta.getUTCDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

// =======================[ TIPE DATA & CONSTANT ]===========================

// Tipe data yang dipakai Recharts & tabel
type RainChartItem = {
  kebunCode: string;
  kebunName: string;
  dailyMm: number; // curah hujan di tanggal harian
  mtdMm: number; // total pada range filter (start–end)
};

/**
 * Pasangan warna per kebun:
 * - dark  → untuk bar total (mtdMm)
 * - light → untuk bar harian (dailyMm)
 */
const KEBUN_COLOR_PAIRS: { dark: string; light: string }[] = [
  { dark: "#1D4ED8", light: "#60A5FA" }, // blue
  { dark: "#0F766E", light: "#5EEAD4" }, // teal
  { dark: "#7C2D12", light: "#FDBA74" }, // orange/brown
  { dark: "#6D28D9", light: "#A78BFA" }, // purple
  { dark: "#B91C1C", light: "#FCA5A5" }, // red
  { dark: "#854D0E", light: "#FACC15" }, // amber
  { dark: "#0369A1", light: "#38BDF8" }, // sky
  { dark: "#14532D", light: "#4ADE80" }, // green
  { dark: "#BE123C", light: "#F472B6" }, // pink
];

function getKebunColorPair(index: number) {
  return KEBUN_COLOR_PAIRS[index % KEBUN_COLOR_PAIRS.length];
}

/** Tipe props sederhana untuk tooltip */
type RainTooltipProps = {
  active?: boolean;
  payload?: { payload: RainChartItem }[];
  label?: string | number;
  dailyDate?: string;
};

/**
 * Tooltip kustom supaya rapi
 */
const RainTooltip: React.FC<RainTooltipProps> = ({
  active,
  payload,
  dailyDate,
}) => {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload as RainChartItem;
  if (!item) return null;

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-slate-950/80 px-3 py-2 text-xs text-slate-50 shadow-lg backdrop-blur">
      <div className="font-semibold">
        {item.kebunCode} — {item.kebunName}
      </div>
      <div className="mt-1 space-y-0.5 text-[11px] text-slate-300">
        <div>
          Harian{" "}
          {dailyDate ? <span className="font-mono">({dailyDate})</span> : null}
          :{" "}
          <span className="font-mono font-semibold">
            {item.dailyMm} mm
          </span>
        </div>
        <div>
          Total periode (range):{" "}
          <span className="font-mono font-semibold">
            {item.mtdMm} mm
          </span>
        </div>
      </div>
    </div>
  );
};

/** Normalisasi nama header supaya kebal spasi, simbol, dan kapitalisasi */
function normalizeHeaderName(s: string): string {
  return String(s ?? "")
    .normalize("NFKD")
    .replace(/\s+/g, "") // buang spasi
    .replace(/[^A-Z0-9]/gi, "") // buang simbol
    .toUpperCase();
}

/** Maksimal baris per request ke backend */
const CHUNK_SIZE = 500;

/** Instance SweetAlert2 dengan style glassmorphism dashboard */
const glassSwal = Swal.mixin({
  background: "transparent",
  color: "#e5e7eb",
  buttonsStyling: false,
  customClass: {
    popup:
      "rounded-2xl border border-emerald-400/30 bg-slate-950/80 backdrop-blur-2xl shadow-[0_18px_45px_rgba(6,40,18,0.85)]",
    title:
      "text-sm font-semibold text-emerald-50 border-b border-emerald-500/20 px-4 pt-4 pb-2 text-left",
    htmlContainer: "px-4 pb-3 pt-2 text-xs text-slate-200 text-left",
    actions: "px-4 pb-4 flex gap-2 justify-end",
    confirmButton:
      "inline-flex items-center justify-center rounded-lg bg-emerald-500/90 hover:bg-emerald-400 text-[11px] font-semibold px-3 py-1.5 text-slate-950 shadow-md",
    cancelButton:
      "inline-flex items-center justify-center rounded-lg border border-slate-500/50 bg-slate-900/60 hover:bg-slate-800/70 text-[11px] font-medium px-3 py-1.5 text-slate-100",
    denyButton:
      "inline-flex items-center justify-center rounded-lg bg-red-500/90 hover:bg-red-400 text-[11px] font-semibold px-3 py-1.5 text-slate-950 shadow-md",
    input:
      "rounded-lg border border-emerald-400/60 bg-slate-900 text-xs text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400/80",
  },
});

// ========================================================================

export default function CurahHujanSection() {
  // Tanggal harian (untuk bar daily) → default: hari ini di Asia/Jakarta
  const [dailyDate, setDailyDate] = useState<string>(() =>
    getTodayJakartaString()
  );

  // Range tanggal untuk TOTAL (bar mtd) → default: awal bulan s/d hari ini (Asia/Jakarta)
  const [rangeStart, setRangeStart] = useState<string>(() =>
    getFirstDayOfCurrentMonthJakartaString()
  );
  const [rangeEnd, setRangeEnd] = useState<string>(() =>
    getTodayJakartaString()
  );

  const [selectedKebun, setSelectedKebun] = useState<string>("");
  const [chartData, setChartData] = useState<RainChartItem[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [importing, setImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);

  const kebunOptions = useMemo(
    () =>
      KEBUN_ORDER.map((code) => ({
        code,
        name: KEBUN_LABEL[code] ?? code,
      })),
    []
  );

  /**
   * Ambil data curah hujan:
   * - dailyDate: harian di tanggal ini (untuk bar daily)
   * - rangeStart & rangeEnd: total range (untuk bar total)
   *
   * Lalu merge dengan seluruh daftar kebun,
   * sehingga setiap kebun SELALU muncul di chart & tabel.
   */
  const fetchChartData = useCallback(
    async (dailyDateStr: string, startDateStr: string, endDateStr: string) => {
      setLoadingChart(true);
      try {
        const params = new URLSearchParams({
          dailyDate: dailyDateStr,
          start: startDateStr,
          end: endDateStr,
        });

        const res = await fetch(`/api/curah-hujan?${params.toString()}`);
        if (!res.ok) {
          console.error("Gagal fetch curah hujan", await res.text());
          return;
        }
        const json = (await res.json()) as {
          kebunCode: string;
          kebunName: string;
          dailyMm: number;
          mtdMm: number;
        }[];

        // Map hasil API per kebunCode
        const apiMap = new Map<
          string,
          {
            kebunCode: string;
            kebunName: string;
            dailyMm: number;
            mtdMm: number;
          }
        >();
        for (const row of json) {
          apiMap.set(row.kebunCode, {
            kebunCode: row.kebunCode,
            kebunName: row.kebunName,
            dailyMm: row.dailyMm ?? 0,
            mtdMm: row.mtdMm ?? 0,
          });
        }

        // Merge dengan seluruh kebunOptions
        const merged: RainChartItem[] = kebunOptions.map((k) => {
          const found = apiMap.get(k.code);
          return {
            kebunCode: k.code,
            kebunName: k.name,
            dailyMm: found?.dailyMm ?? 0,
            mtdMm: found?.mtdMm ?? 0,
          };
        });

        setChartData(merged);
      } catch (err) {
        console.error("fetchChartData error", err);
      } finally {
        setLoadingChart(false);
      }
    },
    [kebunOptions]
  );

  // load awal & re-fetch saat dailyDate / rangeStart / rangeEnd berubah
  useEffect(() => {
    if (dailyDate && rangeStart && rangeEnd) {
      void fetchChartData(dailyDate, rangeStart, rangeEnd);
    }
  }, [dailyDate, rangeStart, rangeEnd, fetchChartData]);

  /**
   * Klik tombol "Import Excel Curah Hujan"
   */
  const handleClickImportButton = useCallback(() => {
    if (!selectedKebun) {
      void glassSwal.fire({
        icon: "warning",
        title: "Kebun belum dipilih",
        html: `
          <div class="text-xs text-slate-200">
            Pilih kebun terlebih dahulu. Kebun ini akan dipakai untuk semua baris di file.
          </div>
        `,
        confirmButtonText: "OK",
      });
      return;
    }

    fileInputRef.current?.click();
  }, [selectedKebun]);

  /**
   * Export PDF (maks ±1 MB, judul rata tengah)
   */
  const handleExportPdf = useCallback(async () => {
    if (!chartRef.current) {
      await glassSwal.fire({
        icon: "info",
        title: "Grafik belum siap",
        html: `
          <div class="text-xs text-slate-200">
            Grafik belum dapat diexport. Pastikan data sudah tampil terlebih dahulu.
          </div>
        `,
      });
      return;
    }

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      // Render area chart ke canvas
      const canvas = await html2canvas(chartRef.current, {
        scale: 2,
        backgroundColor: "#020617", // bg-slate-950
      });

      const pageTitle = "Curah Hujan per Kebun";
      const pageSubtitle = `Harian ${dailyDate || "-"} • Total ${rangeStart || "-"
        } s/d ${rangeEnd || "-"}`;
      const fileName = `curah-hujan-${dailyDate || "periode"}.pdf`;

      const maxBytes = 1024 * 1024; // 1 MB
      const qualitySteps = [0.9, 0.7, 0.5, 0.35];

      for (let i = 0; i < qualitySteps.length; i += 1) {
        const q = qualitySteps[i];

        // JPEG jauh lebih kecil dari PNG
        const imgData = canvas.toDataURL("image/jpeg", q);

        const pdf = new jsPDF("landscape", "pt", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const marginSide = 40;
        const chartTopY = 70;
        const chartBottomMargin = 40;
        const availableHeight = pageHeight - chartTopY - chartBottomMargin;

        let imgWidth = pageWidth - marginSide * 2;
        let imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (imgHeight > availableHeight) {
          const ratio = availableHeight / imgHeight;
          imgHeight = availableHeight;
          imgWidth *= ratio;
        }

        const imgX = (pageWidth - imgWidth) / 2; // center
        const imgY = chartTopY;

        // Judul & subjudul rata tengah
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.text(pageTitle, pageWidth / 2, 28, { align: "center" });

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.text(pageSubtitle, pageWidth / 2, 44, { align: "center" });

        // Gambar chart
        pdf.addImage(imgData, "JPEG", imgX, imgY, imgWidth, imgHeight, "", "FAST");

        const blob = pdf.output("blob") as Blob;
        const sizeOk = blob.size <= maxBytes || i === qualitySteps.length - 1;

        if (sizeOk) {
          pdf.save(fileName);
          break;
        }
      }
    } catch (err) {
      console.error("Export PDF curah hujan error:", err);
      await glassSwal.fire({
        icon: "error",
        title: "Gagal export PDF",
        html: `
          <div class="text-xs text-slate-200">
            Terjadi kesalahan saat membuat file PDF.<br/>
            Pastikan koneksi stabil lalu coba lagi.
          </div>
        `,
      });
    }
  }, [dailyDate, rangeStart, rangeEnd]);

  /**
   * Import Excel
   */
  const handleImportExcel = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ""; // allow re-upload same file
      if (!file) return;

      // Double safety: cek kebun lagi
      if (!selectedKebun) {
        void glassSwal.fire({
          icon: "warning",
          title: "Kebun belum dipilih",
          html: `
            <div class="text-xs text-slate-200">
              Pilih kebun terlebih dahulu sebelum import.
            </div>
          `,
          confirmButtonText: "OK",
        });
        return;
      }

      try {
        setImporting(true);

        const buf = await file.arrayBuffer();
        const workbook = XLSX.read(buf, { type: "array" });

        const sheetNames = workbook.SheetNames;
        if (!sheetNames.length) {
          await glassSwal.fire({
            icon: "warning",
            title: "File kosong",
            html: `
              <div class="text-xs text-slate-200">
                Workbook tidak memiliki sheet.
              </div>
            `,
          });
          return;
        }

        const firstSheet = workbook.Sheets[sheetNames[0]];

        // Baca sebagai array per baris
        const rows = XLSX.utils.sheet_to_json<(string | number)[]>(
          firstSheet,
          {
            header: 1,
            defval: "",
          }
        );

        if (!rows.length) {
          await glassSwal.fire({
            icon: "warning",
            title: "Sheet kosong",
            html: `
              <div class="text-xs text-slate-200">
                Sheet tidak memiliki data.
              </div>
            `,
          });
          return;
        }

        // Cari baris yang mengandung header Datetime + Rainfall
        let headerRowIndex = -1;
        let headerRow: (string | number)[] = [];

        const maxScan = Math.min(rows.length, 20); // scan max 20 baris pertama
        for (let i = 0; i < maxScan; i += 1) {
          const candidate = rows[i] as (string | number)[];
          const norm = candidate.map((c) => normalizeHeaderName(String(c)));

          const hasDatetime = norm.some(
            (h) =>
              h === "DATETIME" ||
              h === "DATE" ||
              h === "DATETIMESTAMP" ||
              h === "WAKTU"
          );
          const hasRainfall = norm.some(
            (h) =>
              h === "RAINFALL" ||
              h === "CURAHHUJAN" ||
              h === "RAIN" ||
              h === "RAINMM"
          );

          if (hasDatetime && hasRainfall) {
            headerRowIndex = i;
            headerRow = candidate;
            break;
          }
        }

        if (headerRowIndex === -1) {
          const firstRow = rows[0] ?? [];
          await glassSwal.fire({
            icon: "error",
            title: "Kolom tidak ditemukan",
            html: `
              <div class="text-xs text-slate-200">
                Kolom <b>Datetime</b> dan/atau <b>Rainfall</b> tidak ditemukan.<br/>
                Contoh baris awal yang terbaca:
                <code>${(firstRow as (string | number)[])
                .map((c) => String(c))
                .join(", ")}</code><br/>
                Pastikan ada satu baris header yang berisi kolom <b>Datetime</b> dan <b>Rainfall</b>.
              </div>
            `,
          });
          return;
        }

        const dataRows = rows.slice(headerRowIndex + 1);

        const headerNorm = headerRow.map((h) =>
          normalizeHeaderName(String(h))
        );

        const idxDatetime = headerNorm.findIndex(
          (h) =>
            h === "DATETIME" ||
            h === "DATE" ||
            h === "DATETIMESTAMP" ||
            h === "WAKTU"
        );
        const idxRainfall = headerNorm.findIndex(
          (h) =>
            h === "RAINFALL" ||
            h === "CURAHHUJAN" ||
            h === "RAIN" ||
            h === "RAINMM"
        );

        if (idxDatetime === -1 || idxRainfall === -1) {
          await glassSwal.fire({
            icon: "error",
            title: "Kolom tidak ditemukan",
            html: `
              <div class="text-xs text-slate-200">
                Kolom <b>Datetime</b> dan/atau <b>Rainfall</b> tidak ditemukan pada baris header.<br/>
                Header yang terdeteksi:
                <code>${headerRow.map((c) => String(c)).join(", ")}</code><br/>
                Pastikan header mengandung teks <b>Datetime</b> dan <b>Rainfall</b>.
              </div>
            `,
          });
          return;
        }

        // Map ke struktur yang dikirim ke backend
        const payloadRows: { Datetime: string; Rainfall: string | number }[] =
          [];

        for (const row of dataRows) {
          const cells = row as (string | number)[];
          const dt = cells[idxDatetime];
          const rf = cells[idxRainfall];

          const dtStr = String(dt ?? "").trim();
          if (!dtStr) continue; // skip baris kosong

          payloadRows.push({
            Datetime: dtStr,
            Rainfall: (rf as string | number) ?? "",
          });
        }

        if (!payloadRows.length) {
          await glassSwal.fire({
            icon: "warning",
            title: "Tidak ada data",
            html: `
              <div class="text-xs text-slate-200">
                Tidak ada baris valid yang punya nilai Datetime.
              </div>
            `,
          });
          return;
        }

        // ===================[ KIRIM DALAM BATCH 500 BARIS ]===================
        const totalRawRows = payloadRows.length;
        let totalDaysAggregated = 0;
        let batchIndex = 0;

        for (let i = 0; i < totalRawRows; i += CHUNK_SIZE) {
          batchIndex += 1;
          const chunk = payloadRows.slice(i, i + CHUNK_SIZE);

          const res = await fetch("/api/curah-hujan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kebunCode: selectedKebun,
              rows: chunk,
            }),
          });

          if (!res.ok) {
            const txt = await res.text();
            let msg =
              "Gagal menyimpan data curah hujan. Cek format file atau hubungi admin.";
            try {
              const parsed = JSON.parse(txt) as { message?: string };
              if (parsed?.message) msg = parsed.message;
            } catch {
              // abaikan parse error
            }

            console.error(
              "Import curah hujan gagal (batch %d): %s",
              batchIndex,
              txt
            );
            await glassSwal.fire({
              icon: "error",
              title: "Import gagal",
              html: `
                <div class="text-xs text-slate-200">
                  Import gagal pada batch ke-${batchIndex}.<br/>
                  Pesan: ${msg}
                </div>
              `,
            });
            return;
          }

          const json = (await res.json()) as { count?: number };
          totalDaysAggregated += json.count ?? 0;
        }

        await glassSwal.fire({
          icon: "success",
          title: "Import berhasil",
          html: `
            <div class="text-xs text-slate-200">
              Berhasil mengakumulasikan <b>${totalDaysAggregated}</b> hari curah hujan<br/>
              dari <b>${totalRawRows}</b> baris data untuk kebun
              <b>${KEBUN_LABEL[selectedKebun] ?? selectedKebun}</b>.<br/>
              Data dikirim dalam <b>${Math.ceil(
            totalRawRows / CHUNK_SIZE
          )}</b> batch (maks ${CHUNK_SIZE} baris per batch).
            </div>
          `,
          confirmButtonText: "OK",
        });

        // Setelah import, refresh chart untuk tanggal & range yang sedang dipilih
        if (dailyDate && rangeStart && rangeEnd) {
          await fetchChartData(dailyDate, rangeStart, rangeEnd);
        }
      } catch (err) {
        console.error("handleImportExcel error", err);
        await glassSwal.fire({
          icon: "error",
          title: "Terjadi kesalahan",
          html: `
            <div class="text-xs text-slate-200">
              Gagal membaca file Excel. Pastikan formatnya benar.
            </div>
          `,
        });
      } finally {
        setImporting(false);
      }
    },
    [selectedKebun, dailyDate, rangeStart, rangeEnd, fetchChartData]
  );

  /* =========================[ EDIT & DELETE HANDLER ]========================= */

  const handleEditRow = useCallback(
    async (row: RainChartItem) => {
      const { value: newValueRaw } = await glassSwal.fire({
        icon: "info",
        title: `Edit curah hujan – ${row.kebunCode}`,
        html: `
          <div class="text-xs text-slate-300 mb-2">
            Tanggal harian: <code>${dailyDate}</code><br/>
            Kebun: <b>${row.kebunCode} – ${row.kebunName}</b>
          </div>
        `,
        input: "number",
        inputLabel: "Curah hujan harian (mm)",
        inputValue: row.dailyMm,
        inputAttributes: {
          min: "0",
          step: "0.01",
        },
        showCancelButton: true,
        confirmButtonText: "Simpan",
        cancelButtonText: "Batal",
      });

      if (newValueRaw === undefined) return; // cancel

      const newValue = Number(newValueRaw);
      if (!Number.isFinite(newValue) || newValue < 0) {
        await glassSwal.fire({
          icon: "error",
          title: "Nilai tidak valid",
          html: `
            <div class="text-xs text-slate-200">
              Masukkan angka &ge; 0.
            </div>
          `,
        });
        return;
      }

      try {
        const res = await fetch("/api/curah-hujan", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kebunCode: row.kebunCode,
            date: dailyDate,
            totalMm: newValue,
          }),
        });

        if (!res.ok) {
          const txt = await res.text();
          let msg = "Gagal mengubah data curah hujan.";
          try {
            const parsed = JSON.parse(txt) as { message?: string };
            if (parsed?.message) msg = parsed.message;
          } catch {
            // ignore
          }

          await glassSwal.fire({
            icon: "error",
            title: "Edit gagal",
            html: `<div class="text-xs text-slate-200">${msg}</div>`,
          });
          return;
        }

        await glassSwal.fire({
          icon: "success",
          title: "Berhasil",
          html: `
            <div class="text-xs text-slate-200">
              Curah hujan harian berhasil diperbarui.
            </div>
          `,
        });

        if (dailyDate && rangeStart && rangeEnd) {
          await fetchChartData(dailyDate, rangeStart, rangeEnd);
        }
      } catch (err) {
        console.error("handleEditRow error", err);
        await glassSwal.fire({
          icon: "error",
          title: "Terjadi kesalahan",
          html: `
            <div class="text-xs text-slate-200">
              Gagal mengubah data curah hujan.
            </div>
          `,
        });
      }
    },
    [dailyDate, rangeStart, rangeEnd, fetchChartData]
  );

  const handleDeleteRow = useCallback(
    async (row: RainChartItem) => {
      // Step 1: pilih mode penghapusan
      const pilih = await glassSwal.fire({
        icon: "warning",
        title: "Hapus data curah hujan?",
        html: `
        <div class="text-xs text-slate-200 mb-1">
          <div class="mb-2">
            Kebun: <b>${row.kebunCode} – ${row.kebunName}</b>
          </div>
          <div class="text-[11px] text-slate-300">
            Pilih jenis penghapusan:
            <ul class="mt-1 list-disc list-inside space-y-0.5">
              <li><b>Hapus per tanggal</b>: pilih salah satu tanggal yang sudah ada di database.</li>
              <li><b>Hapus semua</b>: seluruh data curah hujan untuk kebun ini (semua tanggal).</li>
            </ul>
          </div>
        </div>
      `,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "Hapus per tanggal",
        denyButtonText: "Hapus semua",
        cancelButtonText: "Batal",
        reverseButtons: true,
      });

      // klik Batal / close X → stop semua
      if (!pilih.isConfirmed && !pilih.isDenied) return;

      // ---------- MODE 1: Hapus per tanggal (dipilih dari DB) ----------
      if (pilih.isConfirmed) {
        try {
          const resDates = await fetch(
            `/api/curah-hujan?mode=listDates&kebunCode=${encodeURIComponent(
              row.kebunCode
            )}`
          );

          if (!resDates.ok) {
            const txt = await resDates.text();
            console.error("Gagal fetch listDates:", txt);
            await glassSwal.fire({
              icon: "error",
              title: "Gagal mengambil daftar tanggal",
              html: `
              <div class="text-xs text-slate-200">
                Tidak dapat memuat daftar tanggal dari server.<br/>
                Coba lagi beberapa saat atau hubungi admin.
              </div>
            `,
            });
            return;
          }

          const dates = (await resDates.json()) as string[];

          if (!dates.length) {
            await glassSwal.fire({
              icon: "info",
              title: "Tidak ada data",
              html: `
              <div class="text-xs text-slate-200">
                Tidak ada tanggal data curah hujan yang bisa dihapus untuk kebun ini.
              </div>
            `,
            });
            return;
          }

          // bikin <option> manual supaya bisa pakai Tailwind (solid dark)
          const optionsHtml = dates
            .map(
              (d) =>
                `<option value="${d}">${d}</option>`
            )
            .join("");

          const pilihTanggalResult = await glassSwal.fire({
            title: "Pilih tanggal yang akan dihapus",
            html: `
            <div class="text-xs text-slate-300 mb-2">
              Kebun: <b>${row.kebunCode} – ${row.kebunName}</b><br/>
              Pilih salah satu tanggal yang sudah memiliki data di database.
            </div>
            <select id="tanggal-hapus-select"
              class="mt-2 w-full rounded-lg border border-emerald-400/60 bg-slate-900 text-xs text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400/80">
              <option value="">Pilih tanggal</option>
              ${optionsHtml}
            </select>
          `,
            showCancelButton: true,
            confirmButtonText: "Lanjut",
            cancelButtonText: "Batal",
            focusConfirm: false,
            preConfirm: () => {
              const select = document.getElementById(
                "tanggal-hapus-select"
              ) as HTMLSelectElement | null;

              if (!select || !select.value) {
                glassSwal.showValidationMessage(
                  "Silakan pilih tanggal terlebih dahulu."
                );
                return;
              }

              return select.value;
            },
          });

          // batal / close → stop
          if (!pilihTanggalResult.isConfirmed || !pilihTanggalResult.value) return;

          const dateToDelete = pilihTanggalResult.value as string;

          const confirmPerTanggal = await glassSwal.fire({
            icon: "warning",
            title: "Yakin hapus data harian?",
            html: `
            <div class="text-xs text-slate-300 mb-2">
              Tanggal: <code>${dateToDelete}</code><br/>
              Kebun: <b>${row.kebunCode} – ${row.kebunName}</b>
            </div>
            <div class="text-[11px] text-amber-200">
              Tindakan ini akan menghapus data harian untuk tanggal tersebut.<br/>
              Akumulasi total periode akan otomatis menyesuaikan.
            </div>
          `,
            showCancelButton: true,
            confirmButtonText: "Ya, hapus per tanggal",
            cancelButtonText: "Batal",
          });

          if (!confirmPerTanggal.isConfirmed) return;

          const res = await fetch("/api/curah-hujan", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kebunCode: row.kebunCode,
              date: dateToDelete,
            }),
          });

          if (!res.ok) {
            const txt = await res.text();
            let msg = "Gagal menghapus data curah hujan.";
            try {
              const parsed = JSON.parse(txt) as { message?: string };
              if (parsed?.message) msg = parsed.message;
            } catch {
              // ignore
            }

            await glassSwal.fire({
              icon: "error",
              title: "Hapus gagal",
              html: `<div class="text-xs text-slate-200">${msg}</div>`,
            });
            return;
          }

          await glassSwal.fire({
            icon: "success",
            title: "Berhasil",
            html: `
            <div class="text-xs text-slate-200">
              Data harian tanggal <code>${dateToDelete}</code> berhasil dihapus.
            </div>
          `,
          });

          if (dailyDate && rangeStart && rangeEnd) {
            await fetchChartData(dailyDate, rangeStart, rangeEnd);
          }
        } catch (err) {
          console.error("handleDeleteRow (per tanggal) error", err);
          await glassSwal.fire({
            icon: "error",
            title: "Terjadi kesalahan",
            html: `
            <div class="text-xs text-slate-200">
              Gagal menghapus data curah hujan. Coba lagi beberapa saat.
            </div>
          `,
          });
        }

        return;
      }

      // ---------- MODE 2: Hapus semua data kebun ----------
      if (pilih.isDenied) {
        const confirmAll = await glassSwal.fire({
          icon: "warning",
          title: "Hapus SEMUA data kebun ini?",
          html: `
          <div class="text-xs text-slate-300 mb-2">
            Kebun: <b>${row.kebunCode} – ${row.kebunName}</b><br/>
            Tindakan ini akan menghapus <b>seluruh riwayat curah hujan</b><br/>
            untuk kebun ini (semua tanggal).
          </div>
          <div class="text-[11px] text-red-300">
            PERINGATAN: Tindakan tidak bisa dibatalkan.
          </div>
        `,
          showCancelButton: true,
          confirmButtonText: "Ya, hapus semua",
          cancelButtonText: "Batal",
        });

        if (!confirmAll.isConfirmed) return;

        try {
          const res = await fetch("/api/curah-hujan", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kebunCode: row.kebunCode,
              deleteAll: true,
            }),
          });

          if (!res.ok) {
            const txt = await res.text();
            let msg = "Gagal menghapus semua data curah hujan.";
            try {
              const parsed = JSON.parse(txt) as { message?: string };
              if (parsed?.message) msg = parsed.message;
            } catch {
              // ignore
            }

            await glassSwal.fire({
              icon: "error",
              title: "Hapus semua gagal",
              html: `<div class="text-xs text-slate-200">${msg}</div>`,
            });
            return;
          }

          await glassSwal.fire({
            icon: "success",
            title: "Berhasil",
            html: `
            <div class="text-xs text-slate-200">
              Seluruh data curah hujan untuk kebun <b>${row.kebunCode}</b> berhasil dihapus.
            </div>
          `,
          });

          if (dailyDate && rangeStart && rangeEnd) {
            await fetchChartData(dailyDate, rangeStart, rangeEnd);
          }
        } catch (err) {
          console.error("handleDeleteRow (delete all) error", err);
          await glassSwal.fire({
            icon: "error",
            title: "Terjadi kesalahan",
            html: `
            <div class="text-xs text-slate-200">
              Gagal menghapus semua data curah hujan. Coba lagi beberapa saat.
            </div>
          `,
          });
        }
      }
    },
    [dailyDate, rangeStart, rangeEnd, fetchChartData]
  );

  const hasAnyKebun = kebunOptions.length > 0;

  return (
    <>
      {/* CARD GRAFIK */}
      <section className="mt-3">
        <ChartCard
          title=""
          subtitle="Curah hujan"
        // ❌ headerRight dihapus supaya tidak sejajar dengan button Filter utama
        >
          {/* ✅ CONTROL BAR DIPINDAH KE DALAM CARD, DI ATAS CHART */}
          <div
            className="
              mb-3
              flex flex-col gap-2
              lg:flex-row lg:flex-wrap lg:items-center lg:justify-end
              text-xs
            "
          >
            {/* Tanggal harian */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="whitespace-nowrap text-[11px] text-slate-300">
                Tanggal harian:
              </span>
              <Input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="h-8 w-[140px] border-emerald-500/40 bg-slate-950/40 text-xs"
              />
            </div>

            {/* Range untuk TOTAL */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="whitespace-nowrap text-[11px] text-slate-300">
                Periode total:
              </span>
              <div className="flex items-center gap-1">
                <Input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="h-8 w-[130px] border-emerald-500/40 bg-slate-950/40 text-xs"
                />
                <span className="text-[11px] text-slate-400">s/d</span>
                <Input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="h-8 w-[130px] border-emerald-500/40 bg-slate-950/40 text-xs"
                />
              </div>
            </div>

            {/* Pilih kebun untuk import */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="whitespace-nowrap text-[11px] text-slate-300">
                Kebun import:
              </span>
              <Select
                value={selectedKebun}
                onValueChange={(v) => setSelectedKebun(v)}
              >
                <SelectTrigger className="h-8 w-[170px] border border-emerald-500/60 bg-slate-900 text-xs text-slate-100">
                  <SelectValue placeholder="Pilih kebun" />
                </SelectTrigger>

                <SelectContent className="border border-emerald-500/60 bg-slate-950 text-xs text-slate-100 shadow-xl">
                  {kebunOptions.map((k) => (
                    <SelectItem key={k.code} value={k.code}>
                      {k.code} — {k.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Input file (hidden) + tombol Import & Export */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleImportExcel}
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleClickImportButton}
                disabled={importing}
                className="h-8 px-3 text-[11px]"
              >
                {importing ? "Mengimport..." : "Import"}
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleExportPdf}
                disabled={loadingChart || !chartData.length}
                className="h-8 px-3 text-[11px]"
              >
                Export PDF
              </Button>
            </div>
          </div>

          {/* CHART */}
          <div ref={chartRef} className="h-[320px] w-full">
            {loadingChart ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-300">
                Memuat data curah hujan...
              </div>
            ) : !hasAnyKebun ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">
                Daftar kebun belum dikonfigurasi di KEBUN_LABEL.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="kebunCode"
                    tick={{ fontSize: 11, fill: "#E5E7EB" }}
                    angle={-20}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#E5E7EB" }}
                    label={{
                      value: "Curah hujan (mm)",
                      angle: -90,
                      position: "insideLeft",
                      offset: 0,
                      fill: "#E5E7EB",
                      fontSize: 11,
                    }}
                  />
                  <Tooltip
                    content={(props) => (
                      <RainTooltip {...props} dailyDate={dailyDate} />
                    )}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#E5E7EB" }} />

                  <Bar
                    dataKey="dailyMm"
                    name={`Harian (${dailyDate})`}
                    barSize={18}
                    radius={[8, 8, 0, 0]}
                  >
                    <LabelList
                      dataKey="dailyMm"
                      position="top"
                      className="fill-slate-100 text-[10px]"
                    />
                    {chartData.map((item, idx) => {
                      const pair = getKebunColorPair(idx);
                      return (
                        <Cell
                          key={`${item.kebunCode}-daily`}
                          fill={pair.light}
                        />
                      );
                    })}
                  </Bar>

                  <Bar
                    dataKey="mtdMm"
                    name={`Total (${rangeStart} s/d ${rangeEnd})`}
                    barSize={18}
                    radius={[8, 8, 0, 0]}
                  >
                    <LabelList
                      dataKey="mtdMm"
                      position="top"
                      className="fill-slate-100 text-[10px]"
                    />
                    {chartData.map((item, idx) => {
                      const pair = getKebunColorPair(idx);
                      return (
                        <Cell
                          key={`${item.kebunCode}-mtd`}
                          fill={pair.dark}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </section>

      {/* CARD TABEL DATA */}
      <section className="mt-6">
        <ChartCard
          title="Data Curah Hujan per Kebun"
          subtitle={`Tabel data untuk tanggal harian ${dailyDate} dan total periode ${rangeStart} s/d ${rangeEnd} (zona Asia/Jakarta). Anda dapat edit atau hapus data harian per kebun.`}
        >
          <div className="mt-3 max-h-[320px] w-full overflow-auto rounded-xl border border-emerald-500/20 bg-slate-950/40">
            {!hasAnyKebun ? (
              <div className="flex h-32 items-center justify-center text-xs text-slate-400">
                Daftar kebun belum dikonfigurasi di KEBUN_LABEL.
              </div>
            ) : (
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-slate-900/80 backdrop-blur">
                  <tr className="text-[11px] uppercase tracking-wide text-slate-300">
                    <th className="px-3 py-2 text-left">Kebun</th>
                    <th className="px-3 py-2 text-left">Nama Kebun</th>
                    <th className="px-3 py-2 text-left">Tanggal Harian</th>
                    <th className="px-3 py-2 text-right">Harian (mm)</th>
                    <th className="px-3 py-2 text-right">
                      Total Periode (mm)
                    </th>
                    <th className="px-3 py-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row, idx) => (
                    <tr
                      key={row.kebunCode}
                      className={`border-t border-emerald-500/10 ${idx % 2 === 0
                          ? "bg-slate-950/20"
                          : "bg-slate-900/10"
                        }`}
                    >
                      <td className="px-3 py-1.5 font-mono text-[11px] text-slate-100">
                        {row.kebunCode}
                      </td>
                      <td className="px-3 py-1.5 text-[11px] text-slate-200">
                        {row.kebunName}
                      </td>
                      <td className="px-3 py-1.5 text-[11px] text-slate-300">
                        <code>{dailyDate}</code>
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-[11px] text-slate-100">
                        {row.dailyMm.toFixed(2)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-[11px] text-slate-100">
                        {row.mtdMm.toFixed(2)}
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => void handleEditRow(row)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[10px] border-red-500/60 text-red-300 hover:bg-red-500/10"
                            onClick={() => void handleDeleteRow(row)}
                          >
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </ChartCard>
      </section>

      {/* FULLSCREEN LOADING SPINNER SAAT IMPORT */}
      {importing && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-2xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative flex items-center justify-center">
              {/* Lingkaran luar berputar */}
              <div className="h-24 w-24 rounded-full border-2 border-emerald-400/25 border-t-emerald-200/95 animate-spin" />

              {/* Logo di tengah lingkaran */}
              <div className="absolute flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-emerald-100/80 bg-white/90 shadow-[0_18px_45px_rgba(6,40,18,0.8)] backdrop-blur-xl">
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-50/90">
                PTPN 4 • DIVISI TANAMAN
              </p>
              <p className="text-sm text-emerald-50/80">
                Mengimport data curah hujan...
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
