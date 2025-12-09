// src/app/pemupukan/_services/pemupukanDashboard.ts
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { KategoriTanaman } from "@prisma/client";
import { unstable_cache } from "next/cache";

import { ORDER_DTM, ORDER_DBR } from "../_config/constants";
import type { TmRow } from "@/app/pemupukan/_components/dashboard/visualisasi/Visualisasi";

import {
  type FilterOptions,
  type SearchParams,
  buildFiltersFromSearchParams,
  resolvePeriodFromSearchParams,
} from "./pemupukanFilters";

/* ===================[ Helper: ambil MIN–MAX tanggal realisasi ]=================== */

async function getRealisasiRange(): Promise<{ start: Date; end: Date }> {
  const [minRow, maxRow] = await Promise.all([
    prisma.realisasiPemupukan.findFirst({
      orderBy: { tanggal: "asc" },
      select: { tanggal: true },
    }),
    prisma.realisasiPemupukan.findFirst({
      orderBy: { tanggal: "desc" },
      select: { tanggal: true },
    }),
  ]);

  const today = new Date();
  const today0 = new Date(today);
  today0.setHours(0, 0, 0, 0);

  if (!minRow?.tanggal || !maxRow?.tanggal) {
    return { start: today0, end: today0 };
  }

  const start = new Date(minRow.tanggal);
  const end = new Date(maxRow.tanggal);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return { start, end };
}

/* ===================[ Helper kecil: mapping kategori string → enum ]=================== */

function resolveKategoriEnum(
  filters: FilterOptions,
  kategori?: KategoriTanaman
): KategoriTanaman | undefined {
  if (kategori) return kategori;

  if (!filters.kategori || filters.kategori === "all") {
    return undefined;
  }

  switch (filters.kategori) {
    case "TM":
      return KategoriTanaman.TM;
    case "TBM":
      return KategoriTanaman.TBM;
    case "BIBITAN":
      return KategoriTanaman.BIBITAN;
    default:
      return undefined;
  }
}

/* ===================[ Filter → Where Prisma ]=================== */

/**
 * buildRencanaWhere:
 * - Where untuk tabel RencanaPemupukan
 */
function buildRencanaWhere(
  filters: FilterOptions,
  kategori?: KategoriTanaman
): Prisma.RencanaPemupukanWhereInput {
  const where: Prisma.RencanaPemupukanWhereInput = {};

  // ====== KATEGORI (TM / TBM / BIBITAN) ======
  const kategoriEnum = resolveKategoriEnum(filters, kategori);
  if (kategoriEnum) {
    where.kategori = kategoriEnum;
  }

  // ====== DISTRIK (DTM / DBR) → batasi kebun kalau kebun belum spesifik ======
  if (filters.distrik && filters.distrik !== "all" && !filters.kebun) {
    const allowed =
      filters.distrik === "DTM"
        ? ORDER_DTM
        : filters.distrik === "DBR"
        ? ORDER_DBR
        : undefined;

    if (allowed && allowed.length > 0) {
      where.kebun = { in: allowed };
    }
  }

  // ====== FILTER SPASIAL DETAIL ======
  if (filters.kebun) {
    where.kebun = filters.kebun;
  }
  if (filters.afd) {
    where.afd = filters.afd;
  }
  if (filters.tt) {
    where.tt = filters.tt;
  }
  if (filters.blok) {
    where.blok = filters.blok;
  }
  if (filters.jenis) {
    where.jenisPupuk = filters.jenis;
  }

  // ====== FILTER APLIKASI KE ======
  if (filters.aplikasi && filters.aplikasi !== "all") {
    const appNum = Number(filters.aplikasi);
    if (Number.isFinite(appNum)) {
      where.aplikasiKe = appNum;
    }
  }

  // ====== TAHUN DATA (dari ?year=YYYY) ======
  if (filters.year) {
    const yearNum = Number(filters.year);
    if (Number.isFinite(yearNum)) {
      const start = new Date(yearNum, 0, 1); // 1 Jan yearNum
      const end = new Date(yearNum + 1, 0, 1); // 1 Jan tahun berikutnya (exclusive)

      const dateFilter: Prisma.DateTimeNullableFilter = {
        gte: start,
        lt: end,
      };

      if (where.tanggal && typeof where.tanggal === "object") {
        // kalau suatu saat nanti ada filter tanggal lain, merge
        where.tanggal = {
          ...(where.tanggal as Prisma.DateTimeNullableFilter),
          ...dateFilter,
        };
      } else {
        where.tanggal = dateFilter;
      }
    }
  }

  return where;
}

function buildRealisasiWhere(
  filters: FilterOptions,
  kategori?: KategoriTanaman
): Prisma.RealisasiPemupukanWhereInput {
  const where: Prisma.RealisasiPemupukanWhereInput = {};

  // ====== KATEGORI ======
  const kategoriEnum = resolveKategoriEnum(filters, kategori);
  if (kategoriEnum) {
    where.kategori = kategoriEnum;
  }

  // ====== DISTRIK (DTM / DBR) → batasi kebun kalau kebun belum spesifik ======
  if (filters.distrik && filters.distrik !== "all" && !filters.kebun) {
    const allowed =
      filters.distrik === "DTM"
        ? ORDER_DTM
        : filters.distrik === "DBR"
        ? ORDER_DBR
        : undefined;

    if (allowed && allowed.length > 0) {
      where.kebun = { in: allowed };
    }
  }

  // ====== FILTER SPASIAL DETAIL ======
  if (filters.kebun) {
    where.kebun = filters.kebun;
  }
  if (filters.afd) {
    where.afd = filters.afd;
  }
  if (filters.tt) {
    where.tt = filters.tt;
  }
  if (filters.blok) {
    where.blok = filters.blok;
  }
  if (filters.jenis) {
    where.jenisPupuk = filters.jenis;
  }

  // ====== FILTER APLIKASI KE ======
  if (filters.aplikasi && filters.aplikasi !== "all") {
    const appNum = Number(filters.aplikasi);
    if (Number.isFinite(appNum)) {
      where.aplikasiKe = appNum;
    }
  }

  // ====== TAHUN DATA (dari ?year=YYYY) ======
  if (filters.year) {
    const yearNum = Number(filters.year);
    if (Number.isFinite(yearNum)) {
      const start = new Date(yearNum, 0, 1); // 1 Jan yearNum
      const end = new Date(yearNum + 1, 0, 1); // 1 Jan tahun berikutnya

      const dateFilter: Prisma.DateTimeNullableFilter = {
        gte: start,
        lt: end,
      };

      if (where.tanggal && typeof where.tanggal === "object") {
        where.tanggal = {
          ...(where.tanggal as Prisma.DateTimeNullableFilter),
          ...dateFilter,
        };
      } else {
        where.tanggal = dateFilter;
      }
    }
  }

  return where;
}

/* ===================[ Helper tanggal ]=================== */

// Awal hari di zona waktu Jakarta
function startOfDayJakarta(date: Date): Date {
  const zoned = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  );
  zoned.setHours(0, 0, 0, 0);
  return zoned;
}

function nextDay(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d;
}

/* ===================[ TM/TBM rows dari DB ]=================== */

async function buildTmRowsFromDb(
  kategori: KategoriTanaman,
  today: Date,
  period: { start: Date; end: Date },
  usePeriodForRealisasi: boolean,
  filters: FilterOptions
): Promise<TmRow[]> {
  // Normalisasi hari ini & besok dalam WIB
  const todayJakarta = startOfDayJakarta(today);
  const tomorrowJakarta = nextDay(startOfDayJakarta(today));

  // ====== WHERE dasar (tanpa tanggal) ======
  const baseRencanaWhere = buildRencanaWhere(filters, kategori);
  const baseRealisasiWhere = buildRealisasiWhere(filters, kategori);

  // ====== WHERE realisasi utama (bisa pakai period) ======
  const realisasiMainWhere: Prisma.RealisasiPemupukanWhereInput = {
    ...baseRealisasiWhere,
  };

  if (usePeriodForRealisasi) {
    // batasi realisasi oleh date range user
    realisasiMainWhere.tanggal = {
      gte: period.start,
      lte: period.end,
    };
  }

  // ====== Query agregasi di DB (bukan di JS) ======
  const [
    // rencana total per kebun x aplikasi
    renPerKebunApp,
    // rencana hari ini (semua aplikasi)
    renToday,
    // rencana besok (semua aplikasi)
    renTomorrow,
    // realisasi total per kebun x aplikasi (bisa dibatasi periode)
    realPerKebunApp,
    // realisasi hari ini (semua aplikasi)
    realToday,
  ] = await Promise.all([
    prisma.rencanaPemupukan.groupBy({
      by: ["kebun", "aplikasiKe"],
      _sum: { kgPupuk: true },
      where: baseRencanaWhere,
    }),
    prisma.rencanaPemupukan.groupBy({
      by: ["kebun"],
      _sum: { kgPupuk: true },
      where: {
        ...baseRencanaWhere,
        tanggal: {
          gte: todayJakarta,
          lt: tomorrowJakarta,
        },
      },
    }),
    prisma.rencanaPemupukan.groupBy({
      by: ["kebun"],
      _sum: { kgPupuk: true },
      where: {
        ...baseRencanaWhere,
        tanggal: {
          gte: tomorrowJakarta,
          lt: nextDay(tomorrowJakarta),
        },
      },
    }),
    prisma.realisasiPemupukan.groupBy({
      by: ["kebun", "aplikasiKe"],
      _sum: { kgPupuk: true },
      where: realisasiMainWhere,
    }),
    prisma.realisasiPemupukan.groupBy({
      by: ["kebun"],
      _sum: { kgPupuk: true },
      where: {
        ...baseRealisasiWhere,
        tanggal: {
          gte: todayJakarta,
          lt: tomorrowJakarta,
        },
      },
    }),
  ]);

  // ====== Bangun map untuk akses cepat di JS ======
  type AppMap = { [app: number]: number };

  const renMap = new Map<string, AppMap>();
  const realMap = new Map<string, AppMap>();
  const renTodayMap = new Map<string, number>();
  const renTomorrowMap = new Map<string, number>();
  const realTodayMap = new Map<string, number>();

  // rencana per kebun x aplikasi
  for (const row of renPerKebunApp) {
    const kebun = row.kebun;
    const app = row.aplikasiKe ?? 0;
    if (!app) continue; // kita hanya peduli aplikasi 1–3

    const mapForKebun = renMap.get(kebun) ?? { 1: 0, 2: 0, 3: 0 };
    if (app === 1 || app === 2 || app === 3) {
      mapForKebun[app] += Number(row._sum?.kgPupuk ?? 0);
    }
    renMap.set(kebun, mapForKebun);
  }

  // realisasi per kebun x aplikasi
  for (const row of realPerKebunApp) {
    const kebun = row.kebun;
    const app = row.aplikasiKe ?? 0;
    if (!app) continue;

    const mapForKebun = realMap.get(kebun) ?? { 1: 0, 2: 0, 3: 0 };
    if (app === 1 || app === 2 || app === 3) {
      mapForKebun[app] += Number(row._sum?.kgPupuk ?? 0);
    }
    realMap.set(kebun, mapForKebun);
  }

  // rencana hari ini per kebun
  for (const row of renToday) {
    renTodayMap.set(row.kebun, Number(row._sum?.kgPupuk ?? 0));
  }

  // rencana besok per kebun
  for (const row of renTomorrow) {
    renTomorrowMap.set(row.kebun, Number(row._sum?.kgPupuk ?? 0));
  }

  // realisasi hari ini per kebun
  for (const row of realToday) {
    realTodayMap.set(row.kebun, Number(row._sum?.kgPupuk ?? 0));
  }

  // ====== Kumpulan semua kebun yang muncul di salah satu agregat ======
  const kebunSet = new Set<string>();
  for (const k of renMap.keys()) kebunSet.add(k);
  for (const k of realMap.keys()) kebunSet.add(k);
  for (const k of renTodayMap.keys()) kebunSet.add(k);
  for (const k of renTomorrowMap.keys()) kebunSet.add(k);
  for (const k of realTodayMap.keys()) kebunSet.add(k);

  // ====== Bentuk TmRow (output final) ======
  const rows: TmRow[] = [];
  let idx = 0;

  for (const kebun of kebunSet) {
    idx += 1;

    const renApps = renMap.get(kebun) ?? { 1: 0, 2: 0, 3: 0 };
    const realApps = realMap.get(kebun) ?? { 1: 0, 2: 0, 3: 0 };

    const app1_rencana = renApps[1] ?? 0;
    const app2_rencana = renApps[2] ?? 0;
    const app3_rencana = renApps[3] ?? 0;

    const app1_real = realApps[1] ?? 0;
    const app2_real = realApps[2] ?? 0;
    const app3_real = realApps[3] ?? 0;

    const app1_pct = app1_rencana > 0 ? (app1_real / app1_rencana) * 100 : 0;
    const app2_pct = app2_rencana > 0 ? (app2_real / app2_rencana) * 100 : 0;
    const app3_pct = app3_rencana > 0 ? (app3_real / app3_rencana) * 100 : 0;

    const renc_sekarang = renTodayMap.get(kebun) ?? 0;
    const real_sekarang = realTodayMap.get(kebun) ?? 0;
    const renc_besok = renTomorrowMap.get(kebun) ?? 0;

    const jumlah_rencana2025 =
      app1_rencana + app2_rencana + app3_rencana;

    const jumlah_realSd0710 = app1_real + app2_real + app3_real;

    const jumlah_pct =
      jumlah_rencana2025 > 0
        ? (jumlah_realSd0710 / jumlah_rencana2025) * 100
        : 0;

    rows.push({
      no: idx,
      kebun,
      app1_rencana,
      app1_real,
      app1_pct,
      app2_rencana,
      app2_real,
      app2_pct,
      app3_rencana,
      app3_real,
      app3_pct,
      renc_sekarang,
      real_sekarang,
      renc_besok,
      jumlah_rencana2025,
      jumlah_realSd0710,
      jumlah_pct,
    });
  }

  return rows;
}

/* ===================[ Agg untuk Ikhtisar & Pie ]=================== */

async function getTotals(
  filters: FilterOptions,
  period: { start: Date; end: Date },
  usePeriodForRealisasi: boolean
) {
  const cat = KategoriTanaman;

  const sumKg = async (model: "REN" | "REAL", kategori?: KategoriTanaman) => {
    if (model === "REN") {
      const where = buildRencanaWhere(filters, kategori);
      // Rencana tidak dibatasi periode tanggal (sama seperti tabel)
      const agg = await prisma.rencanaPemupukan.aggregate({
        _sum: { kgPupuk: true },
        where,
      });
      return agg._sum?.kgPupuk ?? 0;
    } else {
      const where = buildRealisasiWhere(filters, kategori);

      // Realisasi bisa dibatasi oleh periode date range user
      if (usePeriodForRealisasi) {
        const dateFilter: Prisma.DateTimeNullableFilter = {
          gte: period.start,
          lte: period.end,
        };

        if (where.tanggal && typeof where.tanggal === "object") {
          where.tanggal = {
            ...(where.tanggal as Prisma.DateTimeNullableFilter),
            ...dateFilter,
          };
        } else {
          where.tanggal = dateFilter;
        }
      }

      const agg = await prisma.realisasiPemupukan.aggregate({
        _sum: { kgPupuk: true },
        where,
      });
      return agg._sum?.kgPupuk ?? 0;
    }
  };

  // total semua kategori
  const [totalRencana, totalRealisasi] = await Promise.all([
    sumKg("REN"),
    sumKg("REAL"),
  ]);

  // per kategori TM / TBM / BIBITAN
  const [
    tmRencana,
    tmRealisasi,
    tbmRencana,
    tbmRealisasi,
    bibRencana,
    bibRealisasi,
  ] = await Promise.all([
    sumKg("REN", cat.TM),
    sumKg("REAL", cat.TM),
    sumKg("REN", cat.TBM),
    sumKg("REAL", cat.TBM),
    sumKg("REN", cat.BIBITAN),
    sumKg("REAL", cat.BIBITAN),
  ]);

  // =================== DTM / DBR ===================
  let dtmRencana = 0;
  let dbrRencana = 0;
  let dtmRealisasi = 0;
  let dbrRealisasi = 0;

  // Jika user sudah pilih kebun spesifik:
  if (filters.kebun) {
    const keb = filters.kebun;
    const isDTM = ORDER_DTM.includes(keb);
    const isDBR = ORDER_DBR.includes(keb);

    if (isDTM) {
      dtmRencana = totalRencana;
      dtmRealisasi = totalRealisasi;
    } else if (isDBR) {
      dbrRencana = totalRencana;
      dbrRealisasi = totalRealisasi;
    }
  } else {
    // Tidak ada kebun spesifik → pecah semua data ke DTM vs DBR
    const baseFiltersNoKebunNoDistrik: FilterOptions = {
      ...filters,
      kebun: undefined,
      distrik: undefined, // supaya tidak mengunci ke salah satu distrik
    };

    const dtmRenWhere = buildRencanaWhere(baseFiltersNoKebunNoDistrik);
    const dbrRenWhere = buildRencanaWhere(baseFiltersNoKebunNoDistrik);
    const dtmRealWhere = buildRealisasiWhere(baseFiltersNoKebunNoDistrik);
    const dbrRealWhere = buildRealisasiWhere(baseFiltersNoKebunNoDistrik);

    dtmRenWhere.kebun = { in: ORDER_DTM };
    dbrRenWhere.kebun = { in: ORDER_DBR };
    dtmRealWhere.kebun = { in: ORDER_DTM };
    dbrRealWhere.kebun = { in: ORDER_DBR };

    // batasi tanggal realisasi per distrik jika user pakai date range
    if (usePeriodForRealisasi) {
      const dateFilter: Prisma.DateTimeNullableFilter = {
        gte: period.start,
        lte: period.end,
      };

      if (dtmRealWhere.tanggal && typeof dtmRealWhere.tanggal === "object") {
        dtmRealWhere.tanggal = {
          ...(dtmRealWhere.tanggal as Prisma.DateTimeNullableFilter),
          ...dateFilter,
        };
      } else {
        dtmRealWhere.tanggal = dateFilter;
      }

      if (dbrRealWhere.tanggal && typeof dbrRealWhere.tanggal === "object") {
        dbrRealWhere.tanggal = {
          ...(dbrRealWhere.tanggal as Prisma.DateTimeNullableFilter),
          ...dateFilter,
        };
      } else {
        dbrRealWhere.tanggal = dateFilter;
      }
    }

    const [dtmAggRen, dbrAggRen, dtmAggReal, dbrAggReal] = await Promise.all([
      prisma.rencanaPemupukan.aggregate({
        _sum: { kgPupuk: true },
        where: dtmRenWhere,
      }),
      prisma.rencanaPemupukan.aggregate({
        _sum: { kgPupuk: true },
        where: dbrRenWhere,
      }),
      prisma.realisasiPemupukan.aggregate({
        _sum: { kgPupuk: true },
        where: dtmRealWhere,
      }),
      prisma.realisasiPemupukan.aggregate({
        _sum: { kgPupuk: true },
        where: dbrRealWhere,
      }),
    ]);

    dtmRencana = dtmAggRen._sum?.kgPupuk ?? 0;
    dbrRencana = dbrAggRen._sum?.kgPupuk ?? 0;
    dtmRealisasi = dtmAggReal._sum?.kgPupuk ?? 0;
    dbrRealisasi = dbrAggReal._sum?.kgPupuk ?? 0;

    // Kalau user pilih distrik=DTM/DBR di FilterPanel, nol-kan distrik lain
    if (filters.distrik === "DTM") {
      dbrRencana = 0;
      dbrRealisasi = 0;
    } else if (filters.distrik === "DBR") {
      dtmRencana = 0;
      dtmRealisasi = 0;
    }
  }

  return {
    totalRencana,
    totalRealisasi,
    tmRencana,
    tmRealisasi,
    tbmRencana,
    tbmRealisasi,
    bibRencana,
    bibRealisasi,
    dtmRencana,
    dbrRencana,
    dtmRealisasi,
    dbrRealisasi,
  };
}

async function getAggPupuk(
  filters: FilterOptions,
  period: { start: Date; end: Date },
  usePeriodForRealisasi: boolean
) {
  const whereRen = buildRencanaWhere(filters);
  const whereReal = buildRealisasiWhere(filters);

  // Realisasi bisa dibatasi date range (kalau user pakai filter tanggal)
  if (usePeriodForRealisasi) {
    const dateFilter: Prisma.DateTimeNullableFilter = {
      gte: period.start,
      lte: period.end,
    };

    if (whereReal.tanggal && typeof whereReal.tanggal === "object") {
      whereReal.tanggal = {
        ...(whereReal.tanggal as Prisma.DateTimeNullableFilter),
        ...dateFilter,
      };
    } else {
      whereReal.tanggal = dateFilter;
    }
  }

  // Agg rencana per jenis (tanpa batas tanggal, seperti sebelumnya)
  const ren = await prisma.rencanaPemupukan.groupBy({
    by: ["jenisPupuk"],
    _sum: { kgPupuk: true },
    where: whereRen,
  });

  // Agg realisasi per jenis (mungkin sudah dibatasi tanggal)
  const real = await prisma.realisasiPemupukan.groupBy({
    by: ["jenisPupuk"],
    _sum: { kgPupuk: true },
    where: whereReal,
  });

  const map = new Map<string, { rencana: number; realisasi: number }>();

  // masukkan rencana
  for (const r of ren) {
    map.set(r.jenisPupuk, {
      rencana: Number(r._sum?.kgPupuk ?? 0),
      realisasi: 0,
    });
  }

  // masukkan realisasi
  for (const r of real) {
    const prev = map.get(r.jenisPupuk) ?? { rencana: 0, realisasi: 0 };
    prev.realisasi = Number(r._sum?.kgPupuk ?? 0);
    map.set(r.jenisPupuk, prev);
  }

  const rows = Array.from(map.entries())
    .map(([jenis, v]) => ({
      jenis,
      rencana: v.rencana,
      realisasi: v.realisasi,
    }))
    .sort((a, b) => a.jenis.localeCompare(b.jenis));

  return rows.map((r) => ({
    jenis: r.jenis,
    rencana: r.rencana,
    realisasi: r.realisasi,
    rencana_ha: 0,
    realisasi_ha: 0,
    progress:
      r.rencana && r.rencana > 0 ? (r.realisasi / r.rencana) * 100 : 0,
  }));
}

/* ===================[ CACHED WRAPPERS ]=================== */

const getRealisasiRangeCached = unstable_cache(
  async () => {
    return getRealisasiRange();
  },
  ["pemupukan:getRealisasiRange"],
  {
    revalidate: 300,
  }
);

const buildTmRowsFromDbCached = unstable_cache(
  async (
    kategori: KategoriTanaman,
    today: Date,
    period: { start: Date; end: Date },
    usePeriodForRealisasi: boolean,
    filters: FilterOptions
  ) => {
    return buildTmRowsFromDb(
      kategori,
      today,
      period,
      usePeriodForRealisasi,
      filters
    );
  },
  ["pemupukan:buildTmRowsFromDb"],
  {
    revalidate: 300,
  }
);

const getTotalsCached = unstable_cache(
  async (
    filters: FilterOptions,
    period: { start: Date; end: Date },
    usePeriodForRealisasi: boolean
  ) => {
    return getTotals(filters, period, usePeriodForRealisasi);
  },
  ["pemupukan:getTotals"],
  {
    revalidate: 300,
  }
);

const getAggPupukCached = unstable_cache(
  async (
    filters: FilterOptions,
    period: { start: Date; end: Date },
    usePeriodForRealisasi: boolean
  ) => {
    return getAggPupuk(filters, period, usePeriodForRealisasi);
  },
  ["pemupukan:getAggPupuk"],
  {
    revalidate: 300,
  }
);

/* ===================[ FUNGSI UTAMA UNTUK PAGE ]=================== */

export type DashboardData = {
  tmRows: TmRow[];
  tbmRows: TmRow[];
  tmTbmRows: TmRow[];

  totals: {
    totalRencana: number;
    totalRealisasi: number;
    tmRencana: number;
    tmRealisasi: number;
    tbmRencana: number;
    tbmRealisasi: number;
    bibRencana: number;
    bibRealisasi: number;
    dtmRencana: number;
    dbrRencana: number;
    dtmRealisasi: number;
    dbrRealisasi: number;
  };

  aggPupuk: {
    jenis: string;
    rencana: number;
    realisasi: number;
    rencana_ha: number;
    realisasi_ha: number;
    progress: number;
  }[];

  headerDates: { today: string };
  realWindow: { start: string; end: string };
  realCutoffDate: string;
  hasUserDateFilter: boolean;
};

/**
 * Fungsi yang akan dipanggil dari PemupukanDashboardPage.tsx
 * menggantikan isi PemupukanClient sebelumnya.
 */
export async function getDashboardData(
  searchParams?: SearchParams
): Promise<DashboardData> {
  const today = new Date();
  const today0 = new Date(today);
  today0.setHours(0, 0, 0, 0);

  const realRange = await getRealisasiRangeCached();

  const {
    period,
    hasUserDateFilter,
    headerDates,
    realWindow,
    realCutoffDate,
  } = resolvePeriodFromSearchParams(realRange, searchParams);

  const filters = buildFiltersFromSearchParams(searchParams);

  const [tmRows, tbmRows, totals, aggPupuk] = await Promise.all([
    buildTmRowsFromDbCached(
      KategoriTanaman.TM,
      today0,
      period,
      hasUserDateFilter,
      filters
    ),
    buildTmRowsFromDbCached(
      KategoriTanaman.TBM,
      today0,
      period,
      hasUserDateFilter,
      filters
    ),
    getTotalsCached(filters, period, hasUserDateFilter),
    getAggPupukCached(filters, period, hasUserDateFilter),
  ]);

  const tmTbmRows: TmRow[] = [...tmRows, ...tbmRows];

  return {
    tmRows,
    tbmRows,
    tmTbmRows,
    totals,
    aggPupuk,
    headerDates,
    realWindow,
    realCutoffDate,
    hasUserDateFilter,
  };
}
