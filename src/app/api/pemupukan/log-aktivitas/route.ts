import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 20;

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
          (b.updatedAt as Date).getTime() - (a.updatedAt as Date).getTime(),
      )
      .slice(0, limit)
      // convert Date ke string biar aman di JSON
      .map((item) => ({
        ...item,
        updatedAt: (item.updatedAt as Date).toISOString(),
      }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error("Error log-aktivitas:", err);
    return NextResponse.json(
      { error: "Gagal mengambil log aktivitas" },
      { status: 500 },
    );
  }
}
