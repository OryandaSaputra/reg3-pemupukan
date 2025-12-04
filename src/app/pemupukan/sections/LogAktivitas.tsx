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

/* ========================= CLIENT LOG CACHE ========================= */

type LogCacheEntry = {
  items: LogItem[];
  ts: number;
};

const LOG_CACHE_TTL = 60_000; // 60 detik
let logCache: LogCacheEntry | null = null;

export default function LogAktivitas() {
  const [items, setItems] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("ALL");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadLogs() {
      try {
        setLoading(true);

        const now = Date.now();

        // 1) Cek cache lokal dulu
        if (logCache && now - logCache.ts < LOG_CACHE_TTL) {
          if (!active) return;
          setItems(logCache.items);
          setLoading(false);
          return;
        }

        // 2) Kalau cache kosong/expired → fetch ke API
        const res = await fetch("/api/pemupukan/log-aktivitas?limit=20", {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Gagal fetch log");
        const json = await res.json();

        if (!active) return;

        const newItems: LogItem[] = json.items ?? [];

        // simpan ke cache
        logCache = {
          items: newItems,
          ts: Date.now(),
        };

        setItems(newItems);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          // request dibatalkan, abaikan
          return;
        }
        console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadLogs();

    return () => {
      active = false;
      controller.abort();
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

      <Card className="glass-surface rounded-2xl border border-[--glass-border] shadow-[0_18px_45px_rgba(3,18,9,0.85)]">
        <CardHeader className="flex flex-col gap-3 pb-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-emerald-50/95">
              Aktivitas Terbaru
            </CardTitle>
            <p className="mt-0.5 text-[11px] text-emerald-100/80">
              Menampilkan maksimal 20 aktivitas terakhir, dapat difilter
              berdasarkan sumber.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-2 md:items-end">
            {/* Filter chips */}
            <div className="inline-flex items-center rounded-full bg-emerald-950/50 px-1 py-1 shadow-[0_0_0_1px_rgba(16,185,129,0.4)] ring-1 ring-emerald-500/50">
              <button
                type="button"
                onClick={() => setFilter("ALL")}
                className={
                  "px-3 py-1 text-[10px] font-medium rounded-full transition-colors " +
                  (filter === "ALL"
                    ? "bg-emerald-500 text-emerald-950 shadow-md"
                    : "text-emerald-100 hover:bg-emerald-900/70")
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
                    ? "bg-orange-500 text-slate-950 shadow-md"
                    : "text-emerald-100 hover:bg-emerald-900/70")
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
                    ? "bg-emerald-400 text-emerald-950 shadow-md"
                    : "text-emerald-100 hover:bg-emerald-900/70")
                }
              >
                Realisasi
              </button>
            </div>

            {/* Info terakhir diperbarui */}
            <div className="flex flex-col items-end gap-1 text-[10px] text-emerald-100/70">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(74,222,128,0.4)] animate-pulse" />
                <span>Terakhir diperbarui:</span>
              </div>
              <span className="font-semibold text-emerald-50">
                {lastUpdated ? formatTanggal(lastUpdated) : "-"}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-emerald-100/80">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat log aktivitas...
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-xs text-emerald-100/80">
              Belum ada aktivitas terbaru.
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-emerald-100/80">
              Tidak ada aktivitas untuk filter{" "}
              <span className="font-semibold">
                {filter === "ALL" ? "Semua" : filter}
              </span>
              .
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto pr-1.5">
              {grouped.map((group) => (
                <div key={group.dateKey} className="pb-4 last:pb-1">
                  {/* Header tanggal (sticky di dalam scroll) */}
                  <div className="sticky top-0 z-10 mb-2 flex items-center gap-2 rounded-xl border border-[--glass-border] bg-gradient-to-r from-emerald-950/85 to-emerald-900/85 px-2 py-1.5 text-[11px] text-emerald-50 shadow-[0_10px_25px_rgba(2,6,23,0.8)] backdrop-blur">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="font-semibold">{group.label}</span>
                    <span className="text-[10px] text-emerald-100/80">
                      ({group.items.length} aktivitas)
                    </span>
                  </div>

                  {/* Timeline untuk tanggal ini */}
                  <ul className="relative space-y-3 before:absolute before:left-[11px] before:top-1 before:h-[calc(100%-0.5rem)] before:w-px before:bg-emerald-500/50">
                    {group.items.map((item) => (
                      <li key={item.id} className="relative pl-6">
                        {/* Titik timeline */}
                        <span
                          className={
                            "absolute left-[7px] top-3 h-3 w-3 rounded-full border-2 shadow " +
                            (item.sumber === "Rencana"
                              ? "border-emerald-900 bg-orange-400"
                              : "border-emerald-900 bg-emerald-400")
                          }
                        />

                        {/* Kartu aktivitas */}
                        <div className="flex flex-col gap-1.5 rounded-2xl border border-[--glass-border] bg-emerald-950/80 px-3.5 py-2.5 text-emerald-50 shadow-[0_10px_25px_rgba(2,6,23,0.9)] transition-shadow hover:shadow-[0_18px_40px_rgba(2,6,23,1)]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {/* Chip sumber */}
                                <span
                                  className={
                                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium " +
                                    (item.sumber === "Rencana"
                                      ? "border-orange-300/80 bg-orange-500/15 text-orange-200"
                                      : "border-emerald-300/80 bg-emerald-500/15 text-emerald-200")
                                  }
                                >
                                  {item.sumber}
                                </span>

                                {/* Jenis pupuk + aplikasi */}
                                <span className="text-[11px] font-semibold text-emerald-50">
                                  {item.jenisPupuk} • Apl-{item.aplikasiKe}
                                </span>
                              </div>

                              {/* AKTIVITAS / AKSI */}
                              <p className="text-[11px] italic text-emerald-100/85">
                                {item.aksi}
                              </p>

                              {/* Lokasi */}
                              <p className="text-[11px] text-emerald-100/85">
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
                            <span className="mt-0.5 whitespace-nowrap text-[10px] text-emerald-200/80">
                              {formatTanggal(item.updatedAt)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-emerald-100/85">
                            <span className="inline-flex items-center rounded-full border border-emerald-400/70 bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-100">
                              {item.kgPupuk.toLocaleString("id-ID")} Kg
                            </span>
                            <span className="hidden text-emerald-400/70 md:inline">
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
