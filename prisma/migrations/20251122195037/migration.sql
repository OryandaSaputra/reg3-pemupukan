-- CreateIndex
CREATE INDEX `idx_realisasi_kebun_tanggal` ON `RealisasiPemupukan`(`kebun`, `tanggal`);

-- CreateIndex
CREATE INDEX `idx_rencana_kebun_tanggal` ON `RencanaPemupukan`(`kebun`, `tanggal`);
