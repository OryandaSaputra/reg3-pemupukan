// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

// Gunakan global supaya di dev tidak bikin banyak koneksi
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
