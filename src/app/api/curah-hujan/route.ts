// src/app/api/curah-hujan/route.ts
"use server";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import { KEBUN_LABEL } from "@/app/pemupukan/_config/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prismaAny = prisma as any; // bypass typing PrismaClient khusus untuk model baru
const MAX_ROWS_PER_UPLOAD = 500;

type IncomingRainRow = {
  Datetime?: string | null;
  Rainfall?: string | number | null;
};

type IncomingPayload = {
  kebunCode: string;
  rows: IncomingRainRow[];
};

/**
 * Parse string "dd-MM-yyyy HH:mm" → Date UTC di jam 00:00
 * lalu kita pakai hanya tanggalnya (harian).
 */
function parseDateOnlyFromExcelDatetime(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Format: 10-12-2025 13:20
  const [datePart] = trimmed.split(" ");
  const [ddStr, mmStr, yyyyStr] = datePart.split("-");
  const day = Number(ddStr);
  const month = Number(mmStr);
  const year = Number(yyyyStr);

  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return null;
  }

  // Simpan sebagai UTC 00:00 supaya konsisten
  const dt = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

/**
 * Convert apapun ke number aman, fallback 0.
 */
function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/* ======================================================================= */
/*                                  POST                                   */
/*  Body JSON: { kebunCode: "TME", rows: [{ Datetime, Rainfall }, ...] }   */
/* ======================================================================= */

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as IncomingPayload;

    const kebunCode = (body.kebunCode ?? "").toString().trim();
    if (!kebunCode) {
      return NextResponse.json(
        { message: "Kode kebun wajib dipilih." },
        { status: 400 }
      );
    }

    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!rows.length) {
      return NextResponse.json(
        { message: "Tidak ada baris data yang dikirim." },
        { status: 400 }
      );
    }

    if (rows.length > MAX_ROWS_PER_UPLOAD) {
      return NextResponse.json(
        {
          message: `Maksimal ${MAX_ROWS_PER_UPLOAD} baris per import. Silakan pecah file jika lebih besar.`,
        },
        { status: 413 }
      );
    }

    // Group by tanggal (harian) → totalMm per hari
    const bucket = new Map<
      string,
      {
        tanggal: Date;
        totalMm: number;
      }
    >();

    for (const row of rows) {
      const dtRaw = (row.Datetime ?? "").toString();
      if (!dtRaw.trim()) continue;

      const tanggal = parseDateOnlyFromExcelDatetime(dtRaw);
      if (!tanggal) continue;

      const rain = safeNumber(row.Rainfall, 0);
      if (rain <= 0) continue; // abaikan nol / invalid

      const key = tanggal.toISOString(); // unik per hari
      const existing = bucket.get(key);
      if (existing) {
        existing.totalMm += rain;
      } else {
        bucket.set(key, { tanggal, totalMm: rain });
      }
    }

    const aggregated = Array.from(bucket.values());
    if (!aggregated.length) {
      return NextResponse.json(
        {
          message:
            "Tidak ada baris valid setelah diproses. Pastikan kolom 'Datetime' dan 'Rainfall' terisi benar.",
        },
        { status: 400 }
      );
    }

    const kebunName = KEBUN_LABEL[kebunCode] ?? kebunCode;

    // Upsert per (kebunCode, tanggal)
    await Promise.all(
      aggregated.map((item) =>
        prismaAny.curahHujanHarian.upsert({
          where: {
            kebunCode_tanggal: {
              kebunCode,
              tanggal: item.tanggal,
            },
          },
          create: {
            kebunCode,
            kebunName,
            tanggal: item.tanggal,
            totalMm: item.totalMm,
          },
          update: {
            kebunName,
            totalMm: item.totalMm,
          },
        })
      )
    );

    return NextResponse.json(
      {
        message: "Data curah hujan berhasil di-import & diakumulasikan per hari.",
        count: aggregated.length,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/curah-hujan error", err);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat import curah hujan." },
      { status: 500 }
    );
  }
}

/**
 * Pembulatan aman ke 2 angka di belakang koma.
 */
function round2(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}


/* ======================================================================= */
/*                                   GET                                   */
/* GET /api/curah-hujan?dailyDate=2025-12-10&start=2025-12-01&end=2025-12-10*/
/*   → per kebun:                                                          */
/*      - dailyMm = curah hujan di dailyDate                               */
/*      - mtdMm   = total start s/d end                                    */
/* ======================================================================= */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode");

    // ==================[ MODE: LIST DATES PER KEBUN ]==================
    if (mode === "listDates") {
      const kebunCode = (url.searchParams.get("kebunCode") ?? "").trim();
      if (!kebunCode) {
        return NextResponse.json(
          { message: "kebunCode wajib diisi untuk mode=listDates." },
          { status: 400 },
        );
      }

      const rows = (await prismaAny.curahHujanHarian.findMany({
        where: { kebunCode },
        select: { tanggal: true },
        orderBy: { tanggal: "desc" },
      })) as { tanggal: Date }[];

      const dates = rows.map((r) => r.tanggal.toISOString().slice(0, 10));
      const uniqueDates = Array.from(new Set(dates));

      return NextResponse.json(uniqueDates);
    }

    // ==================[ MODE NORMAL: dailyDate + range ]==================
    const dailyParam =
      url.searchParams.get("dailyDate") ?? url.searchParams.get("date");
    const startParam = url.searchParams.get("start");
    const endParam = url.searchParams.get("end");

    if (!dailyParam || !startParam || !endParam) {
      return NextResponse.json(
        {
          message:
            "Parameter dailyDate, start, dan end wajib diisi. Format: ?dailyDate=YYYY-MM-DD&start=YYYY-MM-DD&end=YYYY-MM-DD",
        },
        { status: 400 },
      );
    }

    const [dYearStr, dMonthStr, dDayStr] = dailyParam.split("-");
    const dYear = Number(dYearStr);
    const dMonth = Number(dMonthStr);
    const dDay = Number(dDayStr);

    const [sYearStr, sMonthStr, sDayStr] = startParam.split("-");
    const sYear = Number(sYearStr);
    const sMonth = Number(sMonthStr);
    const sDay = Number(sDayStr);

    const [eYearStr, eMonthStr, eDayStr] = endParam.split("-");
    const eYear = Number(eYearStr);
    const eMonth = Number(eMonthStr);
    const eDay = Number(eDayStr);

    if (
      !Number.isFinite(dYear) ||
      !Number.isFinite(dMonth) ||
      !Number.isFinite(dDay) ||
      !Number.isFinite(sYear) ||
      !Number.isFinite(sMonth) ||
      !Number.isFinite(sDay) ||
      !Number.isFinite(eYear) ||
      !Number.isFinite(eMonth) ||
      !Number.isFinite(eDay)
    ) {
      return NextResponse.json(
        { message: "Format tanggal tidak valid. Pakai YYYY-MM-DD." },
        { status: 400 },
      );
    }

    // Tanggal harian (UTC 00:00)
    const dailyDate = new Date(
      Date.UTC(dYear, dMonth - 1, dDay, 0, 0, 0, 0),
    );

    // Range total (UTC 00:00)
    const startDate = new Date(
      Date.UTC(sYear, sMonth - 1, sDay, 0, 0, 0, 0),
    );
    const endDate = new Date(
      Date.UTC(eYear, eMonth - 1, eDay, 0, 0, 0, 0),
    );

    if (startDate > endDate) {
      return NextResponse.json(
        { message: "start tidak boleh lebih besar dari end." },
        { status: 400 },
      );
    }

    // 1) Data harian tepat di dailyDate
    const dailyRows = (await prismaAny.curahHujanHarian.findMany({
      where: {
        tanggal: dailyDate,
      },
      orderBy: {
        kebunCode: "asc",
      },
    })) as {
      kebunCode: string;
      kebunName: string;
      tanggal: Date;
      totalMm: number;
    }[];

    // 2) Akumulasi total di range start–end
    const monthlyAgg = (await prismaAny.curahHujanHarian.groupBy({
      by: ["kebunCode", "kebunName"],
      where: {
        tanggal: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        totalMm: true,
      },
    })) as {
      kebunCode: string;
      kebunName: string;
      _sum: { totalMm: number | null };
    }[];

    const map = new Map<
      string,
      {
        kebunCode: string;
        kebunName: string;
        tanggal: Date;
        dailyMm: number;
        mtdMm: number;
      }
    >();

    // Isi dari agregat total range
    for (const row of monthlyAgg) {
      const key = row.kebunCode;
      const mtd = row._sum.totalMm ?? 0;
      map.set(key, {
        kebunCode: row.kebunCode,
        kebunName: row.kebunName,
        tanggal: dailyDate,
        dailyMm: 0,
        mtdMm: mtd,
      });
    }

    // Tambahkan/overwrite nilai harian
    for (const row of dailyRows) {
      const key = row.kebunCode;
      const existing = map.get(key);
      if (existing) {
        existing.dailyMm = row.totalMm;
      } else {
        // Jika tidak ada agregat range (hanya punya data di hari itu saja)
        map.set(key, {
          kebunCode: row.kebunCode,
          kebunName: row.kebunName,
          tanggal: dailyDate,
          dailyMm: row.totalMm,
          mtdMm: row.totalMm,
        });
      }
    }

    // Konversi ke array + sort by kebunCode
    const items = Array.from(map.values()).sort((a, b) =>
      a.kebunCode.localeCompare(b.kebunCode),
    );

    return NextResponse.json(
      items.map((it) => ({
        kebunCode: it.kebunCode,
        kebunName: it.kebunName,
        tanggal: it.tanggal,
        dailyMm: round2(it.dailyMm), // ⬅ dibulatkan 2 digit
        mtdMm: round2(it.mtdMm),     // ⬅ dibulatkan 2 digit
      })),
    );
  } catch (err) {
    console.error("GET /api/curah-hujan error", err);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data curah hujan." },
      { status: 500 },
    );
  }
}

/* ======================================================================= */
/*                                   PUT                                   */
/* Edit curah hujan harian per (kebunCode, date)                           */
/* Body: { kebunCode: string, date: "YYYY-MM-DD", totalMm: number }        */
/* ======================================================================= */

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      kebunCode?: string;
      date?: string;
      totalMm?: number;
    };

    const kebunCode = (body.kebunCode ?? "").toString().trim();
    const dateParam = (body.date ?? "").toString().trim();
    const totalMm = Number(body.totalMm);

    if (!kebunCode || !dateParam) {
      return NextResponse.json(
        { message: "kebunCode dan date wajib diisi." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(totalMm) || totalMm < 0) {
      return NextResponse.json(
        { message: "totalMm harus berupa angka >= 0." },
        { status: 400 }
      );
    }

    const [yearStr, monthStr, dayStr] = dateParam.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return NextResponse.json(
        { message: "Format date tidak valid. Pakai YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const tanggal = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const kebunName = KEBUN_LABEL[kebunCode] ?? kebunCode;

    await prismaAny.curahHujanHarian.upsert({
      where: {
        kebunCode_tanggal: {
          kebunCode,
          tanggal,
        },
      },
      create: {
        kebunCode,
        kebunName,
        tanggal,
        totalMm,
      },
      update: {
        kebunName,
        totalMm,
      },
    });

    return NextResponse.json({
      message: "Berhasil mengubah curah hujan harian.",
      kebunCode,
      date: dateParam,
      totalMm,
    });
  } catch (err) {
    console.error("PUT /api/curah-hujan error", err);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengubah data curah hujan." },
      { status: 500 }
    );
  }
}

/* ======================================================================= */
/*                                  DELETE                                 */
/* Hapus data harian per (kebunCode, date)                                 */
/* Body: { kebunCode: string, date: "YYYY-MM-DD" }                         */
/* ======================================================================= */

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      kebunCode?: string;
      date?: string;
      deleteAll?: boolean;
    };

    const kebunCode = (body.kebunCode ?? "").toString().trim();
    const dateParam = (body.date ?? "").toString().trim();
    const deleteAll = body.deleteAll === true;

    if (!kebunCode) {
      return NextResponse.json(
        { message: "kebunCode wajib diisi." },
        { status: 400 },
      );
    }

    // =========== MODE 1: HAPUS SEMUA DATA KEBUN ===========
    if (deleteAll) {
      await prismaAny.curahHujanHarian.deleteMany({
        where: {
          kebunCode,
        },
      });

      return NextResponse.json({
        message: `Berhasil menghapus seluruh data curah hujan untuk kebun ${kebunCode}.`,
        kebunCode,
        mode: "all",
      });
    }

    // =========== MODE 2: HAPUS PER TANGGAL ===========
    if (!dateParam) {
      return NextResponse.json(
        {
          message:
            "Untuk hapus per tanggal, kebunCode dan date wajib diisi. Untuk hapus semua, kirim deleteAll: true.",
        },
        { status: 400 },
      );
    }

    const [yearStr, monthStr, dayStr] = dateParam.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);

    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day)
    ) {
      return NextResponse.json(
        { message: "Format date tidak valid. Pakai YYYY-MM-DD." },
        { status: 400 },
      );
    }

    const tanggal = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    await prismaAny.curahHujanHarian.deleteMany({
      where: {
        kebunCode,
        tanggal,
      },
    });

    return NextResponse.json({
      message: "Berhasil menghapus data curah hujan harian.",
      kebunCode,
      date: dateParam,
      mode: "per-date",
    });
  } catch (err) {
    console.error("DELETE /api/curah-hujan error", err);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus data curah hujan." },
      { status: 500 },
    );
  }
}
