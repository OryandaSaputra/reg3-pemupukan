-- CreateTable
CREATE TABLE `RencanaPemupukan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kategori` ENUM('TM', 'TBM', 'BIBITAN') NOT NULL,
    `kebun` VARCHAR(191) NOT NULL,
    `kodeKebun` VARCHAR(191) NOT NULL,
    `tanggal` DATE NOT NULL,
    `afd` VARCHAR(191) NOT NULL,
    `tt` VARCHAR(191) NOT NULL,
    `blok` VARCHAR(191) NOT NULL,
    `luasHa` DOUBLE NOT NULL,
    `inv` INTEGER NOT NULL,
    `jenisPupuk` VARCHAR(191) NOT NULL,
    `aplikasiKe` INTEGER NOT NULL,
    `dosisKgPerPokok` DOUBLE NOT NULL,
    `kgPupuk` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RealisasiPemupukan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kategori` ENUM('TM', 'TBM', 'BIBITAN') NOT NULL,
    `kebun` VARCHAR(191) NOT NULL,
    `kodeKebun` VARCHAR(191) NOT NULL,
    `tanggal` DATE NOT NULL,
    `afd` VARCHAR(191) NOT NULL,
    `tt` VARCHAR(191) NOT NULL,
    `blok` VARCHAR(191) NOT NULL,
    `luasHa` DOUBLE NOT NULL,
    `inv` INTEGER NOT NULL,
    `jenisPupuk` VARCHAR(191) NOT NULL,
    `aplikasiKe` INTEGER NOT NULL,
    `dosisKgPerPokok` DOUBLE NOT NULL,
    `kgPupuk` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
