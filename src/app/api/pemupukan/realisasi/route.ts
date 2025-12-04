// src/app/api/pemupukan/realisasi/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, KategoriTanaman } from "@prisma/client";
import { parseTanggalIsoJakarta } from "@/app/pemupukan/dateHelpers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import { unstable_cache, revalidateTag } from "next/cache";

const MAX_ROWS_PER_UPLOAD = 10000;

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
  if (!session) return null;
  return session;
}

/* ======================================================================= */
/*                        GET HELPER + SERVER CACHE                        */
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

async function getRealisasiDataImpl(params: GetParams) {
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
    const data = await prisma.realisasiPemupukan.findMany({
      orderBy: [{ tanggal: "asc" }, { kebun: "asc" }, { afd: "asc" }],
    });

    return data;
  }

  // MODE BARU: dengan pagination & filter
  const page = Math.max(parseInt(pageParam || "1", 10) || 1, 1);
  const rawPageSize = parseInt(pageSizeParam || "200", 10) || 200;
  const pageSize = Math.min(Math.max(rawPageSize, 10), 1000);

  const where: Prisma.RealisasiPemupukanWhereInput = {};

  if (kebunParam) {
    where.kebun = kebunParam;
  }

  if (kategoriParam) {
    where.kategori = kategoriParam as KategoriTanaman;
  }

  // Filter tanggal: kalau ada dateFrom/dateTo → pakai itu;
  // kalau tidak ada tapi ada "tahun" → pakai range 1 Jan s/d 1 Jan tahun berikutnya.
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
      end.setDate(end.getDate() + 1); // lt hari berikutnya → inclusive
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
    prisma.realisasiPemupukan.findMany({
      where,
      // Untuk riwayat biasanya lebih enak terbaru dulu
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
    revalidate: 300, // cache 5 menit
    tags: ["pemupukan:realisasi"],
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

    const hasAdvancedParams =
      pageParam ||
      pageSizeParam ||
      kebunParam ||
      kategoriParam ||
      tahunParam ||
      dateFromParam ||
      dateToParam ||
      searchTerm;

    const params: GetParams = {
      pageParam,
      pageSizeParam,
      kebunParam,
      kategoriParam,
      tahunParam,
      dateFromParam,
      dateToParam,
      searchTerm,
      hasAdvancedParams: Boolean(hasAdvancedParams),
    };

    const result = await getRealisasiDataCached(params);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control":
          "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
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

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as
      | IncomingRealisasiRow
      | IncomingRealisasiRow[];

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
      return NextResponse.json(
        { message: "Tidak ada data valid untuk disimpan." },
        { status: 400 }
      );
    }

    // === REPLACE LOGIC: hapus dulu data lama dengan key yang sama ===
    const keyConditions: Prisma.RealisasiPemupukanWhereInput[] = normalized.map(
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
      prisma.realisasiPemupukan.deleteMany({
        where: { OR: keyConditions },
      }),
      prisma.realisasiPemupukan.createMany({
        data: normalized,
      }),
    ]);

    // Invalidate cache terkait realisasi + meta + log aktivitas
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
    return NextResponse.json(
      { message: "Gagal menyimpan realisasi pemupukan." },
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
      return NextResponse.json(
        { message: mapped.error },
        { status: 400 }
      );
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
      const body = (await req
        .json()
        .catch(() => null)) as { id?: number } | null;
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
