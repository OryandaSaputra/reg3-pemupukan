// src/app/pemupukan/helpers.ts
import { prisma } from "@/lib/prisma";
import { KategoriTanaman } from "@prisma/client";
import type { TmRow } from "./sections/Visualisasi";

// hitung total kg untuk range tanggal tertentu
function sumKg(
  rows: { kebun: string; kgPupuk: number; aplikasiKe: number; tanggal: Date | null }[],
  kebun: string,
  aplikasi: number,
  start?: Date,
  end?: Date
) {
  return rows.reduce((acc, r) => {
    if (r.kebun !== kebun) return acc;
    if (r.aplikasiKe !== aplikasi) return acc;
    if (start && (!r.tanggal || r.tanggal < start)) return acc;
    if (end && (!r.tanggal || r.tanggal > end)) return acc;
    return acc + (r.kgPupuk || 0);
  }, 0);
}

// helper tanggal range 5 hari terakhir
function getFiveDayWindow(base: Date) {
  const end = new Date(base);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 4);
  return { start, end };
}

export async function buildTmRowsFromDb(
  kategori: KategoriTanaman,
  today = new Date()
): Promise<TmRow[]> {
  const { start, end } = getFiveDayWindow(today);

  // ambil rencana & realisasi untuk kategori tsb
  const [rencana, realisasi] = await Promise.all([
    prisma.rencanaPemupukan.findMany({
      where: { kategori },
      select: {
        kebun: true,
        aplikasiKe: true,
        kgPupuk: true,
        tanggal: true,
      },
    }),
    prisma.realisasiPemupukan.findMany({
      where: { kategori },
      select: {
        kebun: true,
        aplikasiKe: true,
        kgPupuk: true,
        tanggal: true,
      },
    }),
  ]);

  // daftar kebun yang ada di data
  const kebunSet = new Set<string>();
  rencana.forEach((r) => kebunSet.add(r.kebun));
  realisasi.forEach((r) => kebunSet.add(r.kebun));

  const todayKey = new Date(today);
  todayKey.setHours(0, 0, 0, 0);
  const tomorrowKey = new Date(todayKey);
  tomorrowKey.setDate(tomorrowKey.getDate() + 1);

  const rows: TmRow[] = [];

  [...kebunSet].forEach((kebun, idx) => {
    // APLIKASI 1
    const app1_rencana = sumKg(rencana, kebun, 1);
    const app1_real = sumKg(realisasi, kebun, 1);
    const app1_pct = app1_rencana > 0 ? (app1_real / app1_rencana) * 100 : 0;

    // APLIKASI 2
    const app2_rencana = sumKg(rencana, kebun, 2);
    const app2_real = sumKg(realisasi, kebun, 2);
    const app2_pct = app2_rencana > 0 ? (app2_real / app2_rencana) * 100 : 0;

    // APLIKASI 3
    const app3_rencana = sumKg(rencana, kebun, 3);
    const app3_real = sumKg(realisasi, kebun, 3);
    const app3_pct = app3_rencana > 0 ? (app3_real / app3_rencana) * 100 : 0;

    // Rencana / Real hari ini
    const renc_sekarang = sumKg(
      rencana,
      kebun,
      1,
      todayKey,
      todayKey
    ) +
      sumKg(rencana, kebun, 2, todayKey, todayKey) +
      sumKg(rencana, kebun, 3, todayKey, todayKey);

    const real_sekarang = sumKg(
      realisasi,
      kebun,
      1,
      todayKey,
      todayKey
    ) +
      sumKg(realisasi, kebun, 2, todayKey, todayKey) +
      sumKg(realisasi, kebun, 3, todayKey, todayKey);

    // rencana besok
    const renc_besok =
      sumKg(rencana, kebun, 1, tomorrowKey, tomorrowKey) +
      sumKg(rencana, kebun, 2, tomorrowKey, tomorrowKey) +
      sumKg(rencana, kebun, 3, tomorrowKey, tomorrowKey);

    // jumlah total (semua aplikasi, semua tanggal tahun berjalan)
    const jumlah_rencana2025 =
      sumKg(rencana, kebun, 1) +
      sumKg(rencana, kebun, 2) +
      sumKg(rencana, kebun, 3);

    const jumlah_realSd0710 =
      sumKg(realisasi, kebun, 1, start, end) +
      sumKg(realisasi, kebun, 2, start, end) +
      sumKg(realisasi, kebun, 3, start, end);

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
