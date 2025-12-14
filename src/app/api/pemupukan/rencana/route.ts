// src/app/api/pemupukan/rencana/route.ts
'use server';

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma, KategoriTanaman } from "@prisma/client";
import { parseTanggalIsoJakarta } from "@/app/pemupukan/_services/dateHelpers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import { unstable_cache, revalidateTag } from "next/cache";
import * as XLSX from "xlsx";

const MAX_ROWS_PER_UPLOAD = 10_000;

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
 * Parse tanggal "YYYY-MM-DD" menjadi Date (awal hari)
 */
function parseDateOnly(value: string | null): Date | null {
  if (!value) return null;
  // WIB date-only (00:00 WIB)
  const d = parseTanggalIsoJakarta(value);
  return d ?? null;
}

/**
 * Tipe input dari client / Excel (sesuai payload frontend)
 */
export interface IncomingRencanaRow {
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
 * Tipe data setelah dinormalisasi → sesuai Prisma.RencanaPemupukanCreateManyInput
 */
export interface NormalizedRencanaRow {
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
  row: IncomingRencanaRow
): { ok: true; data: NormalizedRencanaRow } | { ok: false; error: string } {
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

  const tanggal = parseTanggalIsoJakarta(row.tanggal);
  const luasHa = safeNumber(row.luas);
  const inv = safeNumber(row.inv);
  const aplikasiKe = safeNumber(row.aplikasi) || 1;
  const dosisKgPerPokok = safeNumber(row.dosis);
  const kgPupuk = safeNumber(row.kg_pupuk);

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
/*                             GET HELPER + CACHE                          */
/* ======================================================================= */

type GetParams = {
  pageParam: string | null;
  pageSizeParam: string | null;
  kebunParam: string | null;
  kategoriParam: string | null;
  tahunParam: string | null;
  dateFromParam: string | null;
  dateToParam: string | null;
  searchTerm: string | null;
  hasAdvancedParams: boolean;
};

async function getRencanaDataImpl(params: GetParams) {
  const {
    pageParam,
    pageSizeParam,
    kebunParam,
    kategoriParam,
    tahunParam,
    dateFromParam,
    dateToParam,
    searchTerm,
    hasAdvancedParams,
  } = params;

  // MODE LAMA: tanpa query param → kembalikan semua data (backward compatible)
  if (!hasAdvancedParams) {
    const data = await prisma.rencanaPemupukan.findMany({
      orderBy: [{ tanggal: "asc" }, { kebun: "asc" }, { afd: "asc" }],
    });

    return data;
  }

  // MODE BARU: dengan pagination & filter
  const page = Math.max(parseInt(pageParam || "1", 10) || 1, 1);

  const rawPageSize = parseInt(pageSizeParam || "200", 10) || 200;
  // clamp pageSize → minimal 10, maksimal 1000 untuk jaga performa
  const pageSize = Math.min(Math.max(rawPageSize, 10), 1000);

  const where: Prisma.RencanaPemupukanWhereInput = {};

  if (kebunParam) {
    where.kebun = kebunParam;
  }

  if (kategoriParam) {
    where.kategori = kategoriParam as KategoriTanaman;
  }

  // Filter tanggal (dateFrom/dateTo lebih prioritas dari tahun)
  let tanggalFilter: Prisma.DateTimeFilter | undefined;

  const fromDate = parseDateOnly(dateFromParam);
  const toDate = parseDateOnly(dateToParam);

  if (fromDate || toDate) {
    tanggalFilter = {};
    if (fromDate) {
      tanggalFilter.gte = fromDate;
    }
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
      tanggalFilter = {
        gte: from,
        lt: to,
      };
    }
  }

  if (tanggalFilter) {
    where.tanggal = tanggalFilter;
  }

  // Text search sederhana
  if (searchTerm && searchTerm.trim() !== "") {
    const term = searchTerm.trim();
    where.OR = [
      { kebun: { contains: term } },
      { kodeKebun: { contains: term } },
      { afd: { contains: term } },
      { tt: { contains: term } },
      { blok: { contains: term } },
      { jenisPupuk: { contains: term } },
      { kategori: { equals: term.toUpperCase() as KategoriTanaman } },
    ];
  }

  const skip = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    prisma.rencanaPemupukan.findMany({
      where,
      orderBy: [{ tanggal: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.rencanaPemupukan.count({ where }),
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

/**
 * unstable_cache:
 * - arguments (params) otomatis ikut jadi bagian cache key
 * - keyParts "pemupukan:rencana:get" hanya sebagai identitas kelompok
 * - tags dipakai untuk revalidateTag() dari route lain
 */
const getRencanaDataCached = unstable_cache(
  async (params: GetParams) => {
    return getRencanaDataImpl(params);
  },
  ["pemupukan:rencana:get"],
  {
    revalidate: 30, // 30 detik cache
    tags: ["pemupukan:rencana"],
  }
);

/* ======================================================================= */
/*                                  GET                                    */
/* ======================================================================= */

export async function GET(req: Request) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const search = url.searchParams;

    const pageParam = search.get("page");
    const pageSizeParam = search.get("pageSize");
    const kebunParam = search.get("kebun");
    const kategoriParam = search.get("kategori");
    const tahunParam = search.get("tahun");
    const dateFromParam = search.get("dateFrom");
    const dateToParam = search.get("dateTo");
    const searchTerm = search.get("search") || search.get("q");

    const hasAdvancedParams = Boolean(
      pageParam ||
      pageSizeParam ||
      kebunParam ||
      kategoriParam ||
      tahunParam ||
      dateFromParam ||
      dateToParam ||
      searchTerm
    );

    const params: GetParams = {
      pageParam,
      pageSizeParam,
      kebunParam,
      kategoriParam,
      tahunParam,
      dateFromParam,
      dateToParam,
      searchTerm,
      hasAdvancedParams,
    };

    const result = await getRencanaDataCached(params);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control":
          "public, max-age=0, s-maxage=30",
      },
    });
  } catch (err) {
    console.error("GET /api/pemupukan/rencana error", err);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data rencana." },
      { status: 500 }
    );
  }
}

type Cell = string | number | Date | null | undefined;

function toNumberLoose(v: Cell): number {
  if (v === null || v === undefined || v === "") return 0;
  if (v instanceof Date) return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function computeKg(inv: number, dosis: number): number {
  const kg = inv * dosis;
  return Number.isFinite(kg) ? kg : 0;
}

const normalize = (s: string) =>
  String(s ?? "")
    .normalize("NFKD")
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase();

function parseExcelRencanaRows(args: {
  workbook: XLSX.WorkBook;
  kategori: string; // TM/TBM/BIBITAN
  sheetName: string;
}): { rows: IncomingRencanaRow[]; totalParsed: number } | { error: string } {
  const { workbook, kategori, sheetName } = args;

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { error: `Sheet "${sheetName}" tidak ditemukan.` };

  const grid = XLSX.utils.sheet_to_json<Cell[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  if (!grid.length) return { error: "Sheet Excel tidak memiliki data." };

  // Cari header & boundary kolom TANGGAL (jika sheet gabung rencana+realisasi)
  let headerRowIndex = -1;
  let headerNorm: string[] = [];
  let idxTanggalBoundary = -1;

  const maxScan = Math.min(grid.length, 20);

  for (let r = 0; r < maxScan; r++) {
    const norm = (grid[r] ?? []).map((h) => normalize(String(h ?? "")));
    const tIndex = norm.findIndex((c) => c === "TANGGAL" || c === "TGL");
    if (tIndex !== -1) {
      headerRowIndex = r;
      headerNorm = norm;
      idxTanggalBoundary = tIndex;
      break;
    }
  }

  // fallback: cari header rencana walau tidak ada kolom TANGGAL
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
      const norm = (grid[r] ?? []).map((h) => normalize(String(h ?? "")));
      const matchCount = norm.filter((col) => targetHeaders.includes(col)).length;
      if (matchCount >= 4) {
        headerRowIndex = r;
        headerNorm = norm;
        break;
      }
    }
  }

  if (headerRowIndex === -1) {
    return { error: "Header Rencana tidak ditemukan. Pastikan format sheet sesuai." };
  }

  const findIdxLeft = (...candidates: string[]) => {
    const candNorms = candidates.map(normalize);
    const end = idxTanggalBoundary === -1 ? headerNorm.length : idxTanggalBoundary;
    for (let i = 0; i < end; i++) {
      if (candNorms.includes(headerNorm[i])) return i;
    }
    return -1;
  };

  const findIdxFallback = (...candidates: string[]) => {
    const candNorms = candidates.map(normalize);
    return headerNorm.findIndex((col) => candNorms.includes(col));
  };

  const finder = idxTanggalBoundary === -1 ? findIdxFallback : findIdxLeft;

  const idxKebun = finder("KEBUN");
  const idxKodeKebun = finder("KODEKEBUN", "KODE_KEBUN", "KODE KEBUN");
  const idxTanggal = finder("TANGGAL", "TGL"); // opsional
  const idxAfd = finder("AFD", "AFDELING");
  const idxTt = finder("TT", "TAHUNTANAM", "THNTANAM", "TAHUN TANAM");
  const idxBlok = finder("BLOK");
  const idxLuas = finder("LUAS", "LUASHA", "LUAS (HA)");
  const idxInv = finder("INV", "POKOK", "JUMLAHPOKOK", "JUMLAH POKOK");
  const idxJenisPupuk = finder("JENISPUPUK", "JENIS PUPUK", "PUPUK");
  const idxAplikasi = finder("APLIKASI", "APLIKASIKE", "APLIKASI (KE-)");
  const idxDosis = finder("DOSIS", "DOSISKGPOKOK", "DOSIS (KG/POKOK)");
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
    return { error: "Header Rencana tidak lengkap. Pastikan kolom wajib tersedia." };
  }

  const payloads: IncomingRencanaRow[] = [];

  // forward-fill kebun & kode kebun (karena merge)
  let lastKebun = "";
  let lastKodeKebun = "";

  let started = false;
  let emptyAfterData = 0;
  const MAX_EMPTY_AFTER_DATA = 5;

  for (let i = headerRowIndex + 1; i < grid.length; i++) {
    const row = grid[i];
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

    const jenisPupukCell = idxJenisPupuk >= 0 ? row[idxJenisPupuk] : "";
    const aplikasiCell = idxAplikasi >= 0 ? row[idxAplikasi] : "";
    const dosisCell = idxDosis >= 0 ? row[idxDosis] : "";
    const kgPupukCell = idxKgPupuk >= 0 ? row[idxKgPupuk] : "";

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
    const blokStr = (String(row[idxBlok] ?? "").trim().toUpperCase() || "-").toString();
    const jenisPupukStr = String(jenisPupukCell ?? "").trim() || "-";

    const invNum = Math.round(toNumberLoose(invCell));
    const luasNum = toNumberLoose(luasCell);

    const aplikasiNum = Math.round(toNumberLoose(aplikasiCell) || 1);
    const dosisNum = toNumberLoose(dosisCell);
    let kgPupukNum = toNumberLoose(kgPupukCell);

    // kalau KG PUPUK kosong → hitung INV * DOSIS
    if (kgPupukNum === 0 && invNum > 0 && dosisNum > 0) {
      kgPupukNum = computeKg(invNum, dosisNum);
    }

    const hasPlanData =
      (tanggalRaw != null && String(tanggalRaw).trim() !== "") ||
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

    payloads.push({
      kategori,
      kebun: kebunStr,
      kode_kebun: kodeKebunStr,
      // IMPORTANT: jangan diubah ke ISO di server parsing ini,
      // biarkan raw (string/number/Date) → parseTanggalIsoJakarta yang handle WIB
      tanggal: (tanggalRaw as Cell) ?? null,
      afd: afdStr,
      tt: ttStr,
      blok: blokStr,
      luas: luasNum,
      inv: invNum,
      jenis_pupuk: jenisPupukStr,
      aplikasi: aplikasiNum,
      dosis: dosisNum,
      kg_pupuk: kgPupukNum,
    });
  }

  return { rows: payloads, totalParsed: payloads.length };
}

/* ======================================================================= */
/*                                  POST                                   */
/* ======================================================================= */

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";

    // =========================
    // 1) MODE IMPORT EXCEL (multipart/form-data)
    // =========================
    if (contentType.includes("multipart/form-data")) {
      const fd = await req.formData();

      const file = fd.get("file");
      const kategori = String(fd.get("kategori") ?? "")
        .trim()
        .toUpperCase();
      const sheetNameRaw = fd.get("sheetName");
      const sheetName = sheetNameRaw ? String(sheetNameRaw) : "";

      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { message: "File tidak ditemukan pada form-data (field: file)." },
          { status: 400 }
        );
      }

      if (kategori !== "TM" && kategori !== "TBM" && kategori !== "BIBITAN") {
        return NextResponse.json(
          { message: "Kategori tidak valid. Gunakan TM/TBM/BIBITAN." },
          { status: 400 }
        );
      }

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: false });

      const sheetNames = workbook.SheetNames ?? [];
      if (!sheetNames.length) {
        return NextResponse.json(
          { message: "Workbook tidak memiliki sheet." },
          { status: 400 }
        );
      }

      // kalau belum pilih sheet dan sheet > 1 → minta pilih sheet (409)
      if (!sheetName && sheetNames.length > 1) {
        return NextResponse.json(
          {
            message: "Pilih sheet terlebih dahulu.",
            sheetNames,
          },
          { status: 409 }
        );
      }

      const finalSheetName = sheetName || sheetNames[0];

      const parsed = parseExcelRencanaRows({
        workbook,
        kategori,
        sheetName: finalSheetName,
      });

      if ("error" in parsed) {
        return NextResponse.json(
          { message: parsed.error },
          { status: 400 }
        );
      }

      const rowsArray = parsed.rows;

      if (rowsArray.length > MAX_ROWS_PER_UPLOAD) {
        return NextResponse.json(
          {
            message: `Maksimal ${MAX_ROWS_PER_UPLOAD} baris per upload. Silakan pecah file menjadi beberapa bagian.`,
          },
          { status: 413 }
        );
      }

      const normalized: NormalizedRencanaRow[] = [];
      const errors: string[] = [];

      rowsArray.forEach((row, idx) => {
        const mapped = mapIncomingRow(row);
        if (!mapped.ok) {
          errors.push(`Row ${idx + 1}: ${mapped.error}`);
        } else {
          normalized.push(mapped.data);
        }
      });

      if (errors.length) {
        return NextResponse.json(
          { message: "Beberapa baris tidak valid.", errors },
          { status: 400 }
        );
      }

      if (!normalized.length) {
        return NextResponse.json(
          { message: "Tidak ada data valid untuk disimpan." },
          { status: 400 }
        );
      }

      // === REPLACE LOGIC ===
      const keyConditions: Prisma.RencanaPemupukanWhereInput[] = normalized.map(
        (row) => ({
          kategori: row.kategori,
          kebun: row.kebun,
          kodeKebun: row.kodeKebun,
          afd: row.afd,
          tt: row.tt,
          blok: row.blok,
          jenisPupuk: row.jenisPupuk,
          aplikasiKe: row.aplikasiKe,
          ...(row.tanggal ? { tanggal: row.tanggal } : {}),
        })
      );

      const [deleteResult, createResult] = await prisma.$transaction([
        prisma.rencanaPemupukan.deleteMany({ where: { OR: keyConditions } }),
        prisma.rencanaPemupukan.createMany({ data: normalized }),
      ]);

      revalidateTag("pemupukan:rencana");
      revalidateTag("pemupukan:meta");
      revalidateTag("pemupukan:log-aktivitas");

      return NextResponse.json(
        {
          message: "Import rencana berhasil (replace).",
          sheetName: finalSheetName,
          totalParsed: parsed.totalParsed,
          count: createResult.count,
          deleted: deleteResult.count,
        },
        { status: 201 }
      );
    }

    // =========================
    // 2) MODE JSON (manual submit / bulk JSON lama)
    // =========================
    const body = (await req.json()) as IncomingRencanaRow | IncomingRencanaRow[];
    const rowsArray = Array.isArray(body) ? body : [body];

    if (rowsArray.length > MAX_ROWS_PER_UPLOAD) {
      return NextResponse.json(
        {
          message: `Maksimal ${MAX_ROWS_PER_UPLOAD} baris per upload. Silakan pecah file menjadi beberapa bagian.`,
        },
        { status: 413 }
      );
    }

    const normalized: NormalizedRencanaRow[] = [];
    const errors: string[] = [];

    rowsArray.forEach((row, idx) => {
      const mapped = mapIncomingRow(row);
      if (!mapped.ok) {
        errors.push(`Row ${idx + 1}: ${mapped.error}`);
      } else {
        normalized.push(mapped.data);
      }
    });

    if (errors.length) {
      return NextResponse.json(
        { message: "Beberapa baris tidak valid.", errors },
        { status: 400 }
      );
    }

    if (!normalized.length) {
      return NextResponse.json(
        { message: "Tidak ada data valid untuk disimpan." },
        { status: 400 }
      );
    }

    const keyConditions: Prisma.RencanaPemupukanWhereInput[] = normalized.map(
      (row) => ({
        kategori: row.kategori,
        kebun: row.kebun,
        kodeKebun: row.kodeKebun,
        afd: row.afd,
        tt: row.tt,
        blok: row.blok,
        jenisPupuk: row.jenisPupuk,
        aplikasiKe: row.aplikasiKe,
        ...(row.tanggal ? { tanggal: row.tanggal } : {}),
      })
    );

    const [deleteResult, createResult] = await prisma.$transaction([
      prisma.rencanaPemupukan.deleteMany({ where: { OR: keyConditions } }),
      prisma.rencanaPemupukan.createMany({ data: normalized }),
    ]);

    revalidateTag("pemupukan:rencana");
    revalidateTag("pemupukan:meta");
    revalidateTag("pemupukan:log-aktivitas");

    return NextResponse.json(
      {
        message: "Data rencana berhasil disimpan (replace).",
        count: createResult.count,
        deleted: deleteResult.count,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/pemupukan/rencana error", err);
    return NextResponse.json(
      { message: "Gagal menyimpan rencana pemupukan." },
      { status: 500 }
    );
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

    const body = (await req.json()) as IncomingRencanaRow & { id?: number };

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

    const updated = await prisma.rencanaPemupukan.update({
      where: { id },
      data: mapped.data as Prisma.RencanaPemupukanUpdateInput,
    });

    // Invalidate cache terkait rencana + meta + log aktivitas
    revalidateTag("pemupukan:rencana");
    revalidateTag("pemupukan:meta");
    revalidateTag("pemupukan:log-aktivitas");

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/pemupukan/rencana error", err);
    return NextResponse.json(
      { message: "Gagal mengupdate rencana." },
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

    // 1) Hapus semua data (dipakai di RencanaRiwayat: handleDeleteAll)
    if (allFlag === "1") {
      const result = await prisma.rencanaPemupukan.deleteMany({});

      revalidateTag("pemupukan:rencana");
      revalidateTag("pemupukan:meta");
      revalidateTag("pemupukan:log-aktivitas");

      return NextResponse.json(
        {
          message: "Semua data rencana berhasil dihapus.",
          deletedCount: result.count,
        },
        { status: 200 }
      );
    }

    // 2) Hapus semua data untuk satu kebun (handleDeleteByKebun)
    if (kebunParam) {
      const result = await prisma.rencanaPemupukan.deleteMany({
        where: { kebun: kebunParam },
      });

      revalidateTag("pemupukan:rencana");
      revalidateTag("pemupukan:meta");
      revalidateTag("pemupukan:log-aktivitas");

      return NextResponse.json(
        {
          message: `Data rencana untuk kebun ${kebunParam} berhasil dihapus.`,
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

    await prisma.rencanaPemupukan.delete({
      where: { id },
    });

    revalidateTag("pemupukan:rencana");
    revalidateTag("pemupukan:meta");
    revalidateTag("pemupukan:log-aktivitas");

    return NextResponse.json(
      { message: "Data rencana berhasil dihapus.", id },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE /api/pemupukan/rencana error", err);
    return NextResponse.json(
      { message: "Gagal menghapus data." },
      { status: 500 }
    );
  }
}
