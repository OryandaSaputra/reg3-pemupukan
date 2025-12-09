-- CreateEnum
CREATE TYPE "KategoriTanaman" AS ENUM ('TM', 'TBM', 'BIBITAN');

-- CreateTable
CREATE TABLE "RencanaPemupukan" (
    "id" SERIAL NOT NULL,
    "kategori" "KategoriTanaman" NOT NULL,
    "kebun" TEXT NOT NULL,
    "kodeKebun" TEXT NOT NULL,
    "tanggal" DATE,
    "afd" TEXT NOT NULL,
    "tt" TEXT NOT NULL,
    "blok" TEXT NOT NULL,
    "luasHa" DOUBLE PRECISION NOT NULL,
    "inv" INTEGER NOT NULL,
    "jenisPupuk" TEXT NOT NULL,
    "aplikasiKe" INTEGER NOT NULL,
    "dosisKgPerPokok" DOUBLE PRECISION NOT NULL,
    "kgPupuk" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RencanaPemupukan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealisasiPemupukan" (
    "id" SERIAL NOT NULL,
    "kategori" "KategoriTanaman" NOT NULL,
    "kebun" TEXT NOT NULL,
    "kodeKebun" TEXT NOT NULL,
    "tanggal" DATE,
    "afd" TEXT NOT NULL,
    "tt" TEXT NOT NULL,
    "blok" TEXT NOT NULL,
    "luasHa" DOUBLE PRECISION NOT NULL,
    "inv" INTEGER NOT NULL,
    "jenisPupuk" TEXT NOT NULL,
    "aplikasiKe" INTEGER NOT NULL,
    "dosisKgPerPokok" DOUBLE PRECISION NOT NULL,
    "kgPupuk" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RealisasiPemupukan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_rencana_kebun_tanggal" ON "RencanaPemupukan"("kebun", "tanggal");

-- CreateIndex
CREATE INDEX "idx_rencana_kodeKebun_afd_blok" ON "RencanaPemupukan"("kodeKebun", "afd", "blok");

-- CreateIndex
CREATE INDEX "idx_rencana_tanggal" ON "RencanaPemupukan"("tanggal");

-- CreateIndex
CREATE INDEX "idx_realisasi_kebun_tanggal" ON "RealisasiPemupukan"("kebun", "tanggal");

-- CreateIndex
CREATE INDEX "idx_realisasi_kodeKebun_afd_blok" ON "RealisasiPemupukan"("kodeKebun", "afd", "blok");

-- CreateIndex
CREATE INDEX "idx_realisasi_tanggal" ON "RealisasiPemupukan"("tanggal");
