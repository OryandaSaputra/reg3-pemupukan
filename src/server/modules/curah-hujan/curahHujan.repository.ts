// src/server/modules/curah-hujan/curahHujan.repository.ts
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { RainSource } from "./curahHujan.schemas";

export type DailyUpsertRow = {
  kebunCode: string;
  kebunName: string;
  tanggal: Date; // UTC date-only
  sumber: RainSource;
  totalMm: number;
};

export async function listDates(kebunCode: string, sumber: RainSource) {
  const rows = await prisma.curahHujanHarian.findMany({
    where: { kebunCode, sumber },
    select: { tanggal: true },
    orderBy: { tanggal: "desc" },
  });

  // tanggal bisa DateTime @db.Date atau timestamp; tetap aman dislice YYYY-MM-DD
  const dates = rows.map((r) => r.tanggal.toISOString().slice(0, 10));
  return Array.from(new Set(dates));
}

export async function getDailyRowsByDate(dailyDate: Date, sumber: RainSource) {
  return prisma.curahHujanHarian.findMany({
    where: { tanggal: dailyDate, sumber },
    orderBy: { kebunCode: "asc" },
  });
}

export async function getRangeAgg(startDate: Date, endDate: Date, sumber: RainSource) {
  return prisma.curahHujanHarian.groupBy({
    by: ["kebunCode", "kebunName"],
    where: {
      tanggal: { gte: startDate, lte: endDate },
      sumber,
    },
    _sum: { totalMm: true },
  });
}

/**
 * Bulk upsert yang cepat:
 * INSERT ... ON CONFLICT (kebunCode, tanggal, sumber) DO UPDATE SET ...
 */
export async function bulkUpsertDaily(rows: DailyUpsertRow[]) {
  if (!rows.length) return 0;

  const BATCH_SIZE = 300;
  let affected = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const values = batch.map((r) =>
      Prisma.sql`(${r.kebunCode}, ${r.tanggal}, ${r.sumber}, ${r.kebunName}, ${r.totalMm}, NOW())`
    );

    const res = await prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "CurahHujanHarian"
          ("kebunCode","tanggal","sumber","kebunName","totalMm","updatedAt")
        VALUES ${Prisma.join(values)}
        ON CONFLICT ("kebunCode","tanggal","sumber")
        DO UPDATE SET
          "kebunName" = EXCLUDED."kebunName",
          "totalMm"   = EXCLUDED."totalMm",
          "updatedAt" = NOW()
      `
    );

    if (typeof res === "number") affected += res;
  }

  return affected;
}

export async function upsertOne(kebunCode: string, kebunName: string, tanggal: Date, sumber: RainSource, totalMm: number) {
  return prisma.curahHujanHarian.upsert({
    where: {
      kebunCode_tanggal_sumber: { kebunCode, tanggal, sumber },
    },
    create: { kebunCode, kebunName, tanggal, sumber, totalMm },
    update: { kebunName, totalMm, sumber },
  });
}

export async function updateOneStrict(
  kebunCode: string,
  kebunName: string,
  tanggal: Date,
  sumber: RainSource,
  totalMm: number
) {
  // jika record tidak ada, Prisma akan throw P2025
  return prisma.curahHujanHarian.update({
    where: {
      kebunCode_tanggal_sumber: { kebunCode, tanggal, sumber },
    },
    data: { kebunName, totalMm, sumber },
  });
}

export async function deleteAll(kebunCode: string, sumber?: RainSource) {
  return prisma.curahHujanHarian.deleteMany({
    where: { kebunCode, ...(sumber ? { sumber } : {}) },
  });
}

export async function deleteByDate(kebunCode: string, tanggal: Date, sumber?: RainSource) {
  return prisma.curahHujanHarian.deleteMany({
    where: { kebunCode, tanggal, ...(sumber ? { sumber } : {}) },
  });
}
