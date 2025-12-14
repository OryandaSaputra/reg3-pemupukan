"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SectionHeader from "../../shared/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KEBUN_LABEL, ORDER_DTM, ORDER_DBR } from "../../../_config/constants";
import { usePemupukan } from "../../../_state/context";
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
  createdAt?: string;
  updatedAt?: string;
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

// Untuk tampilan tabel: 200 cukup & hemat transfer
const PAGE_SIZE = 200;

// Export: ambil bertahap per page agar tidak fetch all sekaligus
const EXPORT_PAGE_SIZE = 500;
const EXPORT_MAX_PAGES = 200; // 200 * 500 = 100.000 baris maksimum (guard)

// ===================== HELPERS =====================

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

// mapping ApiRencana -> HistoryRow
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

// HistoryRow → body untuk Excel
function historyRowsToSheetBody(rows: HistoryRow[]): (string | number)[][] {
  return rows.map((r) => [
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
  ]);
}

// ===================== "CACHE" LEGACY (NO-OP) =====================
// Supaya tidak error kalau ada import lama di tempat lain.
// Jika tidak dipakai sama sekali, boleh dihapus.
export function invalidateRencanaCache() {
  // no-op
}

// ===================== API FETCH HELPERS =====================

function buildRencanaQuery(params: {
  page: number;
  pageSize: number;

  // global filters
  distrik?: string;
  kebun?: string;
  kategori?: string;
  afd?: string;
  tt?: string;
  blok?: string;
  jenis?: string;
  aplikasi?: string | number;

  // time & search
  tahun?: string | number;
  dateFrom?: string | null;
  dateTo?: string | null;
  search?: string;
}) {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page));
  sp.set("pageSize", String(params.pageSize));

  // global filters → server
  if (params.distrik && params.distrik !== "all") sp.set("distrik", params.distrik);
  if (params.kebun) sp.set("kebun", params.kebun);
  if (params.kategori) sp.set("kategori", params.kategori);

  if (params.afd && params.afd !== "all") sp.set("afd", params.afd);
  if (params.tt && params.tt !== "all") sp.set("tt", params.tt);
  if (params.blok && params.blok !== "all") sp.set("blok", params.blok);
  if (params.jenis && params.jenis !== "all") sp.set("jenis", params.jenis);

  if (params.aplikasi != null && String(params.aplikasi) !== "" && String(params.aplikasi) !== "all") {
    sp.set("aplikasi", String(params.aplikasi));
  }

  // time & search
  if (params.tahun) sp.set("tahun", String(params.tahun));
  if (params.dateFrom) sp.set("dateFrom", params.dateFrom);
  if (params.dateTo) sp.set("dateTo", params.dateTo);
  if (params.search && params.search.trim()) sp.set("search", params.search.trim());

  return sp.toString();
}

async function fetchRencanaPage(args: {
  page: number;
  pageSize: number;

  // global filters
  distrik?: string;
  kebun?: string;
  kategori?: string;
  afd?: string;
  tt?: string;
  blok?: string;
  jenis?: string;
  aplikasi?: string | number;

  // time & search
  tahun?: string | number;
  dateFrom?: string | null;
  dateTo?: string | null;
  search?: string;
}) {
  const qs = buildRencanaQuery(args);
  const res = await fetch(`/api/pemupukan/rencana?${qs}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Gagal mengambil data rencana");
  const json = await res.json();

  const dataArray: ApiRencana[] = Array.isArray(json) ? json : json.data;
  const meta = Array.isArray(json) ? null : json.meta;

  return {
    rows: dataArray.map(mapApiToHistoryRow),
    meta: meta as null | {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    },
  };
}

async function fetchRencanaForExport(args: {
  // global filters
  distrik?: string;
  kebun?: string;
  kategori?: string;
  afd?: string;
  tt?: string;
  blok?: string;
  jenis?: string;
  aplikasi?: string | number;

  // time & search
  tahun?: string | number;
  dateFrom?: string | null;
  dateTo?: string | null;
  search?: string;
}) {
  const out: HistoryRow[] = [];

  for (let page = 1; page <= EXPORT_MAX_PAGES; page++) {
    const { rows, meta } = await fetchRencanaPage({
      page,
      pageSize: EXPORT_PAGE_SIZE,
      ...args,
    });

    out.push(...rows);

    if (meta && page >= meta.totalPages) break;
    if (!meta && rows.length === 0) break;
  }

  return out;
}

// ===================== COMPONENT =====================

export default function RencanaRiwayat() {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const router = useRouter();

  // kebun yang dipilih (filter + hapus & export per kebun)
  const [selectedKebun, setSelectedKebun] = useState("");

  // STATE OVERLAY EXPORT
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [exportTotalGroups, setExportTotalGroups] = useState(0);
  const [exportProcessedGroups, setExportProcessedGroups] = useState(0);
  const [exportCurrentKebun, setExportCurrentKebun] = useState<string | null>(
    null
  );

  const [serverMeta, setServerMeta] = useState<{
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  } | null>(null);

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
  const scrollParentRef = useRef<HTMLDivElement | null>(null);

  // reset halaman ketika query server berubah
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

  // ========= LOAD DATA PER HALAMAN (SERVER-SIDE PAGINATION) =========
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);

        // kebun efektif: selectedKebun > globalKebun > (kosong = semua)
        const effectiveKebun =
          selectedKebun || (globalKebun !== "all" ? globalKebun : "");

        const effectiveKategori = kategori !== "all" ? kategori : "";

        // tahun hanya dipakai jika tidak ada date range
        const effectiveTahun =
          !dateFrom && !dateTo && dataYear ? dataYear : "";

        const { rows: pageRows, meta } = await fetchRencanaPage({
          page,
          pageSize: PAGE_SIZE,

          // global filters → server
          distrik: distrik !== "all" ? distrik : undefined,
          kebun: effectiveKebun || undefined,
          kategori: effectiveKategori || undefined,
          afd: afd !== "all" ? afd : undefined,
          tt: tt !== "all" ? tt : undefined,
          blok: blok !== "all" ? blok : undefined,
          jenis: jenis !== "all" ? jenis : undefined,
          aplikasi: aplikasi !== "all" ? aplikasi : undefined,

          // time & search
          tahun: effectiveTahun || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          search: q || undefined,
        });

        if (!active) return;

        setRows(pageRows);
        setServerMeta(meta);
      } catch (err) {
        console.error(err);
        if (active) {
          setRows([]);
          setServerMeta(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [
    page,
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

  // opsi kebun: jangan ambil dari rows (karena rows hanya 1 page)
  const kebunList = useMemo(() => {
    return Object.keys(KEBUN_LABEL).sort();
  }, []);

  // Filter client-only (yang belum didukung API): distrik + afd/tt/blok/jenis/aplikasi
  const filtered = useMemo(() => {
    return rows;
  }, [rows]);

  // Pagination server
  const totalPages = serverMeta?.totalPages ?? 1;
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered;

  const total = serverMeta?.total ?? 0;
  const showingFrom = total > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const showingTo = total > 0 ? showingFrom - 1 + pageRows.length : 0;

  // virtualizer – hanya untuk baris di halaman saat ini
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

      // server jadi source-of-truth
      router.refresh();
      setPage(1);

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
        console.error("Gagal menghapus semua:", text);
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

      setQ("");
      setSelectedKebun("");
      router.refresh();
      setPage(1);

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

      setSelectedKebun("");
      router.refresh();
      setPage(1);

      await Swal.fire({
        title: "Berhasil",
        html: `Semua data rencana untuk kebun <b>${label}</b> berhasil dihapus.<br/>Baris terhapus: <b>${deletedCount}</b>.`,
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

  // ==== HELPER: reset state overlay export ====
  const resetExportState = () => {
    setExporting(false);
    setExportMessage("");
    setExportTotalGroups(0);
    setExportProcessedGroups(0);
    setExportCurrentKebun(null);
  };

  // helper: kebun target untuk export (lebih hemat jika distrik dipilih)
  const getExportKebunTargets = (): string[] | null => {
    if (selectedKebun) return [selectedKebun];
    if (globalKebun !== "all") return [globalKebun];

    if (distrik === "DTM") return ORDER_DTM;
    if (distrik === "DBR") return ORDER_DBR;

    return null; // null artinya semua kebun
  };

  // ===== EXPORT: Excel & PDF (ambil data per page sesuai filter aktif) =====

  const handleExportExcelAll = async () => {
    try {
      setExporting(true);
      setExportMessage("Export Excel (Semua Kebun)…");

      const effectiveKategori = kategori !== "all" ? kategori : "";
      const effectiveTahun = !dateFrom && !dateTo && dataYear ? dataYear : "";

      // Jika distrik aktif (DTM/DBR) dan tidak ada kebun spesifik,
      // lebih hemat ambil per kebun target dibanding ambil semua kebun.
      const kebunTargets = getExportKebunTargets();

      let allRows: HistoryRow[] = [];

      if (kebunTargets && kebunTargets.length > 0) {
        for (let i = 0; i < kebunTargets.length; i++) {
          const k = kebunTargets[i];

          // overlay progress per kebun
          setExportTotalGroups(kebunTargets.length);
          setExportProcessedGroups(i);
          setExportCurrentKebun(k);
          await new Promise((r) => setTimeout(r, 0));

          const rowsK = await fetchRencanaForExport({
            kebun: k,
            kategori: effectiveKategori || undefined,
            tahun: effectiveTahun || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            search: q || undefined,
            distrik: distrik !== "all" ? distrik : undefined,
            afd: afd !== "all" ? afd : undefined,
            tt: tt !== "all" ? tt : undefined,
            blok: blok !== "all" ? blok : undefined,
            jenis: jenis !== "all" ? jenis : undefined,
            aplikasi: aplikasi !== "all" ? aplikasi : undefined,
          });

          allRows.push(...rowsK);
        }
        setExportProcessedGroups(kebunTargets.length);
      } else {
        // semua kebun
        allRows = await fetchRencanaForExport({
          kebun: undefined,
          kategori: effectiveKategori || undefined,
          tahun: effectiveTahun || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          search: q || undefined,
          distrik: distrik !== "all" ? distrik : undefined,
          afd: afd !== "all" ? afd : undefined,
          tt: tt !== "all" ? tt : undefined,
          blok: blok !== "all" ? blok : undefined,
          jenis: jenis !== "all" ? jenis : undefined,
          aplikasi: aplikasi !== "all" ? aplikasi : undefined,
        });
      }

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

      const kebunEntries = Object.entries(grouped).filter(
        ([, kebunRows]) => kebunRows.length > 0
      );

      // jika tadi bukan mode "per kebun", set progress berdasarkan group hasil
      if (!kebunTargets) {
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
            ...historyRowsToSheetBody(kebunRows),
          ];

          const ws = XLSX.utils.aoa_to_sheet(sheetData);
          XLSX.utils.book_append_sheet(workbook, ws, sheetName);
        }

        setExportProcessedGroups(kebunEntries.length);
      } else {
        // per kebunTargets: langsung append per entri group (lebih sederhana)
        for (const [kebunCode, kebunRows] of kebunEntries) {
          const kebunLabel = KEBUN_LABEL[kebunCode] ?? kebunCode;
          const sheetName = makeSheetName(kebunLabel);
          const sheetData = [
            [...TABLE_HEADERS],
            ...historyRowsToSheetBody(kebunRows),
          ];
          const ws = XLSX.utils.aoa_to_sheet(sheetData);
          XLSX.utils.book_append_sheet(workbook, ws, sheetName);
        }
      }

      XLSX.writeFile(workbook, "Rencana_Pemupukan_Semua_Kebun.xlsx");
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

      const effectiveKategori = kategori !== "all" ? kategori : "";
      const effectiveTahun = !dateFrom && !dateTo && dataYear ? dataYear : "";

      const kebunRows = await fetchRencanaForExport({
        kebun: selectedKebun,
        kategori: effectiveKategori || undefined,
        tahun: effectiveTahun || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: q || undefined,
        distrik: distrik !== "all" ? distrik : undefined,
        afd: afd !== "all" ? afd : undefined,
        tt: tt !== "all" ? tt : undefined,
        blok: blok !== "all" ? blok : undefined,
        jenis: jenis !== "all" ? jenis : undefined,
        aplikasi: aplikasi !== "all" ? aplikasi : undefined,
      });

      if (kebunRows.length === 0) {
        await Swal.fire({
          title: "Tidak ada data",
          text: "Tidak ada data rencana untuk kebun yang dipilih.",
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
        ...historyRowsToSheetBody(kebunRows),
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, ws, sheetName);

      setExportProcessedGroups(1);

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
    } finally {
      resetExportState();
    }
  };

  const handleExportPdfAll = async () => {
    try {
      setExporting(true);
      setExportMessage("Export PDF (Semua Kebun)…");

      const effectiveKategori = kategori !== "all" ? kategori : "";
      const effectiveTahun = !dateFrom && !dateTo && dataYear ? dataYear : "";

      const kebunTargets = getExportKebunTargets();

      let allRows: HistoryRow[] = [];

      if (kebunTargets && kebunTargets.length > 0) {
        for (let i = 0; i < kebunTargets.length; i++) {
          const k = kebunTargets[i];
          setExportTotalGroups(kebunTargets.length);
          setExportProcessedGroups(i);
          setExportCurrentKebun(k);
          await new Promise((r) => setTimeout(r, 0));

          const rowsK = await fetchRencanaForExport({
            kebun: k,
            kategori: effectiveKategori || undefined,
            tahun: effectiveTahun || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            search: q || undefined,
            distrik: distrik !== "all" ? distrik : undefined,
            afd: afd !== "all" ? afd : undefined,
            tt: tt !== "all" ? tt : undefined,
            blok: blok !== "all" ? blok : undefined,
            jenis: jenis !== "all" ? jenis : undefined,
            aplikasi: aplikasi !== "all" ? aplikasi : undefined,
          });

          allRows.push(...rowsK);
        }
        setExportProcessedGroups(kebunTargets.length);
      } else {
        allRows = await fetchRencanaForExport({
          kebun: undefined,
          kategori: effectiveKategori || undefined,
          tahun: effectiveTahun || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          search: q || undefined,
          distrik: distrik !== "all" ? distrik : undefined,
          afd: afd !== "all" ? afd : undefined,
          tt: tt !== "all" ? tt : undefined,
          blok: blok !== "all" ? blok : undefined,
          jenis: jenis !== "all" ? jenis : undefined,
          aplikasi: aplikasi !== "all" ? aplikasi : undefined,
        });
      }

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

      // compressPdf = true
      const doc = new jsPDFmod.jsPDF("landscape", "pt", "a4", true);

      const grouped: Record<string, HistoryRow[]> = {};
      allRows.forEach((r) => {
        if (!grouped[r.kebun]) grouped[r.kebun] = [];
        grouped[r.kebun].push(r);
      });

      const kebunEntries = Object.entries(grouped).filter(
        ([, kebunRows]) => kebunRows.length > 0
      );

      // jika bukan mode kebunTargets, progress berdasarkan kebunEntries
      if (!kebunTargets) {
        setExportTotalGroups(kebunEntries.length);
        setExportProcessedGroups(0);
      }

      for (let i = 0; i < kebunEntries.length; i++) {
        const [kebunCode, kebunRows] = kebunEntries[i];

        if (!kebunTargets) {
          setExportCurrentKebun(kebunCode);
          setExportProcessedGroups(i);
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        if (i > 0) {
          doc.addPage("landscape");
        }

        const kebunLabel = KEBUN_LABEL[kebunCode] ?? kebunCode;
        doc.setFontSize(10);
        doc.text(
          `Rencana Pemupukan - Kebun ${kebunLabel} (${kebunCode})`,
          14,
          18
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
          startY: 24,
          head: [TABLE_HEADERS as unknown as string[]],
          body,
          styles: { fontSize: 6 },
          headStyles: { fillColor: [226, 232, 240] },
          margin: { left: 10, right: 10 },
        });
      }

      if (!kebunTargets) setExportProcessedGroups(kebunEntries.length);

      // cek batas 1 MB
      const MAX_BYTES = 1024 * 1024;
      const blob = doc.output("blob") as Blob;

      if (blob.size > MAX_BYTES) {
        const sizeKb = (blob.size / 1024).toFixed(0);
        await Swal.fire({
          title: "File terlalu besar",
          html: `
            Ukuran file PDF hasil export adalah <b>${sizeKb} KB</b>, melebihi batas 1 MB.<br/>
            Gunakan filter (tahun, kebun, tanggal, kategori, dll) terlebih dahulu<br/>
            atau gunakan export Excel bila butuh seluruh data lengkap.
          `,
          icon: "warning",
          confirmButtonText: "OK",
        });
        return;
      }

      doc.save("Rencana_Pemupukan_Semua_Kebun.pdf");
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

      const effectiveKategori = kategori !== "all" ? kategori : "";
      const effectiveTahun = !dateFrom && !dateTo && dataYear ? dataYear : "";

      const kebunRows = await fetchRencanaForExport({
        kebun: selectedKebun,
        kategori: effectiveKategori || undefined,
        tahun: effectiveTahun || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: q || undefined,
        distrik: distrik !== "all" ? distrik : undefined,
        afd: afd !== "all" ? afd : undefined,
        tt: tt !== "all" ? tt : undefined,
        blok: blok !== "all" ? blok : undefined,
        jenis: jenis !== "all" ? jenis : undefined,
        aplikasi: aplikasi !== "all" ? aplikasi : undefined,
      });

      if (kebunRows.length === 0) {
        await Swal.fire({
          title: "Tidak ada data",
          text: "Tidak ada data rencana untuk kebun yang dipilih.",
          icon: "info",
          confirmButtonText: "OK",
        });
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 0));

      const jsPDFmod = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDFmod.jsPDF("landscape", "pt", "a4", true);

      const kebunLabel = KEBUN_LABEL[selectedKebun] ?? selectedKebun;
      doc.setFontSize(10);
      doc.text(
        `Rencana Pemupukan - Kebun ${kebunLabel} (${selectedKebun})`,
        14,
        18
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
        startY: 24,
        head: [TABLE_HEADERS as unknown as string[]],
        body,
        styles: { fontSize: 6 },
        headStyles: { fillColor: [226, 232, 240] },
        margin: { left: 10, right: 10 },
      });

      setExportProcessedGroups(1);

      // cek batas 1 MB
      const MAX_BYTES = 1024 * 1024;
      const blob = doc.output("blob") as Blob;

      if (blob.size > MAX_BYTES) {
        const sizeKb = (blob.size / 1024).toFixed(0);
        await Swal.fire({
          title: "File terlalu besar",
          html: `
            Ukuran file PDF hasil export adalah <b>${sizeKb} KB</b>, melebihi batas 1 MB.<br/>
            Coba perkecil rentang data (filter tahun, tanggal, kategori, dsb)
            sebelum melakukan export PDF per kebun.
          `,
          icon: "warning",
          confirmButtonText: "OK",
        });
        return;
      }

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
          title="Riwayat Rencana"
          desc="Daftar input rencana terbaru dari database"
        />

        <Card className="glass-card border border-white/20 dark:border-white/10 shadow-lg">
          <CardHeader className="pb-2 glass-header flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-[13px]">
                Pencarian, Aksi, &amp; Export
              </CardTitle>
              <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                Filter data, hapus, atau export riwayat rencana ke Excel/PDF.
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
                  placeholder="Cari kategori / kebun / AFD / blok / jenis pupuk / tanggal…"
                  className="h-9 glass-input text-[11px]"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={selectedKebun}
                  onValueChange={(v) => setSelectedKebun(v)}
                  disabled={loading || exporting}
                >
                  <SelectTrigger className="h-9 w-[220px] glass-input text-[11px]">
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
                  disabled={!selectedKebun || loading || total === 0 || exporting}
                  className="px-3 py-1.5 rounded-md text-[11px] bg-white/30 backdrop-blur-md border border-white/20 shadow-sm hover:bg-red-50/80 text-red-700 disabled:opacity-50"
                >
                  Hapus per Kebun
                </button>
              </div>
            </div>

            {/* Tabel + virtual scroll */}
            <div
              ref={scrollParentRef}
              className="overflow-x-auto glass-panel rounded-xl max-h-[520px] border border-white/10"
            >
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 z-10 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md text-slate-800 dark:text-slate-100 border-b border-white/10">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-xs tracking-wide">
                      Tanggal
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs tracking-wide">
                      Kategori
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs tracking-wide">
                      Kebun
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs tracking-wide">
                      Kode Kebun
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs tracking-wide">
                      AFD
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs tracking-wide">
                      TT
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs tracking-wide">
                      Blok
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-xs tracking-wide">
                      Luas (Ha)
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-xs tracking-wide">
                      INV
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs tracking-wide">
                      Jenis Pupuk
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-xs tracking-wide">
                      Aplikasi
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-xs tracking-wide">
                      Dosis (Kg/pokok)
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-xs tracking-wide">
                      Kg Pupuk
                    </th>
                    <th className="px-3 py-2 text-center font-semibold text-xs tracking-wide">
                      Aksi
                    </th>
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
                        key={r.id}
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

                  {!loading && pageRows.length === 0 && (
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
                {total === 0 ? (
                  <>Menampilkan 0 data</>
                ) : (
                  <>
                    Menampilkan {showingFrom}–{showingTo} dari total {total} data
                    {selectedKebun && (
                      <> &nbsp; | filter kebun: {selectedKebun}</>
                    )}
                  </>
                )}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || total === 0}
                  className="px-2 py-1 rounded-md border border-white/20 bg-white/20 backdrop-blur-md text-[11px] disabled:opacity-40 hover:bg-white/40 dark:hover:bg-white/10"
                >
                  Sebelumnya
                </button>
                <span className="text-[11px]">
                  Halaman {total === 0 ? 0 : currentPage} dari{" "}
                  {total === 0 ? 0 : totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || total === 0}
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
