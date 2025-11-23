/*
  Warnings:

  - A unique constraint covering the columns `[kebun,kodeKebun,blok,tanggal]` on the table `RealisasiPemupukan` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `uk_realisasi_kebun_kode_blok_tanggal` ON `RealisasiPemupukan`(`kebun`, `kodeKebun`, `blok`, `tanggal`);
