// src/app/pemupukan/_components/dashboard/visualisasi/Visualisasi.tsx
"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import type { RowInput } from "jspdf-autotable";

import ChartCard from "../../shared/ChartCard";
import SectionHeader from "../../shared/SectionHeader";
import { KEBUN_LABEL } from "../../../_config/constants";

/* ======================================================================= */
/* ============================== TYPE ================================== */
/* ======================================================================= */

type KebunRow = {
  kebun: string;
  rencana: number;
  realisasi: number;
  progress: number;
};

type AggPupukRow = {
  jenis: string;
  rencana: number;
  realisasi: number;
  rencana_ha: number;
  realisasi_ha: number;
  progress: number;
};

type StokSisaRow = {
  distrik: string;
  stok: number;
  sisa: number;
  stok_pct: number;
  sisa_pct: number;
};

/* ============ Struktur baris tabel TM / TBM / TM&TBM ============ */
export type TmRow = {
  no?: number;
  kebun: string;

  // APLIKASI I
  app1_rencana: number;
  app1_real: number;
  app1_pct: number;

  // APLIKASI II
  app2_rencana: number;
  app2_real: number;
  app2_pct: number;

  // APLIKASI III
  app3_rencana: number;
  app3_real: number;
  app3_pct: number;

  // Harian
  renc_sekarang: number; // Hari ini
  real_sekarang: number; // Hari ini
  renc_besok: number; // Besok

  // Total
  jumlah_rencana2025: number;

  // Total realisasi berdasarkan periode (default = seluruh realisasi)
  jumlah_realSd0710: number;
  jumlah_pct: number;
};

/* ======================================================================= */
/* ======================= KONSTAN URUTAN KEBUN ========================= */
/* ======================================================================= */

const KEBUN_ORDER = [
  "SGH",
  "SGO",
  "SPA",
  "TME",
  "TPU",
  "LDA",
  "SBT",
  "AMO-1",
  "AMO-2",
  "TAN",
  "TER",
  "SKE",
  "SLI",
  "TAM",
  "SBL",
  "SRO",
  "SIN",
  "SSI",
  "STA",
  "SBE",
];

// Warna khusus untuk pie Rencana vs Realisasi (disesuaikan palet utama)
const PIE_PLAN_COLOR = "#2E7D32"; // hijau daun (Rencana)
const PIE_REAL_COLOR = "#FBC02D"; // kuning aksen (Realisasi)

/* ======================================================================= */
/* ====================== Helper tanggal Jakarta ========================= */
/* ======================================================================= */

function todayISOJakarta(): string {
  const now = new Date();
  const y = now.toLocaleString("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
  });
  const m = now.toLocaleString("en-US", {
    timeZone: "Asia/Jakarta",
    month: "2-digit",
  });
  const d = now.toLocaleString("en-US", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
  });
  return `${y}-${m}-${d}`;
}

function addDaysJakarta(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d)); // UTC aman
  base.setUTCDate(base.getUTCDate() + n);

  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(base.getUTCDate()).padStart(2, "0");

  return `${yy}-${mm}-${dd}`;
}

function isoToShort(iso?: string) {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function isoToLongID(iso?: string) {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  const obj = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return obj.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/* ======================================================================= */
/* ======================== computeTotals ================================ */
/* ======================================================================= */

function computeTotals(rows?: TmRow[] | null) {
  if (!rows || rows.length === 0) return null;

  const sum = (sel: (r: TmRow) => number) =>
    rows.reduce((a, r) => a + (sel(r) || 0), 0);

  const app1_rencana = sum((r) => r.app1_rencana);
  const app1_real = sum((r) => r.app1_real);

  const app2_rencana = sum((r) => r.app2_rencana);
  const app2_real = sum((r) => r.app2_real);

  const app3_rencana = sum((r) => r.app3_rencana);
  const app3_real = sum((r) => r.app3_real);

  const renc_today = sum((r) => r.renc_sekarang);
  const real_today = sum((r) => r.real_sekarang);
  const renc_tomorrow = sum((r) => r.renc_besok);

  const jumlah_rencana2025 = sum((r) => r.jumlah_rencana2025);
  const jumlah_real5 = sum((r) => r.jumlah_realSd0710);

  const safePct = (real: number, rencana: number) =>
    rencana > 0 ? (real / rencana) * 100 : 0;

  return {
    app1_rencana,
    app1_real,
    app1_pct: safePct(app1_real, app1_rencana),

    app2_rencana,
    app2_real,
    app2_pct: safePct(app2_real, app2_rencana),

    app3_rencana,
    app3_real,
    app3_pct: safePct(app3_real, app3_rencana),

    renc_today,
    real_today,
    renc_tomorrow,

    jumlah_rencana2025,
    jumlah_real5,
    jumlah_pct: safePct(jumlah_real5, jumlah_rencana2025),
  };
}

type Totals = ReturnType<typeof computeTotals> | null;

// Normalisasi ID kebun:
// - "AMO-1", "amo 1", "AMO1" -> "AMO1"
// - "TAMORA" ataupun "TAM"   -> "TAM"
function normalizeKebunId(kebun: string): string {
  const raw = kebun.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  if (raw === "TAMORA") return "TAM";
  return raw;
}

/* ======================================================================= */
/* ========================= ENSURE ALL KEBUN =========================== */
/* ======================================================================= */

function ensureAllKebun(rows: TmRow[], kebunList = KEBUN_ORDER): TmRow[] {
  const map = new Map<string, TmRow>();

  // Simpan baris dengan key yang sudah dinormalisasi
  rows.forEach((r) => {
    const key = normalizeKebunId(r.kebun);
    map.set(key, r);
  });

  // Pastikan urutan & jumlah kebun sesuai KEBUN_ORDER
  return kebunList.map((kebun, idx) => {
    const key = normalizeKebunId(kebun);
    const existing = map.get(key);

    if (existing) {
      return {
        ...existing,
        kebun, // tampilkan label sesuai KEBUN_ORDER ("AMO1")
        no: idx + 1, // nomor sesuai urutan tetap
      };
    }

    // default jika benar-benar tidak ada data untuk kebun tsb
    return {
      no: idx + 1,
      kebun,
      app1_rencana: 0,
      app1_real: 0,
      app1_pct: 0,
      app2_rencana: 0,
      app2_real: 0,
      app2_pct: 0,
      app3_rencana: 0,
      app3_real: 0,
      app3_pct: 0,
      renc_sekarang: 0,
      real_sekarang: 0,
      renc_besok: 0,
      jumlah_rencana2025: 0,
      jumlah_realSd0710: 0,
      jumlah_pct: 0,
    };
  });
}

/* ======================================================================= */
/* ====================== SIMPLE IN-MEMORY CACHES ======================== */
/* ======================================================================= */

// Cache hasil ensureAllKebun per referensi array rows
const ensureAllKebunCache = new WeakMap<TmRow[], TmRow[]>();

function ensureAllKebunCached(rows: TmRow[], kebunList = KEBUN_ORDER): TmRow[] {
  const cached = ensureAllKebunCache.get(rows);
  if (cached) return cached;
  const result = ensureAllKebun(rows, kebunList);
  ensureAllKebunCache.set(rows, result);
  return result;
}

// Cache hasil computeTotals per referensi array rows ter-display
const totalsCache = new WeakMap<TmRow[], Totals>();

function computeTotalsCached(rows?: TmRow[] | null): Totals {
  if (!rows || rows.length === 0) return null;
  const cached = totalsCache.get(rows);
  if (cached !== undefined) return cached;
  const result = computeTotals(rows);
  totalsCache.set(rows, result);
  return result;
}

/* ======================================================================= */
/* ============================ Pct styling ============================== */
/* ======================================================================= */

const pctClass = (n?: number | null) => {
  if (n == null || Number.isNaN(n)) return "";
  const v = Math.round(n * 100) / 100;
  return v >= 100
    ? "text-emerald-300 font-semibold"
    : "text-rose-400 font-semibold";
};

/* ======================================================================= */
/* ====================== Number formatting ============================== */
/* ======================================================================= */

const fmtNum = (n?: number | null) =>
  n == null ? "-" : n.toLocaleString("id-ID");

const fmtPct = (n?: number | null) =>
  n == null
    ? "-"
    : n.toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

/* ======================================================================= */
/* ====================== EXPORT PDF PEMUPUKAN =========================== */
/* ======================================================================= */

type PdfCell =
  | string
  | number
  | {
    content: string | number;
    colSpan?: number;
  };

/** Helper: export tabel pemupukan ke PDF dari data
 *  ⚡ Lazy-load jspdf & jspdf-autotable supaya tidak masuk initial bundle.
 */
async function exportPemupukanTablePdf(
  label: string, // "TM", "TBM", "TM & TBM"
  rows: TmRow[],
  totals: Totals,
  meta: {
    todayShort: string;
    tomorrowShort: string;
    startLong: string;
    endLong: string;
    filename: string;
    hasUserFilter: boolean;
  }
) {
  if (!rows.length) {
    alert(`Tidak ada data ${label} untuk diexport.`);
    return;
  }

  // Lazy-load library berat hanya saat user klik "Download PDF"
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default as (
    ...args: Parameters<(typeof autoTableModule)["default"]>
  ) => void;

  const doc = new jsPDF("l", "mm", "a4");

  // ===== Judul & info tanggal =====
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Tabel Rencana & Realisasi Pemupukan ${label}`, 14, 10);

  doc.setFontSize(9);
  doc.text(
    `Rencana Hari Ini: ${meta.todayShort} | Rencana Besok: ${meta.tomorrowShort}`,
    14,
    16
  );

  const periodeText = meta.hasUserFilter
    ? `Periode: ${meta.startLong} – ${meta.endLong}`
    : "Periode: Total (seluruh realisasi)";

  doc.text(periodeText, 14, 21);

  const fmtNumLocal = (n?: number | null) =>
    n == null ? "-" : n.toLocaleString("id-ID");
  const fmtPctLocal = (n?: number | null) =>
    n == null
      ? "-"
      : n.toLocaleString("id-ID", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

  const labelRealisasi = meta.hasUserFilter
    ? `Realisasi Periode\n${meta.startLong} – ${meta.endLong}`
    : "Realisasi (Total)";

  // ===== HEADER: 2 baris, dengan rowSpan & colSpan agar rapi =====
  const head: RowInput[] = [
    [
      // row 1
      { content: "No.", rowSpan: 2 },
      { content: "Kebun", rowSpan: 2 },
      { content: "APLIKASI - I", colSpan: 3 },
      { content: "APLIKASI - II", colSpan: 3 },
      { content: "APLIKASI - III", colSpan: 3 },
      {
        content: `Rencana Hari Ini\n${meta.todayShort}\n(Kg)`,
        rowSpan: 2,
      },
      {
        content: `Realisasi Hari Ini\n${meta.todayShort}\n(Kg)`,
        rowSpan: 2,
      },
      {
        content: `Rencana Besok\n${meta.tomorrowShort}\n(Kg)`,
        rowSpan: 2,
      },
      { content: "Jumlah", colSpan: 3 },
    ],
    [
      // row 2 (sub header)
      "RENCANA",
      labelRealisasi,
      "%",
      "RENCANA",
      labelRealisasi,
      "%",
      "RENCANA",
      labelRealisasi,
      "%",
      "Rencana (Total)",
      labelRealisasi,
      "%",
    ],
  ];

  // ===== BODY =====
  const body: PdfCell[][] = rows.map((r, idx) => [
    r.no ?? idx + 1,
    r.kebun,
    fmtNumLocal(r.app1_rencana),
    fmtNumLocal(r.app1_real),
    fmtPctLocal(r.app1_pct),
    fmtNumLocal(r.app2_rencana),
    fmtNumLocal(r.app2_real),
    fmtPctLocal(r.app2_pct),
    fmtNumLocal(r.app3_rencana),
    fmtNumLocal(r.app3_real),
    fmtPctLocal(r.app3_pct),
    fmtNumLocal(r.renc_sekarang),
    fmtNumLocal(r.real_sekarang),
    fmtNumLocal(r.renc_besok),
    fmtNumLocal(r.jumlah_rencana2025),
    fmtNumLocal(r.jumlah_realSd0710),
    fmtPctLocal(r.jumlah_pct),
  ]);

  if (totals) {
    const totalRow: PdfCell[] = [
      { content: `Jumlah ${label}`, colSpan: 2 },
      fmtNumLocal(totals.app1_rencana),
      fmtNumLocal(totals.app1_real),
      fmtPctLocal(totals.app1_pct),
      fmtNumLocal(totals.app2_rencana),
      fmtNumLocal(totals.app2_real),
      fmtPctLocal(totals.app2_pct),
      fmtNumLocal(totals.app3_rencana),
      fmtNumLocal(totals.app3_real),
      fmtPctLocal(totals.app3_pct),
      fmtNumLocal(totals.renc_today),
      fmtNumLocal(totals.real_today),
      fmtNumLocal(totals.renc_tomorrow),
      fmtNumLocal(totals.jumlah_rencana2025),
      fmtNumLocal(totals.jumlah_real5),
      fmtPctLocal(totals.jumlah_pct),
    ];
    body.push(totalRow);
  }

  autoTable(doc, {
    head,
    body: body as RowInput[],
    startY: 26,
    theme: "grid",
    styles: {
      fontSize: 7,
      textColor: [15, 23, 42],
      lineColor: [148, 163, 184],
      lineWidth: 0.1,
      valign: "middle",
      halign: "right", // isi angka rata kanan
    },
    headStyles: {
      fillColor: [22, 101, 52],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center", // header rata tengah
      valign: "middle",
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244],
    },
    columnStyles: {
      0: { halign: "center" }, // No.
      1: { halign: "left" }, // Kebun
    },
    didDrawPage: () => {
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(245, 245, 245);

      doc.text("Bagian Tanaman", pageWidth - 6, pageHeight - 4, {
        align: "right",
      });

      doc.setTextColor(0, 0, 0);
    },
  });

  doc.save(meta.filename);
}

/* ======================================================================= */
/* ===================== KOMPONEN TABEL REUSABLE ======================== */
/* ======================================================================= */

type PemupukanTableProps = {
  label: string;
  title: string;
  filename: string;
  rows: TmRow[];
  totals: Totals;
  todayShort: string;
  tomorrowShort: string;
  startLong: string;
  endLong: string;
  useRangeLabel: boolean;
  hasUserFilter: boolean;
  resolveKebunName?: (kebun: string) => string;
};

function PemupukanTable({
  label,
  title,
  filename,
  rows,
  totals,
  todayShort,
  tomorrowShort,
  startLong,
  endLong,
  useRangeLabel,
  hasUserFilter,
  resolveKebunName = (k) => k,
}: PemupukanTableProps) {
  return (
    <div className="glass-surface rounded-2xl border border-[--glass-border] shadow-[0_18px_45px_rgba(3,18,9,0.8)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-emerald-50/95">{title}</h3>

        <button
          type="button"
          onClick={() =>
            exportPemupukanTablePdf(label, rows, totals, {
              todayShort,
              tomorrowShort,
              startLong,
              endLong,
              filename,
              hasUserFilter,
            })
          }
          className="inline-flex items-center gap-1 rounded-full border border-[--glass-border] px-3 py-1.5 text-[11px] font-medium text-emerald-50/90 bg-white/5 hover:bg-white/10 backdrop-blur-md"
        >
          Download PDF
        </button>
      </div>

      <div className="overflow-auto rounded-xl border border-white/15 bg-black/10">
        <table className="w-full text-xs border-collapse">
          <thead className="text-[11px]">
            <tr className="bg-emerald-950/60 text-emerald-50">
              <th rowSpan={2} className="border px-2 py-2 text-center">
                No.
              </th>
              <th rowSpan={2} className="border px-2 py-2 text-center">
                Kebun
              </th>

              <th colSpan={3} className="border px-2 py-2 text-center">
                APLIKASI - I
              </th>
              <th colSpan={3} className="border px-2 py-2 text-center">
                APLIKASI - II
              </th>
              <th colSpan={3} className="border px-2 py-2 text-center">
                APLIKASI - III
              </th>

              <th rowSpan={2} className="border px-2 py-2 text-center">
                Rencana Hari Ini
                <br />
                {todayShort}
                <br />
                (Kg)
              </th>
              <th rowSpan={2} className="border px-2 py-2 text-center">
                Realisasi Hari Ini
                <br />
                {todayShort}
                <br />
                (Kg)
              </th>
              <th rowSpan={2} className="border px-2 py-2 text-center">
                Rencana Besok
                <br />
                {tomorrowShort}
                <br />
                (Kg)
              </th>

              <th colSpan={3} className="border px-2 py-2 text-center">
                Jumlah
              </th>
            </tr>

            <tr className="bg-emerald-900/60 text-emerald-50/95">
              <th className="border px-2 py-2 text-center">RENCANA</th>
              <th className="border px-2 py-2 text-center">
                {useRangeLabel ? (
                  <>
                    Realisasi Periode
                    <br />
                    {startLong} – {endLong}
                  </>
                ) : (
                  "Realisasi (Total)"
                )}
              </th>
              <th className="border px-2 py-2 text-center">%</th>

              <th className="border px-2 py-2 text-center">RENCANA</th>
              <th className="border px-2 py-2 text-center">
                {useRangeLabel ? (
                  <>
                    Realisasi Periode
                    <br />
                    {startLong} – {endLong}
                  </>
                ) : (
                  "Realisasi (Total)"
                )}
              </th>
              <th className="border px-2 py-2 text-center">%</th>

              <th className="border px-2 py-2 text-center">RENCANA</th>
              <th className="border px-2 py-2 text-center">
                {useRangeLabel ? (
                  <>
                    Realisasi Periode
                    <br />
                    {startLong} – {endLong}
                  </>
                ) : (
                  "Realisasi (Total)"
                )}
              </th>
              <th className="border px-2 py-2 text-center">%</th>

              <th className="border px-2 py-2 text-center">
                Rencana (Total)
              </th>
              <th className="border px-2 py-2 text-center">
                {useRangeLabel ? (
                  <>
                    Realisasi Periode
                    <br />
                    {startLong} – {endLong}
                  </>
                ) : (
                  "Realisasi (Total)"
                )}
              </th>
              <th className="border px-2 py-2 text-center">%</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r, idx) => (
              <tr
                key={`${label}-${r.kebun}-${idx}`}
                className={idx % 2 ? "bg-white/5" : "bg-white/0"}
              >
                <td className="border px-2 py-1 text-center text-emerald-50/90">
                  {idx + 1}
                </td>

                <td className="border px-2 py-1 text-left text-emerald-50/90">
                  {resolveKebunName(r.kebun)}
                </td>

                {/* APLIKASI I */}
                <td className="border px-2 py-1 text-right text-emerald-50/90">
                  {fmtNum(r.app1_rencana)}
                </td>
                <td className="border px-2 py-1 text-right text-emerald-50/90">
                  {fmtNum(r.app1_real)}
                </td>
                <td
                  className={`border px-2 py-1 text-right ${pctClass(
                    r.app1_pct
                  )}`}
                >
                  {fmtPct(r.app1_pct)}
                </td>

                {/* APLIKASI II */}
                <td className="border px-2 py-1 text-right text-emerald-50/90">
                  {fmtNum(r.app2_rencana)}
                </td>
                <td className="border px-2 py-1 text-right text-emerald-50/90">
                  {fmtNum(r.app2_real)}
                </td>
                <td
                  className={`border px-2 py-1 text-right ${pctClass(
                    r.app2_pct
                  )}`}
                >
                  {fmtPct(r.app2_pct)}
                </td>

                {/* APLIKASI III */}
                <td className="border px-2 py-1 text-right text-emerald-50/90">
                  {fmtNum(r.app3_rencana)}
                </td>
                <td className="border px-2 py-1 text-right text-emerald-50/90">
                  {fmtNum(r.app3_real)}
                </td>
                <td
                  className={`border px-2 py-1 text-right ${pctClass(
                    r.app3_pct
                  )}`}
                >
                  {fmtPct(r.app3_pct)}
                </td>

                {/* Harian */}
                <td className="border px-2 py-1 text-right text-emerald-50/90">
                  {fmtNum(r.renc_sekarang)}
                </td>
                <td className="border px-2 py-1 text-right text-emerald-50/90">
                  {fmtNum(r.real_sekarang)}
                </td>
                <td className="border px-2 py-1 text-right text-emerald-50/90">
                  {fmtNum(r.renc_besok)}
                </td>

                {/* Total */}
                <td className="border px-2 py-1 text-right text-emerald-50/90">
                  {fmtNum(r.jumlah_rencana2025)}
                </td>
                <td className="border px-2 py-1 text-right text-emerald-50/90">
                  {fmtNum(r.jumlah_realSd0710)}
                </td>
                <td
                  className={`border px-2 py-1 text-right ${pctClass(
                    r.jumlah_pct
                  )}`}
                >
                  {fmtPct(r.jumlah_pct)}
                </td>
              </tr>
            ))}
          </tbody>

          {totals && rows.length > 0 && (
            <tfoot>
              <tr className="bg-emerald-900/70 font-semibold text-emerald-50">
                <td colSpan={2} className="border px-2 py-2 text-center">
                  {`Jumlah ${label}`}
                </td>

                {/* APLIKASI I */}
                <td className="border px-2 py-2 text-right">
                  {fmtNum(totals.app1_rencana)}
                </td>
                <td className="border px-2 py-2 text-right">
                  {fmtNum(totals.app1_real)}
                </td>
                <td
                  className={`border px-2 py-2 text-right ${pctClass(
                    totals.app1_pct
                  )}`}
                >
                  {fmtPct(totals.app1_pct)}
                </td>

                {/* APLIKASI II */}
                <td className="border px-2 py-2 text-right">
                  {fmtNum(totals.app2_rencana)}
                </td>
                <td className="border px-2 py-2 text-right">
                  {fmtNum(totals.app2_real)}
                </td>
                <td
                  className={`border px-2 py-2 text-right ${pctClass(
                    totals.app2_pct
                  )}`}
                >
                  {fmtPct(totals.app2_pct)}
                </td>

                {/* APLIKASI III */}
                <td className="border px-2 py-2 text-right">
                  {fmtNum(totals.app3_rencana)}
                </td>
                <td className="border px-2 py-2 text-right">
                  {fmtNum(totals.app3_real)}
                </td>
                <td
                  className={`border px-2 py-2 text-right ${pctClass(
                    totals.app3_pct
                  )}`}
                >
                  {fmtPct(totals.app3_pct)}
                </td>

                {/* Harian */}
                <td className="border px-2 py-2 text-right">
                  {fmtNum(totals.renc_today)}
                </td>
                <td className="border px-2 py-2 text-right">
                  {fmtNum(totals.real_today)}
                </td>
                <td className="border px-2 py-2 text-right">
                  {fmtNum(totals.renc_tomorrow)}
                </td>

                {/* Total */}
                <td className="border px-2 py-2 text-right">
                  {fmtNum(totals.jumlah_rencana2025)}
                </td>
                <td className="border px-2 py-2 text-right">
                  {fmtNum(totals.jumlah_real5)}
                </td>
                <td
                  className={`border px-2 py-2 text-right ${pctClass(
                    totals.jumlah_pct
                  )}`}
                >
                  {fmtPct(totals.jumlah_pct)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/* ======================================================================= */
/* ======================== KOMPONEN VISUALISASI ========================= */
/* ======================================================================= */

export default function Visualisasi({
  aggPupuk,
  tmRows = [],
  tbmRows = [],
  tmTbmRows = [],
  realWindow,
  realCutoffDate,
  hasUserFilter = false,
}: {
  aggPupuk: AggPupukRow[];
  barPerKebun?: KebunRow[];
  stokVsSisa?: StokSisaRow[];
  tmRows?: TmRow[];
  tbmRows?: TmRow[];
  tmTbmRows?: TmRow[];
  headerDates?: {
    today?: string;
    tomorrow?: string;
    sekarang?: string;
    besok?: string;
  };
  realWindow?: { start?: string; end?: string };
  realCutoffDate?: string;
  hasUserFilter?: boolean;
}) {
  /* =================================================================== */
  /* ======================= TANGGAL HARI INI ========================== */
  /* =================================================================== */

  const todayISO = todayISOJakarta();
  const tomorrowISO = addDaysJakarta(todayISO, 1);

  /* =================================================================== */
  /* ================== PERIODE REALISASI (searchParams) =============== */
  /* =================================================================== */

  let startISO = realWindow?.start;
  let endISO = realWindow?.end;

  if (!startISO || !endISO) {
    const fb = realCutoffDate || todayISO;
    startISO = fb;
    endISO = fb;
  }

  const startLong = isoToLongID(startISO);
  const endLong = isoToLongID(endISO);
  const useRangeLabel = hasUserFilter && !!startISO && !!endISO;

  const todayShort = isoToShort(todayISO);
  const tomorrowShort = isoToShort(tomorrowISO);

  /* =================================================================== */
  /* =================== DISPLAY ROWS (PASTI 20 KEBUN) ================= */
  /* =================================================================== */

  const tmDisplayRows = useMemo(
    () => ensureAllKebunCached(tmRows),
    [tmRows]
  );
  const tbmDisplayRows = useMemo(
    () => ensureAllKebunCached(tbmRows),
    [tbmRows]
  );
  const tmTbmDisplayRows = useMemo(
    () => ensureAllKebunCached(tmTbmRows),
    [tmTbmRows]
  );

  /* =================================================================== */
  /* ======================== COMPUTE TOTALS =========================== */
  /* =================================================================== */

  const totalsTM = useMemo(
    () => computeTotalsCached(tmDisplayRows),
    [tmDisplayRows]
  );
  const totalsTBM = useMemo(
    () => computeTotalsCached(tbmDisplayRows),
    [tbmDisplayRows]
  );
  const totalsTmTbm = useMemo(
    () => computeTotalsCached(tmTbmDisplayRows),
    [tmTbmDisplayRows]
  );

  /* =================================================================== */
  /* ============================ RETURN =============================== */
  /* =================================================================== */

  return (
    <section className="space-y-4">
      <SectionHeader title="Visualisasi" desc="Grafik utama" />

      {/* ===================== PIE RENCANA vs REALISASI ===================== */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12">
          <ChartCard title="Rencana vs Realisasi per Jenis Pupuk (Kg)">
            <div className="pb-4">
              <p className="text-[11px] text-emerald-100/75 mb-2">
                Setiap pie chart merepresentasikan komposisi Rencana (Kg) vs
                Realisasi (Kg) untuk satu jenis pupuk.
              </p>

              {/* 3 chart per baris */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-3">
                {aggPupuk.map((item) => {
                  const data = [
                    { name: "Rencana (Kg)", value: item.rencana || 0 },
                    { name: "Realisasi (Kg)", value: item.realisasi || 0 },
                  ];

                  return (
                    <div
                      key={item.jenis}
                      className="glass-surface rounded-2xl px-3 pt-3 pb-4 flex flex-col items-center border border-[--glass-border]"
                    >
                      <div className="text-[11px] font-semibold mb-1 text-center text-emerald-50/95">
                        {item.jenis}
                      </div>

                      {/* Pie dibesarkan */}
                      <div className="w-full h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data}
                              dataKey="value"
                              innerRadius={24}
                              outerRadius={40}
                              labelLine={false}
                              isAnimationActive={false}
                            >
                              <Cell fill={PIE_PLAN_COLOR} />
                              <Cell fill={PIE_REAL_COLOR} />
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#020617",
                                border:
                                  "1px solid rgba(148,163,184,0.6)",
                                borderRadius: 8,
                                color: "#E5E7EB",
                              }}
                              formatter={(value, name) => [
                                (value as number).toLocaleString(
                                  "id-ID"
                                ) + " Kg",
                                name,
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Keterangan tanpa Ha */}
                      <div className="mt-1 text-[10px] text-emerald-100/80 text-center leading-tight space-y-[2px]">
                        <div>Ren: {fmtNum(item.rencana)} Kg</div>
                        <div>Real: {fmtNum(item.realisasi)} Kg</div>
                        <div>
                          Progress:{" "}
                          <span className={pctClass(item.progress)}>
                            {fmtPct(item.progress)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* ====================== TABEL-TABEL PEMUPUKAN ======================= */}
      <div className="space-y-4">
        {/* TM */}
        <PemupukanTable
          label="TM"
          title="Tabel Rencana & Realisasi Pemupukan TM"
          filename="Tabel_TM.pdf"
          rows={tmDisplayRows}
          totals={totalsTM}
          todayShort={todayShort}
          tomorrowShort={tomorrowShort}
          startLong={startLong}
          endLong={endLong}
          useRangeLabel={useRangeLabel}
          hasUserFilter={hasUserFilter}
          resolveKebunName={(k) => KEBUN_LABEL[k] ?? k}
        />

        {/* TBM */}
        <PemupukanTable
          label="TBM"
          title="Tabel Rencana & Realisasi Pemupukan TBM"
          filename="Tabel_TBM.pdf"
          rows={tbmDisplayRows}
          totals={totalsTBM}
          todayShort={todayShort}
          tomorrowShort={tomorrowShort}
          startLong={startLong}
          endLong={endLong}
          useRangeLabel={useRangeLabel}
          hasUserFilter={hasUserFilter}
        />

        {/* TM & TBM */}
        <PemupukanTable
          label="TM & TBM"
          title="Tabel Rencana & Realisasi Pemupukan TM & TBM"
          filename="Tabel_TM_TBM.pdf"
          rows={tmTbmDisplayRows}
          totals={totalsTmTbm}
          todayShort={todayShort}
          tomorrowShort={tomorrowShort}
          startLong={startLong}
          endLong={endLong}
          useRangeLabel={useRangeLabel}
          hasUserFilter={hasUserFilter}
        />
      </div>
    </section>
  );
}