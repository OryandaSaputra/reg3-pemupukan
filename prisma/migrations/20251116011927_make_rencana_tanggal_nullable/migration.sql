-- DropIndex
DROP INDEX `uk_realisasi_kebun_kode_blok_tanggal` ON `realisasipemupukan`;

-- AlterTable
ALTER TABLE `rencanapemupukan` MODIFY `tanggal` DATE NULL;
