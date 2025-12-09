// src/lib/db.ts
// File ini sekarang hanya menjadi "alias" dari src/lib/prisma.ts
// supaya di seluruh project hanya ada SATU PrismaClient instance.

import prisma from "./prisma";

export default prisma;

// Jika ada kode lama yang pakai:
//   import prisma from "@/lib/db";
// semuanya tetap berjalan, tapi di balik layar
// tetap memakai instance yang sama dari "@/lib/prisma".
