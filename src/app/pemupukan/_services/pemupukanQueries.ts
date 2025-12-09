// src/app/pemupukan/_services/pemupukanQueries.ts
import { prisma } from "@/lib/prisma";
import { KategoriTanaman } from "@prisma/client";
import { unstable_cache } from "next/cache";
import type { TmRow } from "@/app/pemupukan/_components/dashboard/visualisasi/Visualisasi";

// helper tanggal range 5 hari terakhir
function getFiveDayWindow(base: Date) {
  const end = new Date(base);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 4);
  return { start, end };
}

/**
 * Helper kecil untuk memastikan kita punya struktur agregat per kebun.
 */
type AppAgg = { 1: number; 2: number; 3: number };
type KebunAgg = {
  renApps: AppAgg;
  realApps: AppAgg;
  rencToday: number;
  realToday: number;
  rencTomorrow: number;
  realWindow5: number;
};

function createEmptyAgg(): KebunAgg {
  return {
    renApps: { 1: 0, 2: 0, 3: 0 },
    realApps: { 1: 0, 2: 0, 3: 0 },
    rencToday: 0,
    realToday: 0,
    rencTomorrow: 0,
    realWindow5: 0,
  };
}

/* ===================== IMPLEMENTASI (DIOPTIMALKAN, TAPI LOGIC SAMA) ===================== */

async function buildTmRowsFromDbImpl(
  kategori: KategoriTanaman,
  today = new Date()
): Promise<TmRow[]> {
  const { start, end } = getFiveDayWindow(today);

  const todayKey = new Date(today);
  todayKey.setHours(0, 0, 0, 0);
  const tomorrowKey = new Date(todayKey);
  tomorrowKey.setDate(tomorrowKey.getDate() + 1);

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

  // Agregasi sekali di sini, supaya tidak perlu
  // memanggil sumKg berkali-kali (O(n * kebun)).
  const aggMap = new Map<string, KebunAgg>();

  const ensureAgg = (kebun: string): KebunAgg => {
    const existing = aggMap.get(kebun);
    if (existing) return existing;
    const created = createEmptyAgg();
    aggMap.set(kebun, created);
    return created;
  };

  // ====== Proses RENCANA ======
  for (const row of rencana) {
    const kebun = row.kebun;
    const app = row.aplikasiKe ?? 0;
    if (!app || (app !== 1 && app !== 2 && app !== 3)) continue;

    const kg = row.kgPupuk ?? 0;
    const t = row.tanggal ?? null;

    const agg = ensureAgg(kebun);

    // total per aplikasi (semua tanggal)
    agg.renApps[app] += kg;

    // rencana hari ini
    if (t && t >= todayKey && t <= todayKey) {
      agg.rencToday += kg;
    }

    // rencana besok
    if (t && t >= tomorrowKey && t <= tomorrowKey) {
      agg.rencTomorrow += kg;
    }
  }

  // ====== Proses REALISASI ======
  for (const row of realisasi) {
    const kebun = row.kebun;
    const app = row.aplikasiKe ?? 0;
    if (!app || (app !== 1 && app !== 2 && app !== 3)) continue;

    const kg = row.kgPupuk ?? 0;
    const t = row.tanggal ?? null;

    const agg = ensureAgg(kebun);

    // total per aplikasi (semua tanggal)
    agg.realApps[app] += kg;

    // realisasi hari ini
    if (t && t >= todayKey && t <= todayKey) {
      agg.realToday += kg;
    }

    // realisasi untuk window 5 hari (start–end) → ini yang dipakai untuk jumlah_realSd0710
    if (t && t >= start && t <= end) {
      agg.realWindow5 += kg;
    }
  }

  // Bentuk output TmRow (mirip logic awal, tapi pakai hasil agregat di atas)
  const rows: TmRow[] = [];
  let idx = 0;

  for (const [kebun, agg] of aggMap.entries()) {
    idx += 1;

    const app1_rencana = agg.renApps[1] ?? 0;
    const app2_rencana = agg.renApps[2] ?? 0;
    const app3_rencana = agg.renApps[3] ?? 0;

    const app1_real = agg.realApps[1] ?? 0;
    const app2_real = agg.realApps[2] ?? 0;
    const app3_real = agg.realApps[3] ?? 0;

    const app1_pct = app1_rencana > 0 ? (app1_real / app1_rencana) * 100 : 0;
    const app2_pct = app2_rencana > 0 ? (app2_real / app2_rencana) * 100 : 0;
    const app3_pct = app3_rencana > 0 ? (app3_real / app3_rencana) * 100 : 0;

    const renc_sekarang = agg.rencToday;
    const real_sekarang = agg.realToday;
    const renc_besok = agg.rencTomorrow;

    const jumlah_rencana2025 =
      app1_rencana + app2_rencana + app3_rencana;

    // total realisasi untuk 5 hari window (1..3 aplikasi)
    const jumlah_realSd0710 = agg.realWindow5;

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

// ===================== WRAPPER CACHED (API TETAP SAMA) =====================

export const buildTmRowsFromDb = unstable_cache(
  async (
    kategori: KategoriTanaman,
    today: Date = new Date()
  ): Promise<TmRow[]> => {
    return buildTmRowsFromDbImpl(kategori, today);
  },
  ["pemupukan:helpers:buildTmRowsFromDb"],
  {
    // contoh: cache 5 menit; bisa diubah sesuai kebutuhan
    revalidate: 300,
  }
);
