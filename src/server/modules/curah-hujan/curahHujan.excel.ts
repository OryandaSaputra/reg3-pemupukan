// src/server/modules/curah-hujan/curahHujan.excel.ts

/**
 * Parse berbagai format Datetime dari Excel → Date (UTC) hanya tanggal.
 */
export function parseDateOnlyFromExcelDatetime(raw: unknown): Date | null {
  const trimmed = (raw ?? "").toString().trim();
  if (!trimmed) return null;

  // Excel serial number
  const asNum = Number(trimmed.replace(",", "."));
  if (Number.isFinite(asNum)) {
    if (asNum > 20000 && asNum < 80000) {
      const excelEpoch = Date.UTC(1899, 11, 30);
      const msPerDay = 24 * 60 * 60 * 1000;
      const utcMs = excelEpoch + Math.floor(asNum) * msPerDay;
      const d = new Date(utcMs);
      if (!Number.isNaN(d.getTime())) {
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      }
    }
  }

  // dd-MM-yyyy
  const dmyMatch = trimmed.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dmyMatch) {
    const [, ddStr, mmStr, yyyyStr] = dmyMatch;
    const day = Number(ddStr);
    const month = Number(mmStr);
    const year = Number(yyyyStr);
    const dt = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  // yyyy-MM-dd
  const ymdMatch = trimmed.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const [, yyyyStr, mmStr, ddStr] = ymdMatch;
    const year = Number(yyyyStr);
    const month = Number(mmStr);
    const day = Number(ddStr);
    const dt = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  // fallback JS Date
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(
      Date.UTC(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate()
      )
    );
  }

  return null;
}

export function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "string") {
    const cleaned = value.trim().replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : fallback;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function round2(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function ymdToUtcDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((x) => Number(x));
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}
