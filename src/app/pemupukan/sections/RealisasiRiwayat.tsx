"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SectionHeader from "../components/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KEBUN_LABEL, ORDER_DTM, ORDER_DBR } from "../constants";
import { usePemupukan } from "../context";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";

type Kategori = "TM" | "TBM" | "BIBITAN";

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

type HistoryRow = {
  id: number;
  tanggal: string;
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

const PAGE_SIZE = 500;

/* =================== CACHE UNTUK FETCH SEMUA REALISASI =================== */

type RealisasiHistoryCacheEntry = {
  data: HistoryRow[];
  ts: number;
};

const REALISASI_HISTORY_CACHE_TTL = 60_000; // 60 detik
let realisasiHistoryCache: RealisasiHistoryCacheEntry | null = null;

/* =================== HELPER-HELPER =================== */

function parseDateValue(s: string): number {
  if (!s || s === "-") return 0;
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : 0;
}

function fmtNum(n: number | null | undefined) {
  if (n == null) return "-";
  return n.toLocaleString("id-ID");
}

function toLocalYmd(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function makeSheetName(raw: string): string {
  const invalid = /[\\/?*[\]:]/g;
  let name = raw.replace(invalid, " ");
  if (!name.trim()) name = "Sheet";
  if (name.length > 31) name = name.slice(0, 31);
  return name;
}

// mapping API → HistoryRow
function mapApiToHistoryRow(r: ApiRealisasi): HistoryRow {
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

// GET semua realisasi (tanpa pagination) → dipakai untuk RIWAYAT & EXPORT
async function fetchAllRealisasiForExport(): Promise<HistoryRow[]> {
  const now = Date.now();

  // 1) Coba pakai cache lokal terlebih dulu
  if (
    realisasiHistoryCache &&
    now - realisasiHistoryCache.ts < REALISASI_HISTORY_CACHE_TTL
  ) {
    return realisasiHistoryCache.data;
  }

  // 2) Kalau belum ada / kadaluarsa → fetch dari API seperti biasa
  const res = await fetch("/api/pemupukan/realisasi", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Gagal mengambil semua data realisasi");
  }

  const json = await res.json();
  const dataArray: ApiRealisasi[] = Array.isArray(json) ? json : json.data;
  const mapped = dataArray.map(mapApiToHistoryRow);

  // simpan ke cache
  realisasiHistoryCache = {
    data: mapped,
    ts: Date.now(),
  };

  return mapped;
}

export default function RealisasiRiwayat() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [total, setTotal] = useState(0);
  const [selectedKebun, setSelectedKebun] = useState<string>("");

  const router = useRouter();
  const scrollParentRef = useRef<HTMLDivElement | null>(null);

  // STATE OVERLAY EXPORT
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [exportTotalGroups, setExportTotalGroups] = useState(0);
  const [exportProcessedGroups, setExportProcessedGroups] = useState(0);
  const [exportCurrentKebun, setExportCurrentKebun] = useState<string | null>(
    null
  );

  // ====== FILTER GLOBAL DARI CONTEXT (FilterPanel) ======
  const {
    distrik,
    kebun: globalKebun,
    kategori,
    afd,
    tt,
    blok,
    jenis,
    aplikasi,
    dataYear,
    dateFrom,
    dateTo,
  } = usePemupukan();

  const [page, setPage] = useState(1);

  // ============= LOAD SEMUA DATA SEKALI SAJA =============
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        const allRows = await fetchAllRealisasiForExport();
        if (!active) return;

        setRows(allRows);
        setTotal(allRows.length);
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
  }, []);

  // reset halaman ketika filter/search/global filter berubah
  useEffect(() => {
    setPage(1);
  }, [
    q,
    selectedKebun,
    distrik,
    globalKebun,
    kategori,
    afd,
    tt,
    blok,
    jenis,
    aplikasi,
    dataYear,
    dateFrom,
    dateTo,
  ]);

  // opsi kebun dari SELURUH data
  const kebunOptions = useMemo(() => {
    const codes = Array.from(
      new Set(
        rows
          .map((r) => r.kebun)
          .filter((c): c is string => !!c && c.trim() !== "")
      )
    );
    codes.sort();
    return codes.map((code) => ({
      code,
      name: KEBUN_LABEL[code] ?? code,
    }));
  }, [rows]);

  // filter global + kebun lokal + search + sort tanggal desc
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();

    let base = rows;

    // 1) filter distrik -> list kebun (DTM / DBR)
    if (distrik !== "all") {
      const allowedKebun =
        distrik === "DTM" ? ORDER_DTM : distrik === "DBR" ? ORDER_DBR : [];
      if (allowedKebun.length) {
        base = base.filter((r) => allowedKebun.includes(r.kebun));
      }
    }

    // 2) filter kebun dari FilterPanel (global)
    if (globalKebun !== "all") {
      base = base.filter((r) => r.kebun === globalKebun);
    }

    // 3) kategori
    if (kategori !== "all") {
      base = base.filter((r) => r.kategori === kategori);
    }

    // 4) AFD / TT / Blok / Jenis Pupuk
    if (afd !== "all") {
      base = base.filter((r) => r.afd === afd);
    }
    if (tt !== "all") {
      base = base.filter((r) => r.tt === tt);
    }
    if (blok !== "all") {
      base = base.filter((r) => r.blok === blok);
    }
    if (jenis !== "all") {
      base = base.filter((r) => r.jenisPupuk === jenis);
    }

    // 5) Aplikasi (global)
    if (aplikasi !== "all") {
      base = base.filter(
        (r) => String(r.aplikasi ?? "") === String(aplikasi)
      );
    }

    // 6) Tahun Data (global)
    if (dataYear) {
      base = base.filter(
        (r) =>
          r.tanggal !== "-" &&
          !!r.tanggal &&
          r.tanggal.startsWith(String(dataYear))
      );
    }

    // 7) Range tanggal global
    if (dateFrom || dateTo) {
      const fromVal = dateFrom ? parseDateValue(dateFrom) : 0;
      const toVal = dateTo ? parseDateValue(dateTo) : Number.POSITIVE_INFINITY;

      base = base.filter((r) => {
        const t = parseDateValue(r.tanggal);
        if (dateFrom && t < fromVal) return false;
        if (dateTo && t > toVal) return false;
        return true;
      });
    }

    // 8) FILTER KHUSUS HALAMAN (dropdown "Filter / Pilih kebun…")
    if (selectedKebun) {
      base = base.filter((r) => r.kebun === selectedKebun);
    }

    // 9) FILTER TEKS (search bar)
    if (term) {
      base = base.filter((r) => {
        const keb = KEBUN_LABEL[r.kebun] ?? r.kebun ?? "";
        return [
          r.kategori,
          keb,
          r.kodeKebun ?? "",
          r.afd ?? "",
          r.tt ?? "",
          r.blok ?? "",
          r.jenisPupuk ?? "",
          r.tanggal ?? "",
        ]
          .map((v) => String(v).toLowerCase())
          .some((v) => v.includes(term));
      });
    }

    // sort terbaru di atas
    return [...base].sort(
      (a, b) => parseDateValue(b.tanggal) - parseDateValue(a.tanggal)
    );
  }, [
    rows,
    q,
    selectedKebun,
    distrik,
    globalKebun,
    kategori,
    afd,
    tt,
    blok,
    jenis,
    aplikasi,
    dataYear,
    dateFrom,
    dateTo,
  ]);

  // ====== PAGINATION (per 500 data) ======
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    [filtered.length]
  );

  const currentPage = Math.min(page, totalPages);
  const pageStartIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStartIndex, pageStartIndex + PAGE_SIZE);

  const showingFrom = filtered.length === 0 ? 0 : pageStartIndex + 1;
  const showingTo =
    filtered.length === 0 ? 0 : pageStartIndex + pageRows.length;

  // virtualizer: hanya untuk baris yang sudah ter-filter & ter-paginate
  const rowVirtualizer = useVirtualizer({
    count: pageRows.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 32,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start || 0 : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() -
        (virtualItems[virtualItems.length - 1].end || 0)
      : 0;

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
      const res = await fetch(`/api/pemupukan/realisasi?id=${row.id}`, {
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

      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setTotal((prev) => (prev > 0 ? prev - 1 : 0));
      // invalidasi cache lokal agar export berikutnya ambil data terbaru
      realisasiHistoryCache = null;

      await Swal.fire({
        title: "Berhasil",
        text: "Data realisasi berhasil dihapus.",
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

  const handleDeleteAll = async () => {
    if (total === 0) return;

    const result = await Swal.fire({
      title: "Hapus semua data realisasi?",
      html: `
        <div style="text-align:left;font-size:12px">
          Tindakan ini akan menghapus <b>semua</b> data realisasi pemupukan di database.<br/>
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
      const res = await fetch("/api/pemupukan/realisasi?all=1", {
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
      setQ("");
      setSelectedKebun("");
      setTotal(0);
      realisasiHistoryCache = null;

      await Swal.fire({
        title: "Berhasil",
        text: "Semua data realisasi berhasil dihapus.",
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

  const handleDeleteByKebun = async () => {
    if (!selectedKebun) {
      await Swal.fire({
        title: "Kebun belum dipilih",
        text: "Silakan pilih kebun yang akan dihapus datanya.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    const label = KEBUN_LABEL[selectedKebun] ?? selectedKebun;

    const result = await Swal.fire({
      title: "Hapus semua data realisasi untuk kebun ini?",
      html: `
        <div style="text-align:left;font-size:12px">
          Kebun: <b>${label}</b> (${selectedKebun})<br/>
          Tindakan ini akan menghapus <b>semua</b> data realisasi dengan kode kebun tersebut.<br/>
          Data yang sudah dihapus <b>tidak dapat dikembalikan</b>.
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus kebun ini",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(
        `/api/pemupukan/realisasi?kebun=${encodeURIComponent(selectedKebun)}`,
        { method: "DELETE" }
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

      const json = await res.json().catch(() => null);
      const deletedCount = json?.deletedCount ?? 0;

      setRows((prev) => prev.filter((r) => r.kebun !== selectedKebun));
      setTotal((prev) =>
        deletedCount > 0 ? Math.max(0, prev - deletedCount) : prev
      );
      setSelectedKebun("");
      realisasiHistoryCache = null;

      await Swal.fire({
        title: "Berhasil",
        html: `Data realisasi untuk kebun <b>${label}</b> berhasil dihapus.<br/>Baris terhapus: <b>${deletedCount}</b>.`,
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

  const handleEdit = (row: HistoryRow) => {
    router.push(`/pemupukan/realisasi/edit?id=${row.id}`);
  };

  // ==== HELPER: reset state overlay export ====
  const resetExportState = () => {
    setExporting(false);
    setExportMessage("");
    setExportTotalGroups(0);
    setExportProcessedGroups(0);
    setExportCurrentKebun(null);
  };

  // ===== EXPORT (pakai fetchAllRealisasiForExport yang sama) =====

  const handleExportExcelAll = async () => {
    try {
      setExporting(true);
      setExportMessage("Export Excel (Semua Kebun)…");

      const allRows = await fetchAllRealisasiForExport();

      if (allRows.length === 0) {
        await Swal.fire({
          title: "Tidak ada data",
          text: "Tidak ada data realisasi untuk diexport.",
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

      const kebunEntries = Object.entries(grouped).filter(
        ([, kebunRows]) => kebunRows.length > 0
      );

      setExportTotalGroups(kebunEntries.length);
      setExportProcessedGroups(0);

      for (let i = 0; i < kebunEntries.length; i++) {
        const [kebunCode, kebunRows] = kebunEntries[i];

        setExportCurrentKebun(kebunCode);
        setExportProcessedGroups(i);
        await new Promise((resolve) => setTimeout(resolve, 0));

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
      }

      setExportProcessedGroups(kebunEntries.length);

      XLSX.writeFile(workbook, "Realisasi_Pemupukan_Semua_Kebun.xlsx");
    } catch (err) {
      console.error(err);
      await Swal.fire({
        title: "Gagal export",
        text: "Terjadi kesalahan saat export data ke Excel.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      resetExportState();
    }
  };

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
      setExporting(true);
      setExportMessage(`Export Excel (Kebun ${selectedKebun})…`);
      setExportTotalGroups(1);
      setExportProcessedGroups(0);
      setExportCurrentKebun(selectedKebun);

      const allRows = await fetchAllRealisasiForExport();
      const kebunRows = allRows.filter((r) => r.kebun === selectedKebun);

      if (kebunRows.length === 0) {
        await Swal.fire({
          title: "Tidak ada data",
          text: "Tidak ada data realisasi untuk kebun yang dipilih.",
          icon: "info",
          confirmButtonText: "OK",
        });
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 0));

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

      setExportProcessedGroups(1);

      const fileName = `Realisasi_Pemupukan_${selectedKebun}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (err) {
      console.error(err);
      await Swal.fire({
        title: "Gagal export",
        text: "Terjadi kesalahan saat export data ke Excel.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      resetExportState();
    }
  };

  const handleExportPdfAll = async () => {
    try {
      setExporting(true);
      setExportMessage("Export PDF (Semua Kebun)…");

      const allRows = await fetchAllRealisasiForExport();

      if (allRows.length === 0) {
        await Swal.fire({
          title: "Tidak ada data",
          text: "Tidak ada data realisasi untuk diexport.",
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

      setExportTotalGroups(kebunEntries.length);
      setExportProcessedGroups(0);

      for (let i = 0; i < kebunEntries.length; i++) {
        const [kebunCode, kebunRows] = kebunEntries[i];

        setExportCurrentKebun(kebunCode);
        setExportProcessedGroups(i);
        await new Promise((resolve) => setTimeout(resolve, 0));

        if (i > 0) {
          doc.addPage("landscape");
        }

        const kebunLabel = KEBUN_LABEL[kebunCode] ?? kebunCode;
        doc.setFontSize(10);
        doc.text(
          `Realisasi Pemupukan - Kebun ${kebunLabel} (${kebunCode})`,
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
      }

      setExportProcessedGroups(kebunEntries.length);

      doc.save("Realisasi_Pemupukan_Semua_Kebun.pdf");
    } catch (err) {
      console.error(err);
      await Swal.fire({
        title: "Gagal export",
        text: "Terjadi kesalahan saat export data ke PDF.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      resetExportState();
    }
  };

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
      setExporting(true);
      setExportMessage(`Export PDF (Kebun ${selectedKebun})…`);
      setExportTotalGroups(1);
      setExportProcessedGroups(0);
      setExportCurrentKebun(selectedKebun);

      const allRows = await fetchAllRealisasiForExport();
      const kebunRows = allRows.filter((r) => r.kebun === selectedKebun);

      if (kebunRows.length === 0) {
        await Swal.fire({
          title: "Tidak ada data",
          text: "Tidak ada data realisasi untuk kebun yang dipilih.",
          icon: "info",
          confirmButtonText: "OK",
        });
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 0));

      const jsPDFmod = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDFmod.jsPDF({ orientation: "landscape" });

      const kebunLabel = KEBUN_LABEL[selectedKebun] ?? selectedKebun;
      doc.setFontSize(10);
      doc.text(
        `Realisasi Pemupukan - Kebun ${kebunLabel} (${selectedKebun})`,
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

      setExportProcessedGroups(1);

      const fileName = `Realisasi_Pemupukan_${selectedKebun}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error(err);
      await Swal.fire({
        title: "Gagal export",
        text: "Terjadi kesalahan saat export data ke PDF.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      resetExportState();
    }
  };

  const progressPercent =
    exportTotalGroups > 0
      ? Math.min(100, (exportProcessedGroups / exportTotalGroups) * 100)
      : 0;

  const currentKebunLabel =
    exportCurrentKebun != null
      ? `${KEBUN_LABEL[exportCurrentKebun] ?? exportCurrentKebun} (${exportCurrentKebun})`
      : "-";

  return (
    <>
      {/* OVERLAY EXPORT FULL-SCREEN */}
      {exporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl px-4 py-3 w-[320px] space-y-3 border border-emerald-200 dark:border-emerald-700">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border border-emerald-600 border-t-transparent"
                aria-label="loading"
              />
              <span className="text-[12px] font-medium text-emerald-800 dark:text-emerald-200">
                {exportMessage || "Sedang memproses export…"}
              </span>
            </div>

            {exportTotalGroups > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  Kebun saat ini:
                  <br />
                  <span className="font-medium">{currentKebunLabel}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 dark:bg-emerald-400 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span>
                    {exportProcessedGroups}/{exportTotalGroups} kebun
                  </span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
              </div>
            )}

            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Mohon tidak menutup halaman hingga proses export selesai.
            </p>
          </div>
        </div>
      )}

      <section className="space-y-2">
        <SectionHeader
          title="Riwayat Realisasi"
          desc="Daftar input realisasi terbaru dari database"
        />

        <Card className="glass-card border border-white/20 dark:border-white/10 shadow-lg">
          <CardHeader className="pb-2 glass-header flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-[13px]">
                Pencarian, Aksi, &amp; Export
              </CardTitle>
              <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                Filter data, hapus, atau export riwayat realisasi ke Excel/PDF.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={handleExportExcelAll}
                  disabled={loading || total === 0 || exporting}
                  className="px-3 py-1.5 rounded-md text-[11px] bg-white/30 backdrop-blur-md border border-white/20 shadow-sm hover:bg-white/40 transition disabled:opacity-50 text-emerald-900"
                >
                  Export Excel (Semua Kebun)
                </button>
                <button
                  type="button"
                  onClick={handleExportExcelByKebun}
                  disabled={loading || !selectedKebun || exporting}
                  className="px-3 py-1.5 rounded-md text-[11px] bg-white/30 backdrop-blur-md border border-white/20 shadow-sm hover:bg-white/40 transition disabled:opacity-50 text-emerald-900"
                >
                  Export Excel (Per Kebun)
                </button>
              </div>

              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={handleExportPdfAll}
                  disabled={loading || total === 0 || exporting}
                  className="px-3 py-1.5 rounded-md text-[11px] bg-white/30 backdrop-blur-md border border-white/20 shadow-sm hover:bg-white/40 transition disabled:opacity-50 text-sky-900"
                >
                  Export PDF (Semua Kebun)
                </button>
                <button
                  type="button"
                  onClick={handleExportPdfByKebun}
                  disabled={loading || !selectedKebun || exporting}
                  className="px-3 py-1.5 rounded-md text-[11px] bg-white/30 backdrop-blur-md border border-white/20 shadow-sm hover:bg-white/40 transition disabled:opacity-50 text-sky-900"
                >
                  Export PDF (Per Kebun)
                </button>
              </div>

              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={total === 0 || loading || exporting}
                className="px-3 py-1.5 rounded-md text-[11px] bg-white/30 backdrop-blur-md border border-white/20 shadow-sm hover:bg-red-50/80 text-red-700 disabled:opacity-50"
              >
                Hapus Semua Data
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex-1">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari kategori (TM/TBM/BIBITAN) / kebun / AFD / blok / jenis pupuk / tanggal…"
                  className="h-9 glass-input text-[11px]"
                />
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={selectedKebun}
                  onChange={(e) => setSelectedKebun(e.target.value)}
                  disabled={exporting}
                  className="h-9 px-2 text-[11px] rounded border border-slate-300 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  <option value="">Filter / Pilih kebun…</option>
                  {kebunOptions.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.name} ({o.code})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleDeleteByKebun}
                  disabled={!selectedKebun || loading || exporting}
                  className="px-3 py-1.5 rounded-md text-[11px] bg-white/30 backdrop-blur-md border border-white/20 shadow-sm hover:bg-red-50/80 text-red-700 disabled:opacity-50"
                >
                  Hapus Data per Kebun
                </button>
              </div>
            </div>

            {/* Tabel + virtual scroll (per halaman) */}
            <div
              ref={scrollParentRef}
              className="overflow-x-auto glass-panel rounded-xl max-h-[520px] border border-white/10"
            >
              <table className="min-w-full text-xs">
                {/* === HEADER YANG SUDAH DIPERTEBAL & SOLID === */}
                <thead className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md text-slate-800 dark:text-slate-100 border-b border-white/20">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Tanggal</th>
                    <th className="px-3 py-2 text-left font-semibold">Kategori</th>
                    <th className="px-3 py-2 text-left font-semibold">Kebun</th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Kode Kebun
                    </th>
                    <th className="px-3 py-2 text-left font-semibold">AFD</th>
                    <th className="px-3 py-2 text-left font-semibold">TT</th>
                    <th className="px-3 py-2 text-left font-semibold">Blok</th>
                    <th className="px-3 py-2 text-right font-semibold">
                      Luas (Ha)
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">INV</th>
                    <th className="px-3 py-2 text-left font-semibold">
                      Jenis Pupuk
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      Aplikasi
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      Dosis (Kg/pokok)
                    </th>
                    <th className="px-3 py-2 text-right font-semibold">
                      Kg Pupuk
                    </th>
                    <th className="px-3 py-2 text-center font-semibold">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {paddingTop > 0 && (
                    <tr>
                      <td colSpan={14} style={{ height: paddingTop }} />
                    </tr>
                  )}

                  {virtualItems.map((virtualRow) => {
                    const r = pageRows[virtualRow.index];
                    if (!r) return null;

                    return (
                      <tr
                        key={`${r.id}-${virtualRow.index}`}
                        className="border-t border-white/10 hover:bg-white/10 dark:hover:bg-white/5 transition"
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
                              className="px-2 py-1 rounded-md border border-white/20 bg-white/30 backdrop-blur-md text-[11px] hover:bg-white/50 dark:hover:bg-white/20"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(r)}
                              className="px-2 py-1 rounded-md border border-red-300 bg-white/40 backdrop-blur-md text-[11px] text-red-700 hover:bg-red-50/80"
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

                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={14}
                        className="px-3 py-6 text-center text-slate-200"
                      >
                        Tidak ada data.
                      </td>
                    </tr>
                  )}

                  {loading && (
                    <tr>
                      <td
                        colSpan={14}
                        className="px-3 py-6 text-center text-slate-200"
                      >
                        Memuat data…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Info ringkas + pagination */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-100/90">
              <span>
                {filtered.length === 0 ? (
                  <>Menampilkan 0 data dari total {total} data</>
                ) : (
                  <>
                    Menampilkan {showingFrom}–{showingTo} dari{" "}
                    {filtered.length} data tersaring (dari total {total} data
                    {selectedKebun && (
                      <> &nbsp; | filter kebun: {selectedKebun}</>
                    )}
                    )
                  </>
                )}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || filtered.length === 0}
                  className="px-2 py-1 rounded-md border border-white/20 bg-white/20 backdrop-blur-md text-[11px] disabled:opacity-40 hover:bg-white/40 dark:hover:bg-white/10"
                >
                  Sebelumnya
                </button>
                <span className="text-[11px]">
                  Halaman {filtered.length === 0 ? 0 : currentPage} dari{" "}
                  {filtered.length === 0 ? 0 : totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={
                    currentPage === totalPages || filtered.length === 0
                  }
                  className="px-2 py-1 rounded-md border border-white/20 bg-white/20 backdrop-blur-md text-[11px] disabled:opacity-40 hover:bg-white/40 dark:hover:bg-white/10"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
