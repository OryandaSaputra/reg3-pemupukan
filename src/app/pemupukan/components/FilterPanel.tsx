"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter as FilterIcon, RefreshCcw } from "lucide-react";
import { KEBUN_LABEL } from "../constants";
import type { Kategori } from "../derive";

type Props = {
  open: boolean;
  onClose: () => void;

  distrik: string;
  setDistrik: (v: string) => void;

  kebun: string;
  setKebun: (v: string) => void;

  kategori: Kategori | "all";
  setKategori: (v: Kategori | "all") => void;

  afd: string;
  setAfd: (v: string) => void;

  tt: string;
  setTt: (v: string) => void;

  blok: string;
  setBlok: (v: string) => void;

  jenis: string;
  setJenis: (v: string) => void;
  jenisOptions?: string[];

  dateFrom: string;
  setDateFrom: (v: string) => void;

  dateTo: string;
  setDateTo: (v: string) => void;

  distrikOptions?: string[];
  kebunOptions?: string[];
  kategoriOptions?: (Kategori | "all")[];
  afdOptions?: string[];
  ttOptions?: string[];
  blokOptions?: string[];

  resetFilter: () => void;
};

export default function FilterPanel(props: Props) {
  const router = useRouter();

  const {
    open,
    onClose,
    distrik,
    setDistrik,
    kebun,
    setKebun,
    kategori,
    setKategori,
    afd,
    setAfd,
    tt,
    setTt,
    blok,
    setBlok,
    jenis,
    setJenis,
    jenisOptions,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    distrikOptions,
    kebunOptions,
    kategoriOptions,
    afdOptions,
    ttOptions,
    blokOptions,
    resetFilter,
  } = props;

  if (!open) return null;

  /* ===================== APPLY / RESET ===================== */

  const applyFilter = () => {
    const newParams = new URLSearchParams();

    if (dateFrom) newParams.set("dateFrom", dateFrom);
    if (dateTo) newParams.set("dateTo", dateTo);

    router.push(`?${newParams.toString()}`);
    onClose();
  };

  const handleReset = () => {
    setDateFrom("");
    setDateTo("");

    router.push("?");
    resetFilter();
  };

  /* ===================== fallback options ===================== */

  const safeDistrikOptions = distrikOptions ?? [];
  const safeKebunOptions = kebunOptions ?? [];
  const safeKategoriOptions =
    kategoriOptions ?? ["all", "TM", "TBM", "BIBITAN"];
  const safeAfdOptions = afdOptions ?? [];
  const safeTtOptions = ttOptions ?? [];
  const safeBlokOptions = blokOptions ?? [];
  const safeJenisOptions = jenisOptions ?? ["all"];

  /* ===================== UI ===================== */

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-slate-900 shadow-xl p-6 overflow-y-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <FilterIcon className="h-5 w-5" /> Filter
          </h2>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              className="gap-2 h-8 px-3"
              type="button"
            >
              <RefreshCcw className="h-4 w-4" /> Reset
            </Button>

            <Button
              onClick={applyFilter}
              className="gap-2 h-8 px-3 bg-green-600 hover:bg-green-700 text-white"
              type="button"
            >
              Terapkan
            </Button>

            <Button
              variant="outline"
              onClick={onClose}
              className="h-8 px-3"
              type="button"
            >
              Tutup
            </Button>
          </div>
        </div>

        {/* FORM */}
        <Card className="bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
          <CardContent className="pt-4">
            {/* pakai 2 kolom di desktop biar rapi */}
            <div className="grid md:grid-cols-2 gap-3">
              {/* Distrik */}
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400">
                  Distrik
                </label>
                <Select value={distrik} onValueChange={setDistrik}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Pilih Distrik" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {safeDistrikOptions.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Kebun (opsi sudah difilter berdasarkan distrik di context) */}
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kebun
                </label>
                <Select value={kebun} onValueChange={setKebun}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Pilih Kebun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {safeKebunOptions.map((k) => (
                      <SelectItem key={k} value={k}>
                        {KEBUN_LABEL[k] ?? k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Kategori */}
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kategori Tanaman
                </label>
                <Select
                  value={kategori}
                  onValueChange={(v) => setKategori(v as Kategori | "all")}
                >
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {safeKategoriOptions.map((k) => (
                      <SelectItem key={k} value={k}>
                        {k === "all"
                          ? "Semua"
                          : k === "TM"
                            ? "TM (Menghasilkan)"
                            : k === "TBM"
                              ? "TBM (Belum Menghasilkan)"
                              : "BIBITAN"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* AFD */}
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400">
                  Afdeling (AFD)
                </label>
                <Select value={afd} onValueChange={setAfd}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Pilih AFD" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {safeAfdOptions.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* TT */}
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tahun Tanam (TT)
                </label>
                <Select value={tt} onValueChange={setTt}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Pilih Tahun Tanam" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {safeTtOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Blok */}
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400">
                  Blok
                </label>
                <Select value={blok} onValueChange={setBlok}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Pilih Blok" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {safeBlokOptions.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Jenis Pupuk */}
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400">
                  Jenis Pupuk
                </label>
                <Select value={jenis} onValueChange={setJenis}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Pilih Jenis Pupuk" />
                  </SelectTrigger>
                  <SelectContent>
                    {safeJenisOptions.map((j) => (
                      <SelectItem key={j} value={j}>
                        {j === "all" ? "Semua" : j.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400">
                  Realisasi: Dari
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400">
                  Realisasi: Sampai
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            {/* BADGE FILTER AKTIF */}
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              {distrik !== "all" && (
                <Badge variant="secondary">Distrik: {distrik}</Badge>
              )}
              {kebun !== "all" && (
                <Badge variant="secondary">
                  Kebun: {KEBUN_LABEL[kebun] ?? kebun}
                </Badge>
              )}
              {kategori !== "all" && (
                <Badge variant="secondary">Kategori: {kategori}</Badge>
              )}
              {afd !== "all" && (
                <Badge variant="secondary">AFD: {afd}</Badge>
              )}
              {tt !== "all" && <Badge variant="secondary">TT: {tt}</Badge>}
              {blok !== "all" && (
                <Badge variant="secondary">Blok: {blok}</Badge>
              )}
              {jenis !== "all" && (
                <Badge variant="secondary">Jenis: {jenis}</Badge>
              )}
              {dateFrom && (
                <Badge variant="secondary">Dari: {dateFrom}</Badge>
              )}
              {dateTo && (
                <Badge variant="secondary">Sampai: {dateTo}</Badge>
              )}

              {distrik === "all" &&
                kebun === "all" &&
                kategori === "all" &&
                afd === "all" &&
                tt === "all" &&
                blok === "all" &&
                jenis === "all" &&
                !dateFrom &&
                !dateTo && (
                  <span className="text-slate-400 dark:text-slate-500">
                    Tidak ada filter aktif
                  </span>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
