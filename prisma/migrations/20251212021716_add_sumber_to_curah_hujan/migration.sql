/*
  Warnings:

  - The primary key for the `CurahHujanHarian` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropIndex
DROP INDEX "idx_curah_kebun_tanggal";

-- AlterTable
ALTER TABLE "CurahHujanHarian" DROP CONSTRAINT "CurahHujanHarian_pkey",
ADD COLUMN     "sumber" TEXT NOT NULL DEFAULT 'AWS',
ADD CONSTRAINT "CurahHujanHarian_pkey" PRIMARY KEY ("kebunCode", "tanggal", "sumber");

-- CreateIndex
CREATE INDEX "idx_curah_kebun_tanggal" ON "CurahHujanHarian"("kebunCode", "tanggal", "sumber");

-- CreateIndex
CREATE INDEX "idx_curah_sumber_tanggal" ON "CurahHujanHarian"("sumber", "tanggal");
