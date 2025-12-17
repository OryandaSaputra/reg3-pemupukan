// src/server/modules/curah-hujan/curahHujan.service.ts
import { KEBUN_LABEL } from "@/app/pemupukan/_config/constants";
import type { RainSource } from "./curahHujan.schemas";
import { parseDateOnlyFromExcelDatetime, safeNumber, round2 } from "./curahHujan.excel";
import * as repo from "./curahHujan.repository";

export async function importRows(params: {
  kebunCode: string;
  sumber: RainSource;
  rows: { Datetime?: unknown; Rainfall?: unknown }[];
  maxRows: number;
}) {
  const { kebunCode, sumber, rows, maxRows } = params;

  if (rows.length > maxRows) {
    return {
      ok: false as const,
      status: 413,
      message: `Maksimal ${maxRows} baris per import. Silakan pecah file jika lebih besar.`,
    };
  }

  // agregasi per hari
  const bucket = new Map<string, { tanggal: Date; totalMm: number }>();
  let invalidRows = 0;

  for (const row of rows) {
    const tanggal = parseDateOnlyFromExcelDatetime(row.Datetime);
    if (!tanggal) {
      invalidRows++;
      continue;
    }

    const rain = safeNumber(row.Rainfall, NaN);
    if (!Number.isFinite(rain) || rain < 0) {
      invalidRows++;
      continue;
    }

    const key = tanggal.toISOString().slice(0, 10); // YYYY-MM-DD
    const existing = bucket.get(key);
    if (!existing) bucket.set(key, { tanggal, totalMm: 0 });

    bucket.get(key)!.totalMm += rain;
  }

  const aggregated = Array.from(bucket.values());
  const days = Array.from(bucket.keys()).sort();

  if (!aggregated.length) {
    return {
      ok: true as const,
      status: 201,
      message: `Data curah hujan (${sumber}) berhasil di-import & diakumulasikan per hari.`,
      countDays: days.length,
      days,
      invalidRows,
    };
  }

  const kebunName = KEBUN_LABEL[kebunCode] ?? kebunCode;

  const upsertRows = aggregated.map((it) => ({
    kebunCode,
    kebunName,
    tanggal: it.tanggal,
    sumber,
    totalMm: it.totalMm,
  }));

  await repo.bulkUpsertDaily(upsertRows);

  return {
    ok: true as const,
    status: 201,
    message: `Data curah hujan (${sumber}) berhasil di-import & diakumulasikan per hari.`,
    countDays: days.length,
    days,
    invalidRows,
  };

}

export async function getSummary(params: {
  dailyDate: Date;
  startDate: Date;
  endDate: Date;
  sumber: RainSource;
}) {
  const { dailyDate, startDate, endDate, sumber } = params;

  const [dailyRows, rangeAgg] = await Promise.all([
    repo.getDailyRowsByDate(dailyDate, sumber),
    repo.getRangeAgg(startDate, endDate, sumber),
  ]);

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

  // range
  for (const row of rangeAgg) {
    const mtd = row._sum.totalMm ?? 0;
    map.set(row.kebunCode, {
      kebunCode: row.kebunCode,
      kebunName: row.kebunName,
      tanggal: dailyDate,
      dailyMm: 0,
      mtdMm: mtd,
    });
  }

  // daily
  for (const row of dailyRows) {
    const existing = map.get(row.kebunCode);
    if (existing) {
      existing.dailyMm = row.totalMm;
    } else {
      map.set(row.kebunCode, {
        kebunCode: row.kebunCode,
        kebunName: row.kebunName,
        tanggal: dailyDate,
        dailyMm: row.totalMm,
        mtdMm: row.totalMm,
      });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => a.kebunCode.localeCompare(b.kebunCode))
    .map((it) => ({
      kebunCode: it.kebunCode,
      kebunName: it.kebunName,
      tanggal: it.tanggal,
      dailyMm: round2(it.dailyMm),
      mtdMm: round2(it.mtdMm),
    }));
}

export async function getMonthlyRecap(params: {
  year: number;
  kebunCode?: string;
  sumber: RainSource;
}) {
  const { year, kebunCode, sumber } = params;

  const rows = await repo.getMonthlyRecap({
    year,
    sumber,
    kebunCode,
  });

  // Frontend sudah bikin label Jan–Des, jadi backend cukup kirim month + angka
  return rows.map((r) => ({
    month: r.month,
    totalMm: round2(r.totalMm),
    rainyDays: Number(r.rainyDays ?? 0),
  }));
}

export async function listDates(kebunCode: string, sumber: RainSource) {
  return repo.listDates(kebunCode, sumber);
}

export async function upsertDaily(params: {
  kebunCode: string;
  date: Date;
  sumber: RainSource;
  totalMm: number;
}) {
  const kebunName = KEBUN_LABEL[params.kebunCode] ?? params.kebunCode;
  await repo.upsertOne(
    params.kebunCode,
    kebunName,
    params.date,
    params.sumber,
    params.totalMm
  );
}

export async function updateDailyStrict(params: {
  kebunCode: string;
  date: Date;
  sumber: RainSource;
  totalMm: number;
}) {
  const kebunName = KEBUN_LABEL[params.kebunCode] ?? params.kebunCode;
  // Jika tidak ada data -> repo.updateOneStrict akan throw (P2025)
  await repo.updateOneStrict(
    params.kebunCode,
    kebunName,
    params.date,
    params.sumber,
    params.totalMm
  );
}

export async function deleteAll(params: { kebunCode: string; sumber?: RainSource }) {
  await repo.deleteAll(params.kebunCode, params.sumber);
}

export async function deleteByDate(params: { kebunCode: string; date: Date; sumber?: RainSource }) {
  await repo.deleteByDate(params.kebunCode, params.date, params.sumber);
}
