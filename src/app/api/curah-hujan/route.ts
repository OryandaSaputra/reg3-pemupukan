// src/app/api/curah-hujan/route.ts
import { ok, created, fail } from "@/server/lib/apiResponse";
import { requireSession } from "@/server/lib/auth";
import {
  ImportPayloadSchema,
  ListDatesQuerySchema,
  SummaryQuerySchema,
  PutPayloadSchema,
  DeletePayloadSchema,
  RainSourceSchema,
} from "@/server/modules/curah-hujan/curahHujan.schemas";
import { ymdToUtcDate } from "@/server/modules/curah-hujan/curahHujan.excel";
import * as service from "@/server/modules/curah-hujan/curahHujan.service";

const MAX_ROWS_PER_UPLOAD = 500;

/* =============================== POST =============================== */

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) return fail(401, "Unauthorized", "UNAUTHORIZED");

  try {
    const parsed = ImportPayloadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail(400, "Validasi gagal.", "VALIDATION_ERROR", parsed.error.flatten());
    }

    const result = await service.importRows({
      kebunCode: parsed.data.kebunCode.trim(),
      sumber: parsed.data.sumber,
      rows: parsed.data.rows,
      maxRows: MAX_ROWS_PER_UPLOAD,
    });

    if (!result.ok) {
      return fail(result.status, result.message, result.status === 413 ? "PAYLOAD_TOO_LARGE" : "BAD_REQUEST");
    }

    return created({
      message: result.message,
      countDays: result.countDays,
      days: result.days,
      invalidRows: result.invalidRows,
    });

  } catch (err) {
    console.error("POST /api/curah-hujan error", err);
    return fail(500, "Terjadi kesalahan saat import curah hujan.", "INTERNAL_ERROR");
  }
}

/* ================================ GET =============================== */

export async function GET(req: Request) {
  // 🔒 rekomendasi: GET juga dilindungi (biar data tidak bocor)
  const session = await requireSession();
  if (!session) return fail(401, "Unauthorized", "UNAUTHORIZED");

  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode");

    // mode=listDates
    if (mode === "listDates") {
      const queryObj = {
        mode: "listDates" as const,
        kebunCode: url.searchParams.get("kebunCode") ?? "",
        sumber: url.searchParams.get("sumber") ?? undefined,
      };

      const parsed = ListDatesQuerySchema.safeParse(queryObj);
      if (!parsed.success) {
        return fail(400, "Validasi gagal.", "VALIDATION_ERROR", parsed.error.flatten());
      }

      const sumber = parsed.data.sumber ?? RainSourceSchema.parse(undefined);
      const dates = await service.listDates(parsed.data.kebunCode.trim(), sumber);
      return ok(dates);
    }

    // normal summary
    const queryObj = {
      dailyDate: url.searchParams.get("dailyDate") ?? url.searchParams.get("date") ?? "",
      start: url.searchParams.get("start") ?? "",
      end: url.searchParams.get("end") ?? "",
      sumber: url.searchParams.get("sumber") ?? undefined,
    };

    const parsed = SummaryQuerySchema.safeParse(queryObj);
    if (!parsed.success) {
      return fail(
        400,
        "Parameter dailyDate, start, dan end wajib diisi. Format: ?dailyDate=YYYY-MM-DD&start=YYYY-MM-DD&end=YYYY-MM-DD",
        "VALIDATION_ERROR",
        parsed.error.flatten()
      );
    }

    const dailyDate = ymdToUtcDate(parsed.data.dailyDate);
    const startDate = ymdToUtcDate(parsed.data.start);
    const endDate = ymdToUtcDate(parsed.data.end);

    if (startDate > endDate) {
      return fail(400, "start tidak boleh lebih besar dari end.", "BAD_REQUEST");
    }

    const sumber = parsed.data.sumber ?? RainSourceSchema.parse(undefined);

    const items = await service.getSummary({
      dailyDate,
      startDate,
      endDate,
      sumber,
    });

    return ok(items);
  } catch (err) {
    console.error("GET /api/curah-hujan error", err);
    return fail(500, "Terjadi kesalahan saat mengambil data curah hujan.", "INTERNAL_ERROR");
  }
}

/* ================================ PUT =============================== */

export async function PUT(req: Request) {
  const session = await requireSession();
  if (!session) return fail(401, "Unauthorized", "UNAUTHORIZED");

  try {
    const parsed = PutPayloadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail(400, "Validasi gagal.", "VALIDATION_ERROR", parsed.error.flatten());
    }

    const tanggal = ymdToUtcDate(parsed.data.date);
    const sumber = parsed.data.sumber ?? RainSourceSchema.parse(undefined);

    await service.updateDaily({
      kebunCode: parsed.data.kebunCode.trim(),
      date: tanggal,
      sumber,
      totalMm: parsed.data.totalMm,
    });

    return ok({
      message: "Berhasil mengubah curah hujan harian.",
      kebunCode: parsed.data.kebunCode,
      date: parsed.data.date,
      totalMm: parsed.data.totalMm,
      sumber,
    });
  } catch (err) {
    console.error("PUT /api/curah-hujan error", err);
    return fail(500, "Terjadi kesalahan saat mengubah data curah hujan.", "INTERNAL_ERROR");
  }
}

/* ============================== DELETE ============================== */

export async function DELETE(req: Request) {
  const session = await requireSession();
  if (!session) return fail(401, "Unauthorized", "UNAUTHORIZED");

  try {
    const parsed = DeletePayloadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail(400, "Validasi gagal.", "VALIDATION_ERROR", parsed.error.flatten());
    }

    const kebunCode = parsed.data.kebunCode.trim();
    const sumber = parsed.data.sumber;

    // mode deleteAll
    if (parsed.data.deleteAll === true) {
      await service.deleteAll({ kebunCode, sumber });
      return ok({
        message: sumber
          ? `Berhasil menghapus seluruh data curah hujan (${sumber}) untuk kebun ${kebunCode}.`
          : `Berhasil menghapus seluruh data curah hujan (semua sumber) untuk kebun ${kebunCode}.`,
        kebunCode,
        mode: "all",
        sumber: sumber ?? "ALL",
      });
    }

    // mode per-date
    if (!parsed.data.date) {
      return fail(
        400,
        "Untuk hapus per tanggal, kebunCode dan date wajib diisi. Untuk hapus semua, kirim deleteAll: true.",
        "BAD_REQUEST"
      );
    }

    const tanggal = ymdToUtcDate(parsed.data.date);

    await service.deleteByDate({ kebunCode, date: tanggal, sumber });

    return ok({
      message: sumber
        ? "Berhasil menghapus data curah hujan harian untuk sumber tersebut."
        : "Berhasil menghapus data curah hujan harian untuk semua sumber.",
      kebunCode,
      date: parsed.data.date,
      mode: "per-date",
      sumber: sumber ?? "ALL",
    });
  } catch (err) {
    console.error("DELETE /api/curah-hujan error", err);
    return fail(500, "Terjadi kesalahan saat menghapus data curah hujan.", "INTERNAL_ERROR");
  }
}
