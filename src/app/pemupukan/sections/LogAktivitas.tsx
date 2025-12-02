"use client";

import { useEffect, useState } from "react";
import SectionHeader from "../components/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type LogItem = {
  id: string;
  sumber: "Rencana" | "Realisasi";
  aksi: string;
  kebun: string;
  afd: string;
  blok: string;
  jenisPupuk: string;
  aplikasiKe: number;
  kgPupuk: number;
  tanggal: string | null;
  updatedAt: string;
};

type GroupedLog = {
  dateKey: string;
  label: string;
  items: LogItem[];
};

type FilterType = "ALL" | "Rencana" | "Realisasi";

export default function LogAktivitas() {
  const [items, setItems] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("ALL");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/pemupukan/log-aktivitas?limit=20");
        if (!res.ok) throw new Error("Gagal fetch log");
        const json = await res.json();
        if (!active) return;
        setItems(json.items ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const formatTanggal = (value: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTanggalHeader = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID", {
      timeZone: "Asia/Jakarta",
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const groupByTanggal = (data: LogItem[]): GroupedLog[] => {
    const map = new Map<string, { label: string; items: LogItem[] }>();

    for (const item of data) {
      const d = new Date(item.updatedAt);
      if (Number.isNaN(d.getTime())) continue;

      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${day}`;

      const label = formatTanggalHeader(d.toISOString());

      const existing = map.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        map.set(key, { label, items: [item] });
      }
    }

    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // tanggal terbaru di atas
      .map(([dateKey, { label, items }]) => ({
        dateKey,
        label,
        items: items.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
      }));
  };

  const filteredItems =
    filter === "ALL"
      ? items
      : items.filter((item) => item.sumber === filter);

  const grouped = groupByTanggal(filteredItems);
  const lastUpdated = items[0]?.updatedAt ?? null;

  return (
    <section className="space-y-3">
      <SectionHeader
        title="Log Aktivitas"
        desc="Jejak perubahan terbaru pada data Rencana & Realisasi"
      />

      <Card className="shadow-md border-emerald-300 bg-gradient-to-br from-white via-emerald-50 to-emerald-100">
        <CardHeader className="flex flex-col gap-3 pb-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-900">
              Aktivitas Terbaru
            </CardTitle>
            <p className="mt-0.5 text-[11px] text-slate-600">
              Menampilkan maksimal 20 aktivitas terakhir, dapat difilter berdasarkan sumber.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-2 md:items-end">
            {/* Filter chips */}
            <div className="inline-flex items-center rounded-full bg-white p-1 shadow ring-1 ring-emerald-300">
              <button
                type="button"
                onClick={() => setFilter("ALL")}
                className={
                  "px-3 py-1 text-[10px] font-medium rounded-full transition-colors " +
                  (filter === "ALL"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-700 hover:bg-blue-100")
                }
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setFilter("Rencana")}
                className={
                  "px-3 py-1 text-[10px] font-medium rounded-full transition-colors " +
                  (filter === "Rencana"
                    ? "bg-orange-600 text-white shadow"
                    : "text-slate-700 hover:bg-orange-100")
                }
              >
                Rencana
              </button>
              <button
                type="button"
                onClick={() => setFilter("Realisasi")}
                className={
                  "px-3 py-1 text-[10px] font-medium rounded-full transition-colors " +
                  (filter === "Realisasi"
                    ? "bg-green-600 text-white shadow"
                    : "text-slate-700 hover:bg-emerald-100")
                }
              >
                Realisasi
              </button>
            </div>

            {/* Info terakhir diperbarui */}
            <div className="flex flex-col items-end gap-1 text-[10px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(34,197,94,0.45)] animate-pulse" />
                <span>Terakhir diperbarui:</span>
              </div>
              <span className="font-semibold text-slate-800">
                {lastUpdated ? formatTanggal(lastUpdated) : "-"}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-xs text-slate-600 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Memuat log aktivitas...
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-xs text-center text-slate-600">
              Belum ada aktivitas terbaru.
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-8 text-xs text-center text-slate-600">
              Tidak ada aktivitas untuk filter{" "}
              <span className="font-semibold">
                {filter === "ALL" ? "Semua" : filter}
              </span>
              .
            </div>
          ) : (
            <div className="max-h-80 pr-1.5 overflow-y-auto">
              {grouped.map((group) => (
                <div key={group.dateKey} className="pb-4 last:pb-1">
                  {/* Header tanggal (sticky di dalam scroll) */}
                  <div className="sticky top-0 z-10 mb-2 flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-200 to-emerald-100 px-2 py-1.5 text-[11px] shadow-[0_6px_15px_rgba(15,23,42,0.18)] backdrop-blur">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-700" />
                    <span className="font-semibold text-slate-900">
                      {group.label}
                    </span>
                    <span className="text-[10px] text-slate-700">
                      ({group.items.length} aktivitas)
                    </span>
                  </div>

                  {/* Timeline untuk tanggal ini */}
                  <ul className="relative space-y-3 before:absolute before:left-[11px] before:top-1 before:h-[calc(100%-0.5rem)] before:w-px before:bg-emerald-300">
                    {group.items.map((item) => (
                      <li key={item.id} className="relative pl-6">
                        {/* Titik timeline */}
                        <span
                          className={
                            "absolute left-[7px] top-3 h-3 w-3 rounded-full border-2 border-slate-700 shadow " +
                            (item.sumber === "Rencana"
                              ? "bg-orange-500"
                              : "bg-green-500")
                          }
                        />

                        {/* Kartu aktivitas */}
                        <div className="flex flex-col gap-1.5 rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 shadow-md transition-shadow hover:shadow-xl">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {/* Chip sumber */}
                                <span
                                  className={
                                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium " +
                                    (item.sumber === "Rencana"
                                      ? "border-orange-300 bg-orange-50 text-orange-700"
                                      : "border-emerald-300 bg-emerald-50 text-emerald-700")
                                  }
                                >
                                  {item.sumber}
                                </span>

                                {/* Jenis pupuk + aplikasi */}
                                <span className="text-[11px] font-semibold text-slate-900">
                                  {item.jenisPupuk} • Apl-{item.aplikasiKe}
                                </span>
                              </div>

                              {/* AKTIVITAS / AKSI */}
                              <p className="text-[11px] italic text-slate-700">
                                {item.aksi}
                              </p>

                              {/* Lokasi */}
                              <p className="text-[11px] text-slate-700">
                                Kebun{" "}
                                <span className="font-semibold">
                                  {item.kebun}
                                </span>{" "}
                                · AFD{" "}
                                <span className="font-medium">
                                  {item.afd}
                                </span>{" "}
                                · Blok{" "}
                                <span className="font-medium">
                                  {item.blok}
                                </span>
                              </p>
                            </div>

                            {/* Waktu update */}
                            <span className="mt-0.5 whitespace-nowrap text-[10px] text-slate-500">
                              {formatTanggal(item.updatedAt)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-700">
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                              {item.kgPupuk.toLocaleString("id-ID")} Kg
                            </span>
                            <span className="hidden text-slate-400 md:inline">
                              •
                            </span>
                            <span>
                              Tgl pelaksanaan:{" "}
                              <span className="font-medium">
                                {formatTanggal(item.tanggal)}
                              </span>
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
