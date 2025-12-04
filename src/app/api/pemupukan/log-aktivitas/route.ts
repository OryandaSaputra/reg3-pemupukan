// src/app/api/pemupukan/log-aktivitas/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

/**
 * Implementasi asli (dipisah dari GET supaya bisa dibungkus caching).
 * Logika query, mapping, sort, dan konversi tanggal tidak diubah.
 */
async function getLogAktivitasImpl(limit: number) {
  const [recentRen, recentReal] = await Promise.all([
    prisma.rencanaPemupukan.findMany({
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        kebun: true,
        afd: true,
        blok: true,
        jenisPupuk: true,
        aplikasiKe: true,
        kgPupuk: true,
        tanggal: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.realisasiPemupukan.findMany({
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        kebun: true,
        afd: true,
        blok: true,
        jenisPupuk: true,
        aplikasiKe: true,
        kgPupuk: true,
        tanggal: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const items = [
    // Rencana
    ...recentRen.map((r) => {
      const { id, createdAt, updatedAt, ...rest } = r;
      const isBaru = createdAt.getTime() === updatedAt.getTime();

      const aksi = isBaru
        ? "Input rencana pemupukan (data baru)"
        : "Perubahan data rencana pemupukan";

      return {
        id: `REN-${id}`,
        sumber: "Rencana" as const,
        aksi,
        updatedAt,
        ...rest,
      };
    }),
    // Realisasi
    ...recentReal.map((r) => {
      const { id, createdAt, updatedAt, ...rest } = r;
      const isBaru = createdAt.getTime() === updatedAt.getTime();

      const aksi = isBaru
        ? "Input realisasi pemupukan (data baru)"
        : "Perubahan data realisasi pemupukan";

      return {
        id: `REAL-${id}`,
        sumber: "Realisasi" as const,
        aksi,
        updatedAt,
        ...rest,
      };
    }),
  ]
    // urutkan dari updatedAt terbaru ke lama
    .sort(
      (a, b) =>
        (b.updatedAt as Date).getTime() - (a.updatedAt as Date).getTime()
    )
    .slice(0, limit)
    // convert Date ke string biar aman di JSON
    .map((item) => ({
      ...item,
      updatedAt: (item.updatedAt as Date).toISOString(),
    }));

  return { items };
}

/**
 * Versi cached:
 * - keyed per `limit`
 * - pakai tag "pemupukan:log-aktivitas" supaya bisa di-revalidate dari route lain
 */
const getLogAktivitasCached = unstable_cache(
  async (limit: number) => {
    return getLogAktivitasImpl(limit);
  },
  ["pemupukan:log-aktivitas"],
  {
    revalidate: 60, // cache 1 menit (log sifatnya lebih dinamis)
    tags: ["pemupukan:log-aktivitas"],
  }
);

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 20;

    const data = await getLogAktivitasCached(limit);

    return NextResponse.json(data, {
      headers: {
        // Optional HTTP-level cache; tidak mengubah isi response
        "Cache-Control":
          "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    console.error("Error log-aktivitas:", err);
    return NextResponse.json(
      { error: "Gagal mengambil log aktivitas" },
      { status: 500 }
    );
  }
}
