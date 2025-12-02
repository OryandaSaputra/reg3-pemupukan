// src/app/pemupukan/PemupukanClient.tsx
import Ikhtisar from "@/app/pemupukan/sections/Ikhtisar";
import dynamic from "next/dynamic";
import type { TmRow } from "@/app/pemupukan/sections/Visualisasi";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { KategoriTanaman } from "@prisma/client";
import { ORDER_DTM, ORDER_DBR } from "./constants";
import LogAktivitas from "@/app/pemupukan/sections/LogAktivitas";


/** Visualisasi di-split ke chunk terpisah */
const Visualisasi = dynamic(
  () => import("@/app/pemupukan/sections/Visualisasi")
  // opsi { ssr: false } DIHAPUS supaya boleh dipakai di Server Component
);

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

/* ===================[ Build TM/TBM rows dari DB ]=================== */

// Helper format tanggal ke YYYY-MM-DD (WIB)
const fmtYmdJakarta = (d: Date): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d); // "YYYY-MM-DD"

type RowInput = {
  kebun: string;
  aplikasiKe: number;
  kgPupuk: number;
  tanggal: Date | null;
  ymd: string | null; // tanggal dalam format YYYY-MM-DD (WIB)
};

// ====== Helper filter umum untuk query Prisma ======
type FilterOptions = {
  distrik?: string; // "DTM" | "DBR" | "all" | undefined
  kebun?: string;
  kategori?: string; // "TM" | "TBM" | "BIBITAN" | "all" | undefined
  afd?: string;
  tt?: string;
  blok?: string;
  jenis?: string;
  aplikasi?: string; // "1" | "2" | "3" | "all"
};

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
  let kategoriEnum: KategoriTanaman | undefined = kategori;

  if (!kategoriEnum && filters.kategori && filters.kategori !== "all") {
    switch (filters.kategori) {
      case "TM":
        kategoriEnum = KategoriTanaman.TM;
        break;
      case "TBM":
        kategoriEnum = KategoriTanaman.TBM;
        break;
      case "BIBITAN":
        kategoriEnum = KategoriTanaman.BIBITAN;
        break;
      default:
        break;
    }
  }

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

  return where;
}

function buildRealisasiWhere(
  filters: FilterOptions,
  kategori?: KategoriTanaman
): Prisma.RealisasiPemupukanWhereInput {
  const where: Prisma.RealisasiPemupukanWhereInput = {};

  // ====== KATEGORI ======
  let kategoriEnum: KategoriTanaman | undefined = kategori;

  if (!kategoriEnum && filters.kategori && filters.kategori !== "all") {
    switch (filters.kategori) {
      case "TM":
        kategoriEnum = KategoriTanaman.TM;
        break;
      case "TBM":
        kategoriEnum = KategoriTanaman.TBM;
        break;
      case "BIBITAN":
        kategoriEnum = KategoriTanaman.BIBITAN;
        break;
      default:
        break;
    }
  }

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

  return where;
}

/**
 * buildTmRowsFromDb
 */
async function buildTmRowsFromDb(
  kategori: KategoriTanaman,
  today: Date,
  period: { start: Date; end: Date },
  usePeriodForRealisasi: boolean,
  filters: FilterOptions
): Promise<TmRow[]> {
  const { start, end } = period;

  // format periode ke "YYYY-MM-DD" (WIB)
  const periodStartYmd = fmtYmdJakarta(start);
  const periodEndYmd = fmtYmdJakarta(end);

  // "hari ini" & "besok" juga dalam WIB
  const todayYmd = fmtYmdJakarta(today);
  const tomorrowDate = new Date(today);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowYmd = fmtYmdJakarta(tomorrowDate);

  // where global (kebun / afd / tt / blok / jenis / aplikasi) + kategori TM/TBM
  const whereRencana = buildRencanaWhere(filters, kategori);
  const whereRealisasi = buildRealisasiWhere(filters, kategori);

  const [rencana, realisasi] = await Promise.all([
    prisma.rencanaPemupukan.findMany({
      where: whereRencana,
      select: {
        kebun: true,
        aplikasiKe: true,
        kgPupuk: true,
        tanggal: true,
      },
    }),
    prisma.realisasiPemupukan.findMany({
      where: whereRealisasi,
      select: {
        kebun: true,
        aplikasiKe: true,
        kgPupuk: true,
        tanggal: true,
      },
    }),
  ]);

  const rencanaRows: RowInput[] = rencana.map((r) => ({
    kebun: r.kebun,
    aplikasiKe: r.aplikasiKe ?? 0,
    kgPupuk: r.kgPupuk ?? 0,
    tanggal: r.tanggal,
    ymd: r.tanggal ? fmtYmdJakarta(r.tanggal) : null,
  }));

  const realisasiRows: RowInput[] = realisasi.map((r) => ({
    kebun: r.kebun,
    aplikasiKe: r.aplikasiKe ?? 0,
    kgPupuk: r.kgPupuk ?? 0,
    tanggal: r.tanggal,
    ymd: r.tanggal
      ? new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(r.tanggal.getTime() + 7 * 60 * 60 * 1000)) // force shift to WIB
      : null,
  }));


  const kebunSet = new Set<string>();
  rencanaRows.forEach((r) => kebunSet.add(r.kebun));
  realisasiRows.forEach((r) => kebunSet.add(r.kebun));

  const sumKg = (
    rows: RowInput[],
    kebun: string,
    aplikasi: number,
    startYmd?: string,
    endYmd?: string
  ) => {
    return rows.reduce((acc, r) => {
      if (r.kebun !== kebun) return acc;
      if (r.aplikasiKe !== aplikasi) return acc;

      // Jika ada filter tanggal, baris tanpa tanggal di-skip
      if ((startYmd || endYmd) && !r.ymd) return acc;

      // Jika tidak ada filter tanggal → baris tanpa tanggal tetap dihitung
      if (startYmd && r.ymd && r.ymd < startYmd) return acc;
      if (endYmd && r.ymd && r.ymd > endYmd) return acc;

      return acc + Number(r.kgPupuk || 0);
    }, 0);
  };

  const rows: TmRow[] = [];

  [...kebunSet].forEach((kebun, idx) => {
    // =================== RENCANA (selalu total, tidak pakai periode) ===================
    const app1_rencana = sumKg(rencanaRows, kebun, 1);
    const app2_rencana = sumKg(rencanaRows, kebun, 2);
    const app3_rencana = sumKg(rencanaRows, kebun, 3);

    // =================== REALISASI ===================
    const app1_real = usePeriodForRealisasi
      ? sumKg(realisasiRows, kebun, 1, periodStartYmd, periodEndYmd)
      : sumKg(realisasiRows, kebun, 1);

    const app2_real = usePeriodForRealisasi
      ? sumKg(realisasiRows, kebun, 2, periodStartYmd, periodEndYmd)
      : sumKg(realisasiRows, kebun, 2);

    const app3_real = usePeriodForRealisasi
      ? sumKg(realisasiRows, kebun, 3, periodStartYmd, periodEndYmd)
      : sumKg(realisasiRows, kebun, 3);

    const app1_pct = app1_rencana > 0 ? (app1_real / app1_rencana) * 100 : 0;
    const app2_pct = app2_rencana > 0 ? (app2_real / app2_rencana) * 100 : 0;
    const app3_pct = app3_rencana > 0 ? (app3_real / app3_rencana) * 100 : 0;

    const renc_sekarang =
      sumKg(rencanaRows, kebun, 1, todayYmd, todayYmd) +
      sumKg(rencanaRows, kebun, 2, todayYmd, todayYmd) +
      sumKg(rencanaRows, kebun, 3, todayYmd, todayYmd);

    const real_sekarang =
      sumKg(realisasiRows, kebun, 1, todayYmd, todayYmd) +
      sumKg(realisasiRows, kebun, 2, todayYmd, todayYmd) +
      sumKg(realisasiRows, kebun, 3, todayYmd, todayYmd);

    const renc_besok =
      sumKg(rencanaRows, kebun, 1, tomorrowYmd, tomorrowYmd) +
      sumKg(rencanaRows, kebun, 2, tomorrowYmd, tomorrowYmd) +
      sumKg(rencanaRows, kebun, 3, tomorrowYmd, tomorrowYmd);

    const jumlah_rencana2025 = app1_rencana + app2_rencana + app3_rencana;

    const jumlah_realSd0710 = usePeriodForRealisasi
      ? sumKg(realisasiRows, kebun, 1, periodStartYmd, periodEndYmd) +
      sumKg(realisasiRows, kebun, 2, periodStartYmd, periodEndYmd) +
      sumKg(realisasiRows, kebun, 3, periodStartYmd, periodEndYmd)
      : sumKg(realisasiRows, kebun, 1) +
      sumKg(realisasiRows, kebun, 2) +
      sumKg(realisasiRows, kebun, 3);

    const jumlah_pct =
      jumlah_rencana2025 > 0
        ? (jumlah_realSd0710 / jumlah_rencana2025) * 100
        : 0;

    rows.push({
      no: idx + 1,
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
  });

  return rows;
}

/* ===================[ Agg untuk Ikhtisar & Pie ]=================== */

// >>>>> PERUBAHAN DI SINI: tambah parameter period & usePeriodForRealisasi
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
            ...where.tanggal,
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
          ...dtmRealWhere.tanggal,
          ...dateFilter,
        };
      } else {
        dtmRealWhere.tanggal = dateFilter;
      }

      if (dbrRealWhere.tanggal && typeof dbrRealWhere.tanggal === "object") {
        dbrRealWhere.tanggal = {
          ...dbrRealWhere.tanggal,
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

async function getAggPupuk(filters: FilterOptions) {
  const whereRen = buildRencanaWhere(filters);
  const whereReal = buildRealisasiWhere(filters);

  // Agg rencana per jenis
  const ren = await prisma.rencanaPemupukan.groupBy({
    by: ["jenisPupuk"],
    _sum: { kgPupuk: true },
    where: whereRen,
  });

  // Agg realisasi per jenis
  const real = await prisma.realisasiPemupukan.groupBy({
    by: ["jenisPupuk"],
    _sum: { kgPupuk: true },
    where: whereReal,
  });

  const map = new Map<string, { rencana: number; realisasi: number }>();

  ren.forEach((r) => {
    map.set(r.jenisPupuk, {
      rencana: Number(r._sum?.kgPupuk ?? 0),
      realisasi: 0,
    });
  });

  real.forEach((r) => {
    const prev = map.get(r.jenisPupuk) ?? { rencana: 0, realisasi: 0 };
    prev.realisasi = Number(r._sum?.kgPupuk ?? 0);
    map.set(r.jenisPupuk, prev);
  });

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
    progress: r.rencana && r.rencana > 0 ? (r.realisasi / r.rencana) * 100 : 0,
  }));
}

/* ===================[ PAGE-LEVEL CLIENT (dipanggil dari page.tsx) ]=================== */

export type SearchParams = {
  dateFrom?: string;
  dateTo?: string;

  // filter spasial / jenis
  distrik?: string;
  kebun?: string;
  kategori?: string;
  afd?: string;
  tt?: string;
  blok?: string;
  jenis?: string;
  aplikasi?: string; // <- DARI QUERY STRING
};

export default async function PemupukanClient({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const today = new Date();
  const today0 = new Date(today);
  today0.setHours(0, 0, 0, 0);

  const realRange = await getRealisasiRange();

  let periodStart = new Date(realRange.start);
  let periodEnd = new Date(realRange.end);

  const hasUserFilter = Boolean(
    (searchParams?.dateFrom ?? "") || (searchParams?.dateTo ?? "")
  );

  if (searchParams?.dateFrom) {
    const df = new Date(searchParams.dateFrom);
    if (!Number.isNaN(df.getTime())) {
      periodStart = df;
      periodStart.setHours(0, 0, 0, 0);
    }
  }

  if (searchParams?.dateTo) {
    const dt = new Date(searchParams.dateTo);
    if (!Number.isNaN(dt.getTime())) {
      periodEnd = dt;
      periodEnd.setHours(0, 0, 0, 0);
    }
  }

  if (periodStart > periodEnd) {
    const tmp = periodStart;
    periodStart = periodEnd;
    periodEnd = tmp;
  }

  // ====== Filter global yang dibawa dari URL (kecuali tanggal) ======
  const filters: FilterOptions = {
    distrik: searchParams?.distrik,
    kebun: searchParams?.kebun,
    kategori: searchParams?.kategori,
    afd: searchParams?.afd,
    tt: searchParams?.tt,
    blok: searchParams?.blok,
    jenis: searchParams?.jenis,
    aplikasi: searchParams?.aplikasi, // <- PENTING
  };

  const effectivePeriod = { start: periodStart, end: periodEnd };

  const [tmRows, tbmRows, totals, aggPupuk] = await Promise.all([
    buildTmRowsFromDb(
      KategoriTanaman.TM,
      today0,
      effectivePeriod,
      hasUserFilter,
      filters
    ),
    buildTmRowsFromDb(
      KategoriTanaman.TBM,
      today0,
      effectivePeriod,
      hasUserFilter,
      filters
    ),
    // >>>> PEMANGGILAN BARU: pass period & hasUserFilter
    getTotals(filters, effectivePeriod, hasUserFilter),
    getAggPupuk(filters),
  ]);

  const tmTbmRows: TmRow[] = [...tmRows, ...tbmRows];

  const todayISO = today0.toISOString().slice(0, 10);

  const headerDates = {
    today: todayISO,
  };

  const labelStartISO =
    hasUserFilter && searchParams?.dateFrom
      ? searchParams.dateFrom
      : realRange.start.toISOString().slice(0, 10);

  const labelEndISO =
    hasUserFilter && searchParams?.dateTo
      ? searchParams.dateTo
      : realRange.end.toISOString().slice(0, 10);

  const realWindow = {
    start: labelStartISO,
    end: labelEndISO,
  };

  const hasUserDateFilter = hasUserFilter;

  return (
    <>
      <Ikhtisar
        totals={totals}
        realisasiHarian={0}
        rencanaBesok={0}
        tanggalHariIni={headerDates.today}
        tanggalBesok={undefined}
      />
      <Visualisasi
        barPerKebun={[]}
        aggPupuk={aggPupuk}
        stokVsSisa={[]}
        tmRows={tmRows}
        tbmRows={tbmRows}
        tmTbmRows={tmTbmRows}
        headerDates={headerDates}
        realWindow={realWindow}
        realCutoffDate={realWindow.end}
        hasUserFilter={hasUserDateFilter}
      />
      <LogAktivitas />
    </>
  );
}
