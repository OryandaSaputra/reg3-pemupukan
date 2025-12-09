// src/app/pemupukan/_services/pemupukanFilters.ts

// Query string dari URL (?dateFrom=..., ?kebun=..., dst)
export type SearchParams = {
  dateFrom?: string;
  dateTo?: string;

  // filter tahun data (opsional, dari query ?year=YYYY)
  year?: string;

  // filter spasial / jenis
  distrik?: string;
  kebun?: string;
  kategori?: string;
  afd?: string;
  tt?: string;
  blok?: string;
  jenis?: string;
  aplikasi?: string; // "1" | "2" | "3" | "all"
};

// Filter yang dipakai di layer Prisma
export type FilterOptions = {
  distrik?: string; // "DTM" | "DBR" | "all" | undefined
  kebun?: string;
  kategori?: string; // "TM" | "TBM" | "BIBITAN" | "all" | undefined
  afd?: string;
  tt?: string;
  blok?: string;
  jenis?: string;
  aplikasi?: string; // "1" | "2" | "3" | "all"
  // Tahun data (string tahun, ex: "2023")
  year?: string;
};

export type Period = { start: Date; end: Date };

export type ResolvedPeriodAndLabels = {
  period: Period;
  hasUserDateFilter: boolean;
  headerDates: { today: string };
  realWindow: { start: string; end: string };
  realCutoffDate: string;
};

/**
 * Parse searchParams → FilterOptions (tanpa tanggal).
 * Ini 1:1 dengan blok:
 *
 * const filters: FilterOptions = {
 *   distrik: searchParams?.distrik,
 *   ...
 * }
 */
export function buildFiltersFromSearchParams(
  searchParams?: SearchParams
): FilterOptions {
  return {
    distrik: searchParams?.distrik,
    kebun: searchParams?.kebun,
    kategori: searchParams?.kategori,
    afd: searchParams?.afd,
    tt: searchParams?.tt,
    blok: searchParams?.blok,
    jenis: searchParams?.jenis,
    aplikasi: searchParams?.aplikasi,
    year: searchParams?.year, // ⬅️ tambahan
  };
}

/**
 * Utility: pastikan Date → "YYYY-MM-DD"
 */
function toISODate(value: string | Date): string {
  if (typeof value === "string") {
    // asumsikan sudah "YYYY-MM-DD" atau ISO string
    return value.slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

/**
 * Resolve periode tanggal + label2, 1:1 dengan logic yang dulu di PemupukanClient:
 *
 * - mulai dari realRange.start/end
 * - override dengan searchParams.dateFrom/dateTo kalau valid
 * - swap kalau start > end
 * - bikin labelStartISO/labelEndISO
 * - headerDates.today
 * - realWindow.start/end (string)
 */
export function resolvePeriodFromSearchParams(
  realRange: { start: Date; end: Date },
  searchParams?: SearchParams
): ResolvedPeriodAndLabels {
  const today = new Date();
  const today0 = new Date(today);
  today0.setHours(0, 0, 0, 0);

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

  const effectivePeriod: Period = { start: periodStart, end: periodEnd };

  const todayISO = today0.toISOString().slice(0, 10);
  const headerDates = { today: todayISO };

  const labelStartISO =
    hasUserFilter && searchParams?.dateFrom
      ? searchParams.dateFrom
      : toISODate(realRange.start);

  const labelEndISO =
    hasUserFilter && searchParams?.dateTo
      ? searchParams.dateTo
      : toISODate(realRange.end);

  const realWindow = {
    start: labelStartISO,
    end: labelEndISO,
  };

  const realCutoffDate = realWindow.end;

  return {
    period: effectivePeriod,
    hasUserDateFilter: hasUserFilter,
    headerDates,
    realWindow,
    realCutoffDate,
  };
}
