-- CreateTable
CREATE TABLE "CurahHujanHarian" (
    "kebunCode" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "kebunName" TEXT NOT NULL,
    "totalMm" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurahHujanHarian_pkey" PRIMARY KEY ("kebunCode","tanggal")
);

-- CreateIndex
CREATE INDEX "CurahHujanHarian_tanggal_idx" ON "CurahHujanHarian"("tanggal");

-- CreateIndex
CREATE INDEX "idx_curah_kebun_tanggal" ON "CurahHujanHarian"("kebunCode", "tanggal");
