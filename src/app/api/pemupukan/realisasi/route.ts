// src/app/api/pemupukan/realisasi/route.ts
'use server';

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma, KategoriTanaman } from "@prisma/client";
import { parseTanggalIsoJakarta } from "@/app/pemupukan/_services/dateHelpers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import { unstable_cache, revalidateTag } from "next/cache";
import { ORDER_DTM, ORDER_DBR } from "@/app/pemupukan/_config/constants";
// ✅ TAMBAHKAN IMPORT INI
import * as XLSX from "xlsx";

const MAX_ROWS_PER_UPLOAD = 10_000;

const DEFAULT_PAGE_SIZE = 200;
const MAX_PAGE_SIZE = 500;

const REALISASI_LIST_SELECT = {
  id: true,
  kategori: true,
  kebun: true,
  kodeKebun: true,
  tanggal: true,
  afd: true,
  tt: true,
  blok: true,
  luasHa: true,
  inv: true,
  jenisPupuk: true,
  aplikasiKe: true,
  dosisKgPerPokok: true,
  kgPupuk: true,
  createdAt: true,
} as const satisfies Prisma.RealisasiPemupukanSelect;

/**
 * Helper aman untuk string
 */
function safeString(value: unknown, fallback: string = "-"): string {
  const s = String(value ?? "").trim();
  return s === "" ? fallback : s;
}

/**
 * Helper aman untuk number
 */
function safeNumber(value: unknown, fallback: number = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Parse tanggal "YYYY-MM-DD" menjadi Date (awal hari, lokal mesin)
 */
function parseDateOnly(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Tipe input dari client / Excel untuk realisasi (sesuai payload frontend)
 */
export interface IncomingRealisasiRow {
  kategori?: string;
  kebun?: string | number | null;
  kode_kebun?: string | number | null;
  tanggal?: string | number | Date | null;
  afd?: string | number | null;
  tt?: string | number | null;
  blok?: string | number | null;
  luas?: string | number | null;
  inv?: string | number | null;
  jenis_pupuk?: string | number | null;
  aplikasi?: string | number | null;
  dosis?: string | number | null;
  kg_pupuk?: string | number | null;
}

/**
 * Tipe data setelah dinormalisasi → sesuai Prisma.RealisasiPemupukanCreateManyInput
 */
export interface NormalizedRealisasiRow {
  kategori: KategoriTanaman;
  kebun: string;
  kodeKebun: string;
  tanggal: Date | null;
  afd: string;
  tt: string;
  blok: string;
  luasHa: number;
  inv: number;
  jenisPupuk: string;
  aplikasiKe: number;
  dosisKgPerPokok: number;
  kgPupuk: number;
}

/**
 * Mapping inbound row → Normalized row (camelCase untuk Prisma)
 */
function mapIncomingRow(
  row: IncomingRealisasiRow
): { ok: true; data: NormalizedRealisasiRow } | { ok: false; error: string } {
  const kategoriRaw = (row.kategori ?? "").toString().trim().toUpperCase();
  let kategori: KategoriTanaman;
  if (kategoriRaw === "TM" || kategoriRaw === "TBM" || kategoriRaw === "BIBITAN") {
    kategori = kategoriRaw as KategoriTanaman;
  } else {
    return { ok: false, error: `Kategori tidak valid: ${row.kategori}` };
  }

  const kebun = safeString(row.kebun);
  const kodeKebun = safeString(row.kode_kebun);
  const afd = safeString(row.afd);
  const tt = safeString(row.tt);
  const blok = safeString(row.blok);
  const jenisPupuk = safeString(row.jenis_pupuk);

  const luasHa = safeNumber(row.luas);
  const inv = safeNumber(row.inv);
  const aplikasiKe = safeNumber(row.aplikasi);
  const dosisKgPerPokok = safeNumber(row.dosis);
  const kgPupuk = safeNumber(row.kg_pupuk);

  const tanggal = parseTanggalIsoJakarta(row.tanggal);

  return {
    ok: true,
    data: {
      kategori,
      kebun,
      kodeKebun,
      tanggal,
      afd,
      tt,
      blok,
      luasHa,
      inv,
      jenisPupuk,
      aplikasiKe,
      dosisKgPerPokok,
      kgPupuk,
    },
  };
}

/* ======================================================================= */
/*                              AUTH HELPER                                */
/* ======================================================================= */

async function requireAuth() {
  const session = await getServerSession(authOptions);
  return session;
}

/* ======================================================================= */
/*                        GET HELPER + SERVER CACHE                        */
/* ======================================================================= */

type GetParams = {
  pageParam: string | null;
  pageSizeParam: string | null;

  // filter global
  distrikParam: string | null;
  kebunParam: string | null;
  kategoriParam: string | null;
  afdParam: string | null;
  ttParam: string | null;
  blokParam: string | null;
  jenisParam: string | null;
  aplikasiParam: string | null;

  // waktu & search
  tahunParam: string | null;
  dateFromParam: string | null;
  dateToParam: string | null;
  searchTerm: string | null;
};

async function getRealisasiDataImpl(params: GetParams) {
  const {
    pageParam,
    pageSizeParam,

    distrikParam,
    kebunParam,
    kategoriParam,
    afdParam,
    ttParam,
    blokParam,
    jenisParam,
    aplikasiParam,

    tahunParam,
    dateFromParam,
    dateToParam,
    searchTerm,
  } = params;

  // WAJIB pagination (hapus mode lama return semua data)
  const page = Math.max(parseInt(pageParam || "1", 10) || 1, 1);

  const rawPageSize =
    parseInt(pageSizeParam || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE;

  const pageSize = Math.min(Math.max(rawPageSize, 10), MAX_PAGE_SIZE);

  const where: Prisma.RealisasiPemupukanWhereInput = {};

  // ===================== FILTER GLOBAL (SERVER-SIDE) =====================

  // 0) distrik -> kebun IN (...)
  if (distrikParam && distrikParam !== "all") {
    const allowed =
      distrikParam === "DTM" ? ORDER_DTM : distrikParam === "DBR" ? ORDER_DBR : [];
    if (allowed.length) {
      where.kebun = { in: allowed };
    }
  }

  // 1) kebun (override distrik bila dipilih)
  if (kebunParam && kebunParam !== "all") {
    where.kebun = kebunParam;
  }

  // 2) kategori
  if (kategoriParam && kategoriParam !== "all") {
    where.kategori = kategoriParam as KategoriTanaman;
  }

  // 3) afd / tt / blok / jenis
  if (afdParam && afdParam !== "all") where.afd = afdParam;
  if (ttParam && ttParam !== "all") where.tt = ttParam;
  if (blokParam && blokParam !== "all") where.blok = blokParam;
  if (jenisParam && jenisParam !== "all") where.jenisPupuk = jenisParam;

  // 4) aplikasi (angka)
  if (aplikasiParam && aplikasiParam !== "all") {
    const n = Number(aplikasiParam);
    if (Number.isFinite(n)) {
      where.aplikasiKe = n;
    }
  }

  // Filter tanggal
  let tanggalFilter: Prisma.DateTimeFilter | undefined;

  const fromDate = parseDateOnly(dateFromParam);
  const toDate = parseDateOnly(dateToParam);

  if (fromDate || toDate) {
    tanggalFilter = {};
    if (fromDate) tanggalFilter.gte = fromDate;
    if (toDate) {
      const end = new Date(toDate);
      end.setDate(end.getDate() + 1);
      tanggalFilter.lt = end;
    }
  } else if (tahunParam) {
    const year = Number(tahunParam);
    if (Number.isFinite(year)) {
      const from = new Date(year, 0, 1);
      const to = new Date(year + 1, 0, 1);
      tanggalFilter = { gte: from, lt: to };
    }
  }

  if (tanggalFilter) where.tanggal = tanggalFilter;

  // Text search sederhana
  if (searchTerm && searchTerm.trim() !== "") {
    const term = searchTerm.trim();
    const termUpper = term.toUpperCase();

    const or: Prisma.RealisasiPemupukanWhereInput[] = [
      { kebun: { contains: term, mode: "insensitive" } },
      { kodeKebun: { contains: term, mode: "insensitive" } },
      { afd: { contains: term, mode: "insensitive" } },
      { tt: { contains: term, mode: "insensitive" } },
      { blok: { contains: term, mode: "insensitive" } },
      { jenisPupuk: { contains: term, mode: "insensitive" } },
    ];

    // ✅ hanya tambahkan kalau benar-benar enum yang valid
    if (termUpper === "TM" || termUpper === "TBM" || termUpper === "BIBITAN") {
      or.push({ kategori: termUpper as KategoriTanaman });
    }

    where.OR = or;
  }

  const skip = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    prisma.realisasiPemupukan.findMany({
      where,
      select: REALISASI_LIST_SELECT, // ✅ hemat payload
      orderBy: [{ tanggal: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.realisasiPemupukan.count({ where }),
  ]);

  return {
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

const getRealisasiDataCached = unstable_cache(
  async (params: GetParams) => {
    return getRealisasiDataImpl(params);
  },
  ["pemupukan:realisasi:get"],
  {
    revalidate: 30, // cache 30 detik
    tags: ["pemupukan:realisasi"],
  }
);

// ✅ TAMBAHKAN HELPER INI (letakkan di bawah helper lain, sebelum GET/POST)
function toNumberLoose(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (v instanceof Date) return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

const normalize = (s: string) =>
  String(s ?? "")
    .normalize("NFKD")
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase();

function findBefore(header: string[], startIdx: number, candidates: string[]): number {
  const candNorm = candidates.map(normalize);
  for (let i = startIdx - 1; i >= 0; i--) {
    if (candNorm.includes(header[i])) return i;
  }
  return -1;
}

function findAfter(header: string[], startIdx: number, candidates: string[]): number {
  const candNorm = candidates.map(normalize);
  for (let i = startIdx + 1; i < header.length; i++) {
    if (candNorm.includes(header[i])) return i;
  }
  return -1;
}

function parseExcelDateToIso(
  value: string | number | Date | null
): string | null {
  if (value === null) return null;

  // sudah Date
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Excel serial number
  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    if (!Number.isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, "0");
      const d = String(date.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  // string → coba parse
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  }

  return null;
}

async function handleImportMultipart(req: Request) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const kategori = String(form.get("kategori") ?? "")
    .trim()
    .toUpperCase();
  const sheetNameParam = String(form.get("sheetName") ?? "").trim();
  const file = form.get("file");

  if (kategori !== "TM" && kategori !== "TBM" && kategori !== "BIBITAN") {
    return NextResponse.json({ message: "Kategori tidak valid." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "File tidak ditemukan." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: false });

  const sheetNames = workbook.SheetNames || [];
  if (!sheetNames.length) {
    return NextResponse.json({ message: "Workbook tidak memiliki sheet." }, { status: 400 });
  }

  // Jika multi-sheet dan client belum memilih → kirim daftar sheet untuk dipilih
  let selectedSheetName = sheetNames[0];
  if (sheetNames.length > 1) {
    if (!sheetNameParam) {
      return NextResponse.json(
        {
          message: "Pilih sheet untuk import.",
          sheetNames,
        },
        { status: 409 }
      );
    }
    if (!sheetNames.includes(sheetNameParam)) {
      return NextResponse.json(
        {
          message: "Sheet tidak ditemukan di workbook.",
          sheetNames,
        },
        { status: 400 }
      );
    }
    selectedSheetName = sheetNameParam;
  }

  const sheet = workbook.Sheets[selectedSheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    defval: "",
  });

  if (!rows.length) {
    return NextResponse.json({ message: "Sheet Excel tidak memiliki data." }, { status: 400 });
  }

  // === CARI HEADER REALISASI (cari kolom TANGGAL/TGL di 20 baris teratas)
  let realHeaderRowIndex = -1;
  let realHeaderNorm: string[] = [];
  let idxTanggal = -1;

  const maxScan = Math.min(rows.length, 20);
  for (let rIdx = 0; rIdx < maxScan; rIdx++) {
    const norm = rows[rIdx].map((h) => normalize(String(h ?? "")));
    const tIndex = norm.findIndex((c) => c === "TANGGAL" || c === "TGL");
    if (tIndex !== -1) {
      realHeaderRowIndex = rIdx;
      realHeaderNorm = norm;
      idxTanggal = tIndex;
      break;
    }
  }

  if (realHeaderRowIndex === -1 || idxTanggal === -1) {
    return NextResponse.json(
      {
        message:
          "Header Realisasi tidak ditemukan. Pastikan ada kolom TANGGAL di tabel Realisasi.",
      },
      { status: 400 }
    );
  }

  // === MAPPING KOLOM RELATIF TANGGAL
  const idxAfd = findBefore(realHeaderNorm, idxTanggal, ["AFD", "AFDELING"]);
  const idxKodeKebun = findBefore(realHeaderNorm, idxAfd, ["KODEKEBUN", "KODE_KEBUN"]);
  const idxKebun = findBefore(realHeaderNorm, idxKodeKebun, ["KEBUN"]);

  const idxTt = findAfter(realHeaderNorm, idxTanggal, ["TT", "TAHUNTANAM"]);
  const idxBlok = findAfter(realHeaderNorm, idxTt, ["BLOK"]);
  const idxLuas = findAfter(realHeaderNorm, idxBlok, ["LUAS", "LUASHA"]);
  const idxInv = findAfter(realHeaderNorm, idxLuas, ["INV", "POKOK", "JUMLAHPOKOK"]);
  const idxJenisPupuk = findAfter(realHeaderNorm, idxInv, ["JENISPUPUK", "PUPUK"]);
  const idxAplikasi = findAfter(realHeaderNorm, idxJenisPupuk, ["APLIKASI", "APLIKASIKE"]);
  const idxDosis = findAfter(realHeaderNorm, idxAplikasi, ["DOSIS", "DOSISKGPOKOK"]);
  const idxKgPupuk = findAfter(realHeaderNorm, idxDosis, ["KGPUKUP", "KGPUPUK", "KGPUPUKTOTAL"]);

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
    return NextResponse.json(
      {
        message:
          "Header Realisasi tidak lengkap. Pastikan ada: KEBUN, KODE KEBUN, AFD, TANGGAL, TT, BLOK, LUAS, INV, JENIS PUPUK, APLIKASI, DOSIS, KG PUPUK",
      },
      { status: 400 }
    );
  }

  // === KUMPULKAN ROWS
  const payloads: IncomingRealisasiRow[] = [];

  let lastKebun = "";
  let lastKodeKebun = "";
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

    const luasCell = row[idxLuas];
    const invCell = row[idxInv];
    const jenisPupukCell = row[idxJenisPupuk];
    const aplikasiCell = row[idxAplikasi];
    const dosisCell = row[idxDosis];
    const kgPupukCell = row[idxKgPupuk];

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

    if (kebunStr) lastKebun = kebunStr;
    else if (lastKebun) kebunStr = lastKebun;

    if (kodeKebunStr) lastKodeKebun = kodeKebunStr;
    else if (lastKodeKebun) kodeKebunStr = lastKodeKebun;

    if (!kebunStr) kebunStr = "-";
    if (!kodeKebunStr) kodeKebunStr = "-";

    const afdStr = String(row[idxAfd] ?? "").trim() || "-";
    const ttStr = String(row[idxTt] ?? "").trim() || "-";
    const blokStr = (String(row[idxBlok] ?? "").trim().toUpperCase() || "-") as string;
    const jenisPupukStr = String(jenisPupukCell ?? "").trim() || "-";

    const invNum = toNumberLoose(invCell);
    const luasNum = toNumberLoose(luasCell);

    let aplikasiNum = toNumberLoose(String(aplikasiCell ?? "").trim());
    let dosisNum = toNumberLoose(String(dosisCell ?? "").trim());
    let kgPupukNum = toNumberLoose(String(kgPupukCell ?? "").trim());

    if (!Number.isFinite(aplikasiNum)) aplikasiNum = 0;
    if (!Number.isFinite(dosisNum)) dosisNum = 0;
    if (!Number.isFinite(kgPupukNum)) kgPupukNum = 0;

    // jika KG pupuk kosong → hitung INV × DOSIS
    if (kgPupukNum === 0 && invNum > 0 && dosisNum > 0) {
      kgPupukNum = invNum * dosisNum;
    }

    // filter baris agar tidak ngisi noise
    const hasRealData =
      String(tanggalRaw ?? "").trim() !== "" ||
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

    const tanggalIso = parseExcelDateToIso(
      typeof tanggalRaw === "string" ||
        typeof tanggalRaw === "number" ||
        tanggalRaw instanceof Date
        ? tanggalRaw
        : null
    );

    payloads.push({
      kategori,
      kebun: kebunStr,
      kode_kebun: kodeKebunStr,
      tanggal: tanggalIso,
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
    return NextResponse.json(
      { message: "Tidak ada baris valid pada tabel Realisasi yang dapat diimport." },
      { status: 400 }
    );
  }

  if (payloads.length > MAX_ROWS_PER_UPLOAD) {
    return NextResponse.json(
      {
        message: `Maksimal ${MAX_ROWS_PER_UPLOAD} baris per upload. Silakan pecah file menjadi beberapa bagian.`,
      },
      { status: 413 }
    );
  }

  // validasi & normalisasi pakai logic yang sama dengan JSON POST
  const normalized: NormalizedRealisasiRow[] = [];
  const errors: string[] = [];

  payloads.forEach((row, idx) => {
    const mapped = mapIncomingRow(row);
    if (!mapped.ok) errors.push(`Row ${idx + 1}: ${mapped.error}`);
    else normalized.push(mapped.data);
  });

  if (errors.length) {
    return NextResponse.json({ message: "Beberapa baris tidak valid.", errors }, { status: 400 });
  }

  // replace logic: delete key yang sama lalu createMany
  const keyConditions: Prisma.RealisasiPemupukanWhereInput[] = normalized.map((row) => ({
    kategori: row.kategori,
    kebun: row.kebun,
    kodeKebun: row.kodeKebun,
    afd: row.afd,
    tt: row.tt,
    blok: row.blok,
    jenisPupuk: row.jenisPupuk,
    aplikasiKe: row.aplikasiKe,
    ...(row.tanggal ? { tanggal: row.tanggal } : {}),
  }));

  const [deleteResult, createResult] = await prisma.$transaction([
    prisma.realisasiPemupukan.deleteMany({ where: { OR: keyConditions } }),
    prisma.realisasiPemupukan.createMany({ data: normalized }),
  ]);

  revalidateTag("pemupukan:realisasi");
  revalidateTag("pemupukan:meta");
  revalidateTag("pemupukan:log-aktivitas");

  return NextResponse.json(
    {
      message: "Import realisasi berhasil (server-side).",
      sheetName: selectedSheetName,
      count: createResult.count,
      deleted: deleteResult.count,
      totalParsed: payloads.length,
    },
    { status: 201 }
  );
}


/* ======================================================================= */
/*                                  GET                                    */
/* ======================================================================= */

// ✅ UBAH BAGIAN GET: tambahkan mode ambil 1 record by ?id=...
export async function GET(req: Request) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const search = url.searchParams;

    // ✅ NEW: GET by ID (untuk halaman edit)
    const idParam = search.get("id");
    if (idParam) {
      const id = Number(idParam);
      if (!Number.isFinite(id) || id <= 0) {
        return NextResponse.json({ message: "ID tidak valid." }, { status: 400 });
      }

      const found = await prisma.realisasiPemupukan.findUnique({
        where: { id },
      });

      if (!found) {
        return NextResponse.json({ message: "Data tidak ditemukan." }, { status: 404 });
      }

      return NextResponse.json(found, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const pageParam = search.get("page");
    const pageSizeParam = search.get("pageSize");

    // filter global
    const distrikParam = search.get("distrik");
    const kebunParam = search.get("kebun");
    const kategoriParam = search.get("kategori");
    const afdParam = search.get("afd");
    const ttParam = search.get("tt");
    const blokParam = search.get("blok");
    const jenisParam = search.get("jenis");
    const aplikasiParam = search.get("aplikasi");

    // waktu & search
    const tahunParam = search.get("tahun");
    const dateFromParam = search.get("dateFrom");
    const dateToParam = search.get("dateTo");
    const searchTerm = search.get("search") || search.get("q");

    const params: GetParams = {
      pageParam,
      pageSizeParam,

      distrikParam,
      kebunParam,
      kategoriParam,
      afdParam,
      ttParam,
      blokParam,
      jenisParam,
      aplikasiParam,

      tahunParam,
      dateFromParam,
      dateToParam,
      searchTerm,
    };

    const result = await getRealisasiDataCached(params);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=30",
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/pemupukan/realisasi error", err);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data realisasi." },
      { status: 500 }
    );
  }
}

/* ======================================================================= */
/*                                  POST                                   */
/* ======================================================================= */

// ✅ UBAH BAGIAN POST: deteksi multipart → proses import server-side
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      return await handleImportMultipart(req);
    }

    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as IncomingRealisasiRow | IncomingRealisasiRow[];

    const rowsArray: IncomingRealisasiRow[] = Array.isArray(body) ? body : [body];

    // Batas jumlah baris per upload
    if (rowsArray.length > MAX_ROWS_PER_UPLOAD) {
      return NextResponse.json(
        {
          message: `Maksimal ${MAX_ROWS_PER_UPLOAD} baris per upload. Silakan pecah file menjadi beberapa bagian.`,
        },
        { status: 413 }
      );
    }

    const normalized: NormalizedRealisasiRow[] = [];
    const errors: string[] = [];

    rowsArray.forEach((row, idx) => {
      const mapped = mapIncomingRow(row);
      if (!mapped.ok) {
        errors.push(`Row ${idx + 1}: ${mapped.error}`);
      } else {
        normalized.push(mapped.data);
      }
    });

    if (errors.length > 0) {
      return NextResponse.json(
        {
          message: "Beberapa baris tidak valid.",
          errors,
        },
        { status: 400 }
      );
    }

    if (!normalized.length) {
      return NextResponse.json({ message: "Tidak ada data valid untuk disimpan." }, { status: 400 });
    }

    const keyConditions: Prisma.RealisasiPemupukanWhereInput[] = normalized.map((row) => ({
      kategori: row.kategori,
      kebun: row.kebun,
      kodeKebun: row.kodeKebun,
      afd: row.afd,
      tt: row.tt,
      blok: row.blok,
      jenisPupuk: row.jenisPupuk,
      aplikasiKe: row.aplikasiKe,
      ...(row.tanggal ? { tanggal: row.tanggal } : {}),
    }));

    const [deleteResult, createResult] = await prisma.$transaction([
      prisma.realisasiPemupukan.deleteMany({ where: { OR: keyConditions } }),
      prisma.realisasiPemupukan.createMany({ data: normalized }),
    ]);

    revalidateTag("pemupukan:realisasi");
    revalidateTag("pemupukan:meta");
    revalidateTag("pemupukan:log-aktivitas");

    return NextResponse.json(
      {
        message: "Data realisasi berhasil disimpan (replace).",
        count: createResult.count,
        deleted: deleteResult.count,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("POST /api/pemupukan/realisasi error", err);
    return NextResponse.json({ message: "Gagal menyimpan realisasi pemupukan." }, { status: 500 });
  }
}

/* ======================================================================= */
/*                                  PUT                                    */
/* ======================================================================= */

export async function PUT(req: Request) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as IncomingRealisasiRow & { id?: number };

    const id = Number(body.id);
    if (!id || id <= 0) {
      return NextResponse.json(
        { message: "ID diperlukan untuk update." },
        { status: 400 }
      );
    }

    const mapped = mapIncomingRow(body);
    if (!mapped.ok) {
      return NextResponse.json({ message: mapped.error }, { status: 400 });
    }

    const updated = await prisma.realisasiPemupukan.update({
      where: { id },
      data: mapped.data as Prisma.RealisasiPemupukanUpdateInput,
    });

    // Invalidate cache terkait realisasi + meta + log aktivitas
    revalidateTag("pemupukan:realisasi");
    revalidateTag("pemupukan:meta");
    revalidateTag("pemupukan:log-aktivitas");

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("PUT /api/pemupukan/realisasi error", err);
    return NextResponse.json(
      { message: "Gagal mengupdate realisasi." },
      { status: 500 }
    );
  }
}

/* ======================================================================= */
/*                                 DELETE                                  */
/* ======================================================================= */

export async function DELETE(req: Request) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const allFlag = searchParams.get("all");
    const kebunParam = searchParams.get("kebun");
    const idParam = searchParams.get("id");

    // 1) Hapus semua data (dipakai di RealisasiRiwayat: handleDeleteAll)
    if (allFlag === "1") {
      const result = await prisma.realisasiPemupukan.deleteMany({});

      revalidateTag("pemupukan:realisasi");
      revalidateTag("pemupukan:meta");
      revalidateTag("pemupukan:log-aktivitas");

      return NextResponse.json(
        {
          message: "Semua data realisasi berhasil dihapus.",
          deletedCount: result.count,
        },
        { status: 200 }
      );
    }

    // 2) Hapus semua data untuk satu kebun (handleDeleteByKebun)
    if (kebunParam) {
      const result = await prisma.realisasiPemupukan.deleteMany({
        where: { kebun: kebunParam },
      });

      revalidateTag("pemupukan:realisasi");
      revalidateTag("pemupukan:meta");
      revalidateTag("pemupukan:log-aktivitas");

      return NextResponse.json(
        {
          message: `Data realisasi untuk kebun ${kebunParam} berhasil dihapus.`,
          deletedCount: result.count,
        },
        { status: 200 }
      );
    }

    // 3) Hapus satu baris berdasarkan ID
    let id: number | null = null;

    // a) Coba dari query string ?id=...
    if (idParam) {
      const parsed = Number(idParam);
      if (Number.isFinite(parsed) && parsed > 0) {
        id = parsed;
      }
    }

    // b) Kalau tidak ada di query, coba baca dari body JSON { id: ... }
    if (!id) {
      const body = (await req.json().catch(() => null)) as { id?: number } | null;
      if (body && body.id != null) {
        const parsed = Number(body.id);
        if (Number.isFinite(parsed) && parsed > 0) {
          id = parsed;
        }
      }
    }

    if (!id) {
      return NextResponse.json(
        { message: "ID diperlukan untuk delete." },
        { status: 400 }
      );
    }

    await prisma.realisasiPemupukan.delete({
      where: { id },
    });

    revalidateTag("pemupukan:realisasi");
    revalidateTag("pemupukan:meta");
    revalidateTag("pemupukan:log-aktivitas");

    return NextResponse.json(
      { message: "Data realisasi berhasil dihapus.", id },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("DELETE /api/pemupukan/realisasi error", err);
    return NextResponse.json(
      { message: "Gagal menghapus data." },
      { status: 500 }
    );
  }
}
