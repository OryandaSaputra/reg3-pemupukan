// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// Deklarasi tipe global untuk menghindari multiple instance di dev
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Factory supaya konfigurasi PrismaClient rapi di satu tempat
function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error", "warn"],
    // Kalau mau lebih verbose untuk debugging:
    // errorFormat: "pretty",
  });
}

// Gunakan instance global di dev, dan instance baru di production
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

// Simpan ke global hanya kalau bukan production
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Biar bisa di-import dengan:
// import prisma from "@/lib/prisma";
export default prisma;
