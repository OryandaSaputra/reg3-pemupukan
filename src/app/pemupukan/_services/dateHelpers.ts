// src/app/pemupukan/_services/dateHelpers.ts

/**
 * Tipe umum untuk sel Excel yang berisi tanggal.
 */
export type ExcelCell = string | number | Date | null | undefined;

/**
 * Konversi serial tanggal Excel (1900 date system) menjadi Date di UTC.
 * Menghasilkan Date pada jam 00:00 UTC di tanggal yang bersangkutan.
 */
export function excelSerialToUtcDate(serial: number): Date | null {
  if (!Number.isFinite(serial)) return null;
  if (serial <= 59 || serial >= 60000) return null; // batas aman wajar

  // Excel day 1 = 1900-01-01, dan ada bug tahun kabisat 1900
  // Rumus umum: epoch 1899-12-30
  const epoch = Date.UTC(1899, 11, 30);
  const ms = epoch + serial * 86400 * 1000;
  // Date ini secara internal UTC; nanti selalu dipakai pakai getUTC* supaya tidak geser.
  return new Date(ms);
}

/**
 * Format Date menjadi "YYYY-MM-DD" berdasarkan komponen UTC,
 * supaya tidak terpengaruh timezone lokal.
 */
function formatUtcYmd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Mengubah nilai sel Excel (string/number/Date) menjadi "YYYY-MM-DD".
 * Dipakai di RencanaTambah & RealisasiTambah saat import Excel.
 * Tidak mengandung informasi jam, dan netral terhadap timezone.
 */
export function toIsoDateJakarta(cell: ExcelCell): string {
  if (cell === null || cell === undefined) return "";

  // 1) Kalau sudah Date object
  if (cell instanceof Date) {
    if (Number.isNaN(cell.getTime())) return "";
    // pakai UTC supaya tidak geser
    return formatUtcYmd(cell);
  }

  const raw = String(cell).trim();
  if (!raw) return "";

  // 2) Kalau numeric → anggap serial Excel
  const num = Number(raw);
  if (Number.isFinite(num)) {
    const d = excelSerialToUtcDate(num);
    if (d) return formatUtcYmd(d);
  }

  // 3) String "YYYY-MM-DD" atau "YYYY/MM/DD"
  let m = raw.match(/^(\d{4})[\/-](\d{2})[\/-](\d{2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const d = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(d.getTime())) return formatUtcYmd(d);
  }

  // 4) String "DD/MM/YYYY" atau "DD-MM-YYYY" atau "DD.MM.YYYY"
  m = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    let year = Number(m[3]);

    // 2 digit tahun → asumsikan 19xx/20xx
    if (year < 100) {
      year += year >= 70 ? 1900 : 2000;
    }

    const d = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(d.getTime())) return formatUtcYmd(d);
  }

  // 5) Fallback pakai Date parser bawaan, lalu normalisasi ke UTC date-only
  const guessed = new Date(raw);
  if (Number.isNaN(guessed.getTime())) return "";

  return formatUtcYmd(guessed);
}

/**
 * Parse nilai tanggal dari client (form manual atau Excel) ke Date
 * untuk disimpan ke kolom Prisma `@db.Date`.
 *
 * Prinsip:
 * - Perlakukan input sebagai **tanggal kalender** (tanpa jam).
 * - Buat Date di **UTC 00:00** agar aman terhadap perbedaan timezone.
 */
export function parseTanggalIsoJakarta(value: unknown): Date | null {
  if (value === null || value === undefined) return null;

  // Kalau sudah Date → normalisasi ke 00:00 UTC dari tanggal tersebut
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const y = value.getUTCFullYear();
    const m = value.getUTCMonth();
    const d = value.getUTCDate();
    return new Date(Date.UTC(y, m, d));
  }

  const s = String(value).trim();
  if (!s || s === "-") return null;

  // Numeric → kemungkinan serial Excel
  const maybeNum = Number(s);
  if (Number.isFinite(maybeNum)) {
    const d = excelSerialToUtcDate(maybeNum);
    if (d)
      return new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
      );
  }

  // "YYYY-MM-DD"
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const d = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // "DD/MM/YYYY" atau "DD-MM-YYYY" atau "DD.MM.YYYY"
  m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/.exec(s);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) {
      year += year >= 70 ? 1900 : 2000;
    }
    const d = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Fallback: parse string biasa, lalu ambil bagian tanggal UTC-nya saja
  const guessed = new Date(s);
  if (Number.isNaN(guessed.getTime())) return null;
  return new Date(
    Date.UTC(
      guessed.getUTCFullYear(),
      guessed.getUTCMonth(),
      guessed.getUTCDate()
    )
  );
}
