"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SectionHeader from "../components/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KEBUN_LABEL } from "../constants";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useVirtualizer } from "@tanstack/react-virtual";

type Kategori = "TM" | "TBM" | "BIBITAN";

// Bentuk data asli dari API / Prisma
type ApiRencana = {
  id: number;
  kategori: Kategori;
  kebun: string;
  kodeKebun: string;
  tanggal: string | null; // bisa null
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

// Bentuk data yang dipakai tabel
type HistoryRow = {
  id: number;
  tanggal: string; // "YYYY-MM-DD" atau "-"
  kategori: Kategori;
  kebun: string;
  kodeKebun: string;
  afd: string;
  tt: string;
  blok: string;
  luas: number | null;
  inv: number | null;
  jenisPupuk: string;
  aplikasi: number | null;
  dosis: number | null;
  kgPupuk: number | null;
};

const TABLE_HEADERS = [
  "Tanggal",
  "Kategori",
  "Kebun",
  "Kode Kebun",
  "AFD",
  "TT",
  "Blok",
  "Luas (Ha)",
  "INV",
  "Jenis Pupuk",
  "Aplikasi",
  "Dosis (Kg/pokok)",
  "Kg Pupuk",
] as const;

function parseDateValue(s: string): number {
  if (!s || s === "-") return 0;
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : 0;
}

function fmtNum(n: number | null | undefined) {
  if (n == null) return "-";
  return n.toLocaleString("id-ID");
}

// konversi ISO dari server → "YYYY-MM-DD" lokal
function toLocalYmd(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// nama sheet Excel aman
function makeSheetName(raw: string): string {
  const invalid = /[\\/?*[\]:]/g;
  let name = raw.replace(invalid, " ");
  if (!name.trim()) name = "Sheet";
  if (name.length > 31) name = name.slice(0, 31);
  return name;
}

// helper: mapping ApiRencana -> HistoryRow
function mapApiToHistoryRow(r: ApiRencana): HistoryRow {
  return {
    id: r.id,
    tanggal: toLocalYmd(r.tanggal),
    kategori: r.kategori,
    kebun: r.kebun,
    kodeKebun: r.kodeKebun,
    afd: r.afd,
    tt: r.tt,
    blok: r.blok,
    luas: r.luasHa,
    inv: r.inv,
    jenisPupuk: r.jenisPupuk,
    aplikasi: r.aplikasiKe,
    dosis: r.dosisKgPerPokok,
    kgPupuk: r.kgPupuk,
  };
}

// helper: fetch semua data (tanpa pagination) khusus untuk export
async function fetchAllRencanaForExport(): Promise<HistoryRow[]> {
  const res = await fetch("/api/pemupukan/rencana", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Gagal mengambil semua data rencana untuk export");
  }

  const json = await res.json();

  const dataArray: ApiRencana[] = Array.isArray(json) ? json : json.data;
  return dataArray.map(mapApiToHistoryRow);
}

export default function RencanaRiwayat() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 200;
  const [total, setTotal] = useState(0);

  const router = useRouter();

  // kebun yang dipilih (dipakai untuk filter + hapus & export per kebun)
  const [selectedKebun, setSelectedKebun] = useState("");

  const scrollParentRef = useRef<HTMLDivElement | null>(null);

  // ======== FETCH DATA DENGAN PAGINATION API ========
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);

        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        if (selectedKebun) {
          // filter kebun di API
          params.set("kebun", selectedKebun);
        }

        const res = await fetch(
          `/api/pemupukan/rencana?${params.toString()}`,
          {
            cache: "no-store",
          }
        );

        if (!res.ok) {
          throw new Error("Gagal mengambil data rencana");
        }

        const json = await res.json();

        const dataArray: ApiRencana[] = Array.isArray(json)
          ? json
          : json.data;
        const meta = Array.isArray(json) ? undefined : json.meta;

        if (!active) return;

        const mapped = dataArray.map(mapApiToHistoryRow);
        setRows(mapped);
        setTotal(meta?.total ?? mapped.length);
      } catch (err) {
        console.error(err);
        if (active) {
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [page, pageSize, selectedKebun]);

  // reset halaman ke 1 jika kebun filter berubah
  useEffect(() => {
    setPage(1);
  }, [selectedKebun]);

  // daftar kebun unik (hanya dari data yang sedang ditampilkan; untuk versi full butuh endpoint khusus)
  const kebunList = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.kebun) set.add(r.kebun);
    });
    return Array.from(set).sort();
  }, [rows]);

  // filter teks (hanya di dalam halaman saat ini) + sort tanggal desc
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = term
      ? rows.filter((r) => {
          const keb = KEBUN_LABEL[r.kebun] ?? r.kebun ?? "";
          return [
            r.kategori,
            keb,
            r.kodeKebun ?? "",
            r.afd ?? "",
            r.blok ?? "",
            r.jenisPupuk ?? "",
            r.tanggal ?? "",
          ]
            .map((v) => String(v).toLowerCase())
            .some((v) => v.includes(term));
        })
      : rows;

    return [...base].sort(
      (a, b) => parseDateValue(b.tanggal) - parseDateValue(a.tanggal)
    );
  }, [rows, q]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  // virtualizer untuk baris tabel di HALAMAN AKTIF
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 32,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop =
    virtualItems.length > 0 ? virtualItems[0].start || 0 : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() -
        (virtualItems[virtualItems.length - 1].end || 0)
      : 0;

  // === ACTION: HAPUS SATU DATA ===
  const handleDelete = async (row: HistoryRow) => {
    const result = await Swal.fire({
      title: "Yakin ingin menghapus data ini?",
      html: `
        <div style="text-align:left;font-size:12px">
          <b>Tanggal:</b> ${row.tanggal}<br/>
          <b>Kategori:</b> ${row.kategori}<br/>
          <b>Kebun:</b> ${KEBUN_LABEL[row.kebun] ?? row.kebun}<br/>
          <b>Blok:</b> ${row.blok} | <b>AFD:</b> ${row.afd}
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/pemupukan/rencana?id=${row.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Gagal hapus:", text);
        await Swal.fire({
          title: "Gagal menghapus",
          text:
            text ||
            "Terjadi kesalahan saat menghapus data. Silakan coba lagi atau hubungi admin.",
          icon: "error",
          confirmButtonText: "OK",
        });
        return;
      }

      // refresh halaman sekarang: cukup buang dari state lokal
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setTotal((prev) => (prev > 0 ? prev - 1 : 0));

      await Swal.fire({
        title: "Berhasil",
        text: "Data rencana berhasil dihapus.",
        icon: "success",
        confirmButtonText: "OK",
      });
    } catch (err) {
      console.error(err);
      await Swal.fire({
        title: "Terjadi kesalahan",
        text: "Tidak dapat menghapus data. Cek console atau hubungi admin.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // === ACTION: HAPUS SEMUA DATA ===
  const handleDeleteAll = async () => {
    if (total === 0) return;

    const result = await Swal.fire({
      title: "Hapus semua data rencana?",
      html: `
        <div style="text-align:left;font-size:12px">
          Tindakan ini akan menghapus <b>semua</b> data rencana pemupukan di database.<br/>
          Data yang sudah dihapus <b>tidak dapat dikembalikan</b>.
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus semua",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch("/api/pemupukan/rencana?all=1", {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Gagal hapus semua:", text);
        await Swal.fire({
          title: "Gagal menghapus semua",
          text:
            text ||
            "Terjadi kesalahan saat menghapus semua data. Silakan coba lagi atau hubungi admin.",
          icon: "error",
          confirmButtonText: "OK",
        });
        return;
      }

      setRows([]);
      setPage(1);
      setQ("");
      setSelectedKebun("");
      setTotal(0);

      await Swal.fire({
        title: "Berhasil",
        text: "Semua data rencana berhasil dihapus.",
        icon: "success",
        confirmButtonText: "OK",
      });
    } catch (err) {
      console.error(err);
      await Swal.fire({
        title: "Terjadi kesalahan",
        text: "Tidak dapat menghapus semua data. Cek console atau hubungi admin.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // === ACTION: HAPUS BERDASARKAN KEBUN ===
  const handleDeleteByKebun = async () => {
    if (!selectedKebun) {
      await Swal.fire({
        title: "Belum memilih kebun",
        text: "Silakan pilih kebun yang ingin dihapus datanya.",
        icon: "info",
        confirmButtonText: "OK",
      });
      return;
    }

    const label = KEBUN_LABEL[selectedKebun] ?? selectedKebun;

    const result = await Swal.fire({
      title: "Hapus data per kebun?",
      html: `
        <div style="text-align:left;font-size:12px">
          Kebun: <b>${label}</b> (${selectedKebun})<br/><br/>
          Tindakan ini akan menghapus semua data rencana untuk kebun tersebut.<br/>
          Data yang sudah dihapus <b>tidak dapat dikembalikan</b>.
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus data kebun ini",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(
        `/api/pemupukan/rencana?kebun=${encodeURIComponent(selectedKebun)}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const text = await res.text();
        console.error("Gagal hapus per kebun:", text);
        await Swal.fire({
          title: "Gagal menghapus data kebun",
          text:
            text ||
            "Terjadi kesalahan saat menghapus data per kebun. Silakan coba lagi atau hubungi admin.",
          icon: "error",
          confirmButtonText: "OK",
        });
        return;
      }

      // buang dari halaman saat ini
      setRows((prev) => prev.filter((r) => r.kebun !== selectedKebun));
      // total dikurangi kira-kira (tidak presisi, tapi lebih baik daripada tidak)
      // idealnya baca deletedCount dari response JSON, tapi route saat ini belum kirim
      setSelectedKebun("");

      await Swal.fire({
        title: "Berhasil",
        text: `Semua data rencana untuk kebun ${label} berhasil dihapus.`,
        icon: "success",
        confirmButtonText: "OK",
      });
    } catch (err) {
      console.error(err);
      await Swal.fire({
        title: "Terjadi kesalahan",
        text:
          "Tidak dapat menghapus data per kebun. Cek console atau hubungi admin.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // === ACTION: EDIT DATA ===
  const handleEdit = (row: HistoryRow) => {
    router.push(`/pemupukan/rencana/edit?id=${row.id}`);
  };

  // === EXPORT: Excel (Semua Kebun, multi-sheet) ===
  const handleExportExcelAll = async () => {
    try {
      const allRows = await fetchAllRencanaForExport();

      if (allRows.length === 0) {
        await Swal.fire({
          title: "Tidak ada data",
          text: "Tidak ada data rencana untuk diexport.",
          icon: "info",
          confirmButtonText: "OK",
        });
        return;
      }

      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();

      const grouped: Record<string, HistoryRow[]> = {};
      allRows.forEach((r) => {
        if (!grouped[r.kebun]) grouped[r.kebun] = [];
        grouped[r.kebun].push(r);
      });

      Object.entries(grouped).forEach(([kebunCode, kebunRows]) => {
        if (kebunRows.length === 0) return;

        const kebunLabel = KEBUN_LABEL[kebunCode] ?? kebunCode;
        const sheetName = makeSheetName(kebunLabel);

        const sheetData = [
          [...TABLE_HEADERS],
          ...kebunRows.map((r) => [
            r.tanggal,
            r.kategori,
            KEBUN_LABEL[r.kebun] ?? r.kebun,
            r.kodeKebun,
            r.afd,
            r.tt,
            r.blok,
            r.luas ?? "",
            r.inv ?? "",
            r.jenisPupuk,
            r.aplikasi ?? "",
            r.dosis ?? "",
            r.kgPupuk ?? "",
          ]),
        ];

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(workbook, ws, sheetName);
      });

      XLSX.writeFile(workbook, "Rencana_Pemupukan_Semua_Kebun.xlsx");
    } catch (err) {
      console.error(err);
      await Swal.fire({
        title: "Gagal export",
        text: "Terjadi kesalahan saat export data ke Excel.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // === EXPORT: Excel (Per Kebun) ===
  const handleExportExcelByKebun = async () => {
    if (!selectedKebun) {
      await Swal.fire({
        title: "Kebun belum dipilih",
        text: "Silakan pilih kebun terlebih dahulu.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    try {
      const allRows = await fetchAllRencanaForExport();
      const kebunRows = allRows.filter((r) => r.kebun === selectedKebun);

      if (kebunRows.length === 0) {
        await Swal.fire({
          title: "Tidak ada data",
          text: "Tidak ada data rencana untuk kebun yang dipilih.",
          icon: "info",
          confirmButtonText: "OK",
        });
        return;
      }

      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();

      const kebunLabel = KEBUN_LABEL[selectedKebun] ?? selectedKebun;
      const sheetName = makeSheetName(kebunLabel);

      const sheetData = [
        [...TABLE_HEADERS],
        ...kebunRows.map((r) => [
          r.tanggal,
          r.kategori,
          KEBUN_LABEL[r.kebun] ?? r.kebun,
          r.kodeKebun,
          r.afd,
          r.tt,
          r.blok,
          r.luas ?? "",
          r.inv ?? "",
          r.jenisPupuk,
          r.aplikasi ?? "",
          r.dosis ?? "",
          r.kgPupuk ?? "",
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, ws, sheetName);

      const fileName = `Rencana_Pemupukan_${selectedKebun}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error(err);
      await Swal.fire({
        title: "Gagal export",
        text: "Terjadi kesalahan saat export data ke Excel.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // === EXPORT: PDF (Semua Kebun, per kebun 1 halaman) ===
  const handleExportPdfAll = async () => {
    try {
      const allRows = await fetchAllRencanaForExport();

      if (allRows.length === 0) {
        await Swal.fire({
          title: "Tidak ada data",
          text: "Tidak ada data rencana untuk diexport.",
          icon: "info",
          confirmButtonText: "OK",
        });
        return;
      }

      const jsPDFmod = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDFmod.jsPDF({ orientation: "landscape" });

      const grouped: Record<string, HistoryRow[]> = {};
      allRows.forEach((r) => {
        if (!grouped[r.kebun]) grouped[r.kebun] = [];
        grouped[r.kebun].push(r);
      });

      const kebunEntries = Object.entries(grouped).filter(
        ([, kebunRows]) => kebunRows.length > 0
      );

      kebunEntries.forEach(([kebunCode, kebunRows], idx) => {
        if (idx > 0) {
          doc.addPage("landscape");
        }

        const kebunLabel = KEBUN_LABEL[kebunCode] ?? kebunCode;
        doc.setFontSize(10);
        doc.text(
          `Rencana Pemupukan - Kebun ${kebunLabel} (${kebunCode})`,
          14,
          12
        );

        const body = kebunRows.map((r) => [
          r.tanggal,
          r.kategori,
          KEBUN_LABEL[r.kebun] ?? r.kebun,
          r.kodeKebun,
          r.afd,
          r.tt,
          r.blok,
          fmtNum(r.luas),
          fmtNum(r.inv),
          r.jenisPupuk,
          fmtNum(r.aplikasi),
          fmtNum(r.dosis),
          fmtNum(r.kgPupuk),
        ]);

        autoTable(doc, {
          startY: 16,
          head: [TABLE_HEADERS as unknown as string[]],
          body,
          styles: { fontSize: 6 },
          headStyles: { fillColor: [226, 232, 240] },
          margin: { left: 10, right: 10 },
        });
      });

      doc.save("Rencana_Pemupukan_Semua_Kebun.pdf");
    } catch (err) {
      console.error(err);
      await Swal.fire({
        title: "Gagal export",
        text: "Terjadi kesalahan saat export data ke PDF.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  // === EXPORT: PDF (Per Kebun) ===
  const handleExportPdfByKebun = async () => {
    if (!selectedKebun) {
      await Swal.fire({
        title: "Kebun belum dipilih",
        text: "Silakan pilih kebun terlebih dahulu.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    try {
      const allRows = await fetchAllRencanaForExport();
      const kebunRows = allRows.filter((r) => r.kebun === selectedKebun);

      if (kebunRows.length === 0) {
        await Swal.fire({
          title: "Tidak ada data",
          text: "Tidak ada data rencana untuk kebun yang dipilih.",
          icon: "info",
          confirmButtonText: "OK",
        });
        return;
      }

      const jsPDFmod = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDFmod.jsPDF({ orientation: "landscape" });

      const kebunLabel = KEBUN_LABEL[selectedKebun] ?? selectedKebun;

      doc.setFontSize(10);
      doc.text(
        `Rencana Pemupukan - Kebun ${kebunLabel} (${selectedKebun})`,
        14,
        12
      );

      const body = kebunRows.map((r) => [
        r.tanggal,
        r.kategori,
        KEBUN_LABEL[r.kebun] ?? r.kebun,
        r.kodeKebun,
        r.afd,
        r.tt,
        r.blok,
        fmtNum(r.luas),
        fmtNum(r.inv),
        r.jenisPupuk,
        fmtNum(r.aplikasi),
        fmtNum(r.dosis),
        fmtNum(r.kgPupuk),
      ]);

      autoTable(doc, {
        startY: 16,
        head: [TABLE_HEADERS as unknown as string[]],
        body,
        styles: { fontSize: 6 },
        headStyles: { fillColor: [226, 232, 240] },
        margin: { left: 10, right: 10 },
      });

      const fileName = `Rencana_Pemupukan_${selectedKebun}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error(err);
      await Swal.fire({
        title: "Gagal export",
        text: "Terjadi kesalahan saat export data ke PDF.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  return (
    <section className="space-y-2">
      <SectionHeader
        title="Riwayat Rencana"
        desc="Daftar input rencana terbaru dari database"
      />

      <Card className="bg-white/80 dark:bg-slate-900/60">
        {/* Header + action buttons */}
        <CardHeader className="pb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-[13px]">
              Pencarian, Aksi, & Export
            </CardTitle>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Filter data, hapus, atau export riwayat rencana ke Excel/PDF.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            {/* Export Excel */}
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={handleExportExcelAll}
                disabled={loading || total === 0}
                className="px-3 py-1.5 rounded border border-emerald-300 text-[11px] text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
              >
                Export Excel (Semua Kebun)
              </button>
              <button
                type="button"
                onClick={handleExportExcelByKebun}
                disabled={loading || !selectedKebun}
                className="px-3 py-1.5 rounded border border-emerald-300 text-[11px] text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
              >
                Export Excel (Per Kebun)
              </button>
            </div>

            {/* Export PDF */}
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={handleExportPdfAll}
                disabled={loading || total === 0}
                className="px-3 py-1.5 rounded border border-sky-300 text-[11px] text-sky-800 hover:bg-sky-50 disabled:opacity-50"
              >
                Export PDF (Semua Kebun)
              </button>
              <button
                type="button"
                onClick={handleExportPdfByKebun}
                disabled={loading || !selectedKebun}
                className="px-3 py-1.5 rounded border border-sky-300 text-[11px] text-sky-800 hover:bg-sky-50 disabled:opacity-50"
              >
                Export PDF (Per Kebun)
              </button>
            </div>

            {/* Hapus semua data */}
            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={total === 0 || loading}
              className="px-3 py-1.5 rounded border border-red-300 text-[11px] text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Hapus Semua Data
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Bar filter + pilih kebun */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex-1">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari kategori (TM/TBM/BIBITAN) / kebun / AFD / blok / jenis pupuk / tanggal… (hanya dalam halaman ini)"
                className="h-9"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={selectedKebun}
                onValueChange={(v) => setSelectedKebun(v)}
                disabled={loading}
              >
                <SelectTrigger className="h-9 w-[220px]">
                  <SelectValue placeholder="Filter / Pilih kebun" />
                </SelectTrigger>
                <SelectContent>
                  {kebunList.map((code) => (
                    <SelectItem key={code} value={code}>
                      {(KEBUN_LABEL[code] ?? code) + ` (${code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <button
                type="button"
                onClick={handleDeleteByKebun}
                disabled={!selectedKebun || loading || total === 0}
                className="px-3 py-1.5 rounded border border-red-300 text-[11px] text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Hapus per Kebun
              </button>
            </div>
          </div>

          {/* Tabel + virtual scroll + pagination */}
          <div
            ref={scrollParentRef}
            className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-md max-h-[520px]"
          >
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/40 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left">Tanggal</th>
                  <th className="px-3 py-2 text-left">Kategori</th>
                  <th className="px-3 py-2 text-left">Kebun</th>
                  <th className="px-3 py-2 text-left">Kode Kebun</th>
                  <th className="px-3 py-2 text-left">AFD</th>
                  <th className="px-3 py-2 text-left">TT</th>
                  <th className="px-3 py-2 text-left">Blok</th>
                  <th className="px-3 py-2 text-right">Luas (Ha)</th>
                  <th className="px-3 py-2 text-right">INV</th>
                  <th className="px-3 py-2 text-left">Jenis Pupuk</th>
                  <th className="px-3 py-2 text-right">Aplikasi</th>
                  <th className="px-3 py-2 text-right">Dosis (Kg/pokok)</th>
                  <th className="px-3 py-2 text-right">Kg Pupuk</th>
                  <th className="px-3 py-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paddingTop > 0 && (
                  <tr>
                    <td colSpan={14} style={{ height: paddingTop }} />
                  </tr>
                )}

                {virtualItems.map((virtualRow) => {
                  const r = filtered[virtualRow.index];
                  if (!r) return null;

                  return (
                    <tr
                      key={`${r.id}-${r.kebun}-${r.kodeKebun}-${r.tanggal}-${virtualRow.index}`}
                      className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-3 py-2">{r.tanggal}</td>
                      <td className="px-3 py-2">{r.kategori}</td>
                      <td className="px-3 py-2">
                        {KEBUN_LABEL[r.kebun] ?? r.kebun}
                      </td>
                      <td className="px-3 py-2">{r.kodeKebun || "-"}</td>
                      <td className="px-3 py-2">{r.afd}</td>
                      <td className="px-3 py-2">{r.tt || "-"}</td>
                      <td className="px-3 py-2">{r.blok}</td>
                      <td className="px-3 py-2 text-right">
                        {fmtNum(r.luas)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {fmtNum(r.inv)}
                      </td>
                      <td className="px-3 py-2">{r.jenisPupuk}</td>
                      <td className="px-3 py-2 text-right">
                        {fmtNum(r.aplikasi)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {fmtNum(r.dosis)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {fmtNum(r.kgPupuk)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(r)}
                            className="px-2 py-1 rounded border border-slate-300 text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(r)}
                            className="px-2 py-1 rounded border border-red-300 text-[11px] text-red-700 hover:bg-red-50"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {paddingBottom > 0 && (
                  <tr>
                    <td colSpan={14} style={{ height: paddingBottom }} />
                  </tr>
                )}

                {!loading && total === 0 && (
                  <tr>
                    <td
                      colSpan={14}
                      className="px-3 py-6 text-center text-slate-500"
                    >
                      Tidak ada data.
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td
                      colSpan={14}
                      className="px-3 py-6 text-center text-slate-500"
                    >
                      Memuat data…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination sederhana */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600 dark:text-slate-300">
            <span>
              Menampilkan {startIdx}-{endIdx} dari {total} data
              {selectedKebun && (
                <> &nbsp; (filter kebun: {selectedKebun})</>
              )}
              &nbsp; (Halaman {page} / {totalPages})
            </span>
            <div className="flex gap-2 justify-end">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
