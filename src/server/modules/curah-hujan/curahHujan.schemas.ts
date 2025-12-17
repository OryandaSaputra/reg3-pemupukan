// src/server/modules/curah-hujan/curahHujan.schemas.ts
import { z } from "zod";

export const RainSourceSchema = z
  .string()
  .optional()
  .transform((v) => (v ?? "").toString().trim().toUpperCase())
  .transform((v) => (v === "OMBROMETER" ? "OMBROMETER" : "AWS"))
  .pipe(z.union([z.literal("AWS"), z.literal("OMBROMETER")]));

export type RainSource = z.infer<typeof RainSourceSchema>;

export const IncomingRainRowSchema = z.object({
  Datetime: z.union([z.string(), z.number()]).optional().nullable(),
  Rainfall: z.union([z.string(), z.number()]).optional().nullable(),
});

export const ImportPayloadSchema = z.object({
  kebunCode: z.string().min(1, "Kode kebun wajib dipilih."),
  sumber: RainSourceSchema,
  rows: z.array(IncomingRainRowSchema).min(1, "Tidak ada baris data yang dikirim."),
});

export const ListDatesQuerySchema = z.object({
  mode: z.literal("listDates"),
  kebunCode: z.string().min(1, "kebunCode wajib diisi untuk mode=listDates."),
  sumber: RainSourceSchema.optional(),
});

export const MonthlyRecapQuerySchema = z.object({
  mode: z.literal("monthlyRecap"),
  year: z
    .string()
    .regex(/^\d{4}$/, "year harus 4 digit, contoh: 2025.")
    .transform((v) => Number(v)),
  kebunCode: z.string().optional(), // kosong => total semua kebun
  sumber: RainSourceSchema.optional(),
});

const DateYmd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid. Pakai YYYY-MM-DD.");

export const SummaryQuerySchema = z.object({
  dailyDate: DateYmd,
  start: DateYmd,
  end: DateYmd,
  sumber: RainSourceSchema.optional(),
});

export const PutPayloadSchema = z.object({
  kebunCode: z.string().min(1, "kebunCode wajib diisi."),
  date: DateYmd,
  totalMm: z.number().finite().min(0, "totalMm harus >= 0."),
  sumber: RainSourceSchema.optional(),

  // ✅ NEW:
  // - upsert (default): cocok untuk "Tambah Data Harian"
  // - strict: untuk "Edit" (harus sudah ada datanya)
  mode: z
    .enum(["upsert", "strict"])
    .optional()
    .transform((v) => v ?? "upsert"),
});

export const DeletePayloadSchema = z.object({
  kebunCode: z.string().min(1, "kebunCode wajib diisi."),
  date: DateYmd.optional(),
  deleteAll: z.boolean().optional(),
  sumber: RainSourceSchema.optional(),
});
