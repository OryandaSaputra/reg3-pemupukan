// src/app/api/pemupukan/meta/route.ts
'use server';

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { ORDER_DTM, ORDER_DBR } from "@/app/pemupukan/_config/constants";
import { unstable_cache } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";

/**
 * Auth helper:
 * Meta ini dipakai untuk filter di dashboard,
 * jadi wajar kalau dibatasi hanya user yang sudah login.
 */
async function requireAuth() {
  const session = await getServerSession(authOptions);
  return session;
}

/**
 * Implementasi asli penghitungan meta (dipindah dari GET),
 * supaya bisa dibungkus caching tanpa mengubah logika.
 */
async function getMetaImpl(distrik: string, kebun: string) {
  const whereRen: Prisma.RencanaPemupukanWhereInput = {};
  const whereReal: Prisma.RealisasiPemupukanWhereInput = {};

  if (kebun !== "all") {
    whereRen.kebun = kebun;
    whereReal.kebun = kebun;
  } else if (distrik === "DTM") {
    whereRen.kebun = { in: ORDER_DTM };
    whereReal.kebun = { in: ORDER_DTM };
  } else if (distrik === "DBR") {
    whereRen.kebun = { in: ORDER_DBR };
    whereReal.kebun = { in: ORDER_DBR };
  }
  // kalau distrik=all & kebun=all → tidak filter kebun

  const [
    renKategori,
    realKategori,
    renAfd,
    realAfd,
    renTt,
    realTt,
    renBlok,
    realBlok,
    renJenis,
    realJenis,
    renAplikasi,
    realAplikasi,
    renTanggal,
    realTanggal,
  ] = await Promise.all([
    prisma.rencanaPemupukan.groupBy({
      by: ["kategori"],
      where: whereRen,
      _count: { _all: true },
    }),
    prisma.realisasiPemupukan.groupBy({
      by: ["kategori"],
      where: whereReal,
      _count: { _all: true },
    }),
    prisma.rencanaPemupukan.groupBy({
      by: ["afd"],
      where: whereRen,
      _count: { _all: true },
    }),
    prisma.realisasiPemupukan.groupBy({
      by: ["afd"],
      where: whereReal,
      _count: { _all: true },
    }),
    prisma.rencanaPemupukan.groupBy({
      by: ["tt"],
      where: whereRen,
      _count: { _all: true },
    }),
    prisma.realisasiPemupukan.groupBy({
      by: ["tt"],
      where: whereReal,
      _count: { _all: true },
    }),
    prisma.rencanaPemupukan.groupBy({
      by: ["blok"],
      where: whereRen,
      _count: { _all: true },
    }),
    prisma.realisasiPemupukan.groupBy({
      by: ["blok"],
      where: whereReal,
      _count: { _all: true },
    }),
    prisma.rencanaPemupukan.groupBy({
      by: ["jenisPupuk"],
      where: whereRen,
      _count: { _all: true },
    }),
    prisma.realisasiPemupukan.groupBy({
      by: ["jenisPupuk"],
      where: whereReal,
      _count: { _all: true },
    }),
    prisma.rencanaPemupukan.groupBy({
      by: ["aplikasiKe"],
      where: whereRen,
      _count: { _all: true },
    }),
    prisma.realisasiPemupukan.groupBy({
      by: ["aplikasiKe"],
      where: whereReal,
      _count: { _all: true },
    }),
    // tanggal (untuk Tahun Data) – pakai distinct supaya tidak ambil semua duplikat
    prisma.rencanaPemupukan.findMany({
      where: whereRen,
      select: { tanggal: true },
      distinct: ["tanggal"],
    }),
    prisma.realisasiPemupukan.findMany({
      where: whereReal,
      select: { tanggal: true },
      distinct: ["tanggal"],
    }),
  ]);

  // ====== KATEGORI ======
  const kategoriSet = new Set<string>();
  renKategori.forEach((r) => r.kategori && kategoriSet.add(r.kategori));
  realKategori.forEach((r) => r.kategori && kategoriSet.add(r.kategori));
  const kategori = Array.from(kategoriSet).sort();

  // ====== AFD ======
  const afdSet = new Set<string>();
  renAfd.forEach((r) => r.afd && afdSet.add(r.afd));
  realAfd.forEach((r) => r.afd && afdSet.add(r.afd));
  const afd = Array.from(afdSet).sort();

  // ====== TT ======
  const ttSet = new Set<string>();
  renTt.forEach((r) => r.tt && ttSet.add(r.tt));
  realTt.forEach((r) => r.tt && ttSet.add(r.tt));
  const tt = Array.from(ttSet).sort();

  // ====== BLOK ======
  const blokSet = new Set<string>();
  renBlok.forEach((r) => r.blok && blokSet.add(r.blok));
  realBlok.forEach((r) => r.blok && blokSet.add(r.blok));
  const blok = Array.from(blokSet).sort();

  // ====== JENIS PUPUK ======
  const jenisSet = new Set<string>();
  renJenis.forEach((r) => r.jenisPupuk && jenisSet.add(r.jenisPupuk));
  realJenis.forEach((r) => r.jenisPupuk && jenisSet.add(r.jenisPupuk));
  const jenis = Array.from(jenisSet).sort();

  // ====== APLIKASI KE ======
  const aplikasiSet = new Set<number>();
  renAplikasi.forEach((r) => {
    if (r.aplikasiKe != null) aplikasiSet.add(r.aplikasiKe);
  });
  realAplikasi.forEach((r) => {
    if (r.aplikasiKe != null) aplikasiSet.add(r.aplikasiKe);
  });
  const aplikasi = Array.from(aplikasiSet)
    .sort((a, b) => a - b)
    .map((x) => String(x)); // ["1","2","3",..]

  // ====== TAHUN DATA (dari kolom tanggal) ======
  const yearSet = new Set<number>();
  renTanggal.forEach((r) => r.tanggal && yearSet.add(r.tanggal.getFullYear()));
  realTanggal.forEach(
    (r) => r.tanggal && yearSet.add(r.tanggal.getFullYear())
  );

  const years = Array.from(yearSet)
    .sort((a, b) => a - b)
    .map((y) => String(y));

  return {
    kategori,
    afd,
    tt,
    blok,
    jenis,
    aplikasi,
    years,
  };
}

/**
 * Versi cached:
 * - keyed per (distrik, kebun)
 * - ada tag "pemupukan:meta" supaya nanti bisa di-revalidate dari API lain
 */
const getMetaCached = unstable_cache(
  async (distrik: string, kebun: string) => {
    return getMetaImpl(distrik, kebun);
  },
  ["pemupukan:meta:get"],
  {
    revalidate: 300, // cache 5 menit (bisa diubah sesuai kebutuhan)
    tags: ["pemupukan:meta"],
  }
);

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const distrik = searchParams.get("distrik") ?? "all";
    const kebun = searchParams.get("kebun") ?? "all";

    const meta = await getMetaCached(distrik, kebun);

    return NextResponse.json(meta, {
      headers: {
        // HTTP caching tambahan (CDN / browser)
        "Cache-Control":
          "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    console.error("GET /api/pemupukan/meta error:", err);
    return NextResponse.json(
      { error: "Gagal mengambil meta pemupukan" },
      { status: 500 }
    );
  }
}
