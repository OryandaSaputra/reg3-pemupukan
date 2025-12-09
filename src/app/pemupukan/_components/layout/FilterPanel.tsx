"use client";

import React from "react";
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
import { Filter as FilterIcon, RefreshCcw, Loader2 } from "lucide-react";
import { KEBUN_LABEL } from "../../_config/constants";
import type { Kategori } from "../../_state/derive";

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

  aplikasi: string;
  setAplikasi: (v: string) => void;
  aplikasiOptions?: string[];

  // Tahun Data (opsional, "" = semua)
  dataYear: string;
  setDataYear: (v: string) => void;
  dataYearOptions?: string[];

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

  /** ✅ loading meta / opsi filter (dari API) */
  metaLoading?: boolean;
};

function FilterPanel(props: Props) {
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
    aplikasi,
    setAplikasi,
    aplikasiOptions,
    dataYear,
    setDataYear,
    dataYearOptions,
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
    metaLoading,
  } = props;

  const isMetaLoading = metaLoading ?? false;

  /* ===================== APPLY / RESET ===================== */

  const applyFilter = () => {
    const params = new URLSearchParams();

    // ====== FILTER DISTRIK / KEBUN / KATEGORI ======
    if (distrik && distrik !== "all") {
      params.set("distrik", distrik);
    }

    if (kebun && kebun !== "all") {
      params.set("kebun", kebun);
    }

    if (kategori && kategori !== "all") {
      params.set("kategori", kategori);
    }

    // ====== FILTER DETAIL (AFD / TT / BLOK / JENIS / APLIKASI) ======
    if (afd && afd !== "all") {
      params.set("afd", afd);
    }

    if (tt && tt !== "all") {
      params.set("tt", tt);
    }

    if (blok && blok !== "all") {
      params.set("blok", blok);
    }

    if (jenis && jenis !== "all") {
      params.set("jenis", jenis);
    }

    if (aplikasi && aplikasi !== "all") {
      params.set("aplikasi", aplikasi);
    }

    // ====== TAHUN DATA ======
    if (dataYear) {
      params.set("year", dataYear);
    }

    // ====== RANGE TANGGAL ======
    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }

    if (dateTo) {
      params.set("dateTo", dateTo);
    }

    const qs = params.toString();
    router.push(qs ? `?${qs}` : "?");
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
    kategoriOptions ?? (["all", "TM", "TBM", "BIBITAN"] as (Kategori | "all")[]);
  const safeAfdOptions = afdOptions ?? [];
  const safeTtOptions = ttOptions ?? [];
  const safeBlokOptions = blokOptions ?? [];
  const safeJenisOptions = jenisOptions ?? ["all"];
  const safeAplikasiOptions = aplikasiOptions ?? ["all", "1", "2", "3"];
  const safeYearOptions = dataYearOptions ?? [];

  /* ===================== EARLY RETURN SETELAH SEMUA HOOK ===================== */

  if (!open) return null;

  /* ===================== UI ===================== */

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-[--glass-bg-strong] text-emerald-50 backdrop-blur-2xl shadow-[0_26px_55px_rgba(0,0,0,0.9)] border-l border-[--glass-border] p-6 overflow-y-auto rounded-l-3xl">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold flex items-center gap-2 text-emerald-50/95">
            <FilterIcon className="h-5 w-5" /> Filter
          </h2>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              className="gap-2 h-8 px-3 rounded-full border-[--glass-border] bg-white/0 hover:bg-white/10 hover:text-emerald-50/90"
              type="button"
              disabled={isMetaLoading}
            >
              <RefreshCcw className="h-4 w-4" /> Reset
            </Button>

            <Button
              onClick={applyFilter}
              className="gap-2 h-8 px-4 rounded-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 hover:from-emerald-400 hover:via-emerald-500 hover:to-emerald-400 text-white shadow-[0_14px_35px_rgba(4,120,87,0.65)]"
              type="button"
              disabled={isMetaLoading}
            >
              Terapkan
            </Button>

            <Button
              variant="outline"
              onClick={onClose}
              className="h-8 px-3 rounded-full border-[--glass-border] bg-white/0 hover:bg-white/10 hover:text-emerald-50/90"
              type="button"
            >
              Tutup
            </Button>
          </div>
        </div>

        {/* FORM + LOADING OVERLAY */}
        <div className="relative">
          <Card className="glass-surface rounded-2xl border border-[--glass-border]">
            <CardContent className="pt-4">
              {/* pakai 2 kolom di desktop biar rapi */}
              <div className="grid md:grid-cols-2 gap-3">
                {/* Distrik */}
                <div>
                  <label className="text-[11px] text-emerald-100/75">
                    Distrik
                  </label>
                  <Select
                    value={distrik}
                    onValueChange={setDistrik}
                    disabled={isMetaLoading}
                  >
                    <SelectTrigger className="w-full h-9 glass-input rounded-xl border-[--glass-border] text-emerald-50/90">
                      <SelectValue placeholder="Pilih Distrik" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 text-emerald-50 border border-emerald-500/40 shadow-xl backdrop-blur-none">
                      <SelectItem value="all">Semua</SelectItem>
                      {safeDistrikOptions.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Kebun */}
                <div>
                  <label className="text-[11px] text-emerald-100/75">
                    Kebun
                  </label>
                  <Select
                    value={kebun}
                    onValueChange={setKebun}
                    disabled={isMetaLoading}
                  >
                    <SelectTrigger className="w-full h-9 glass-input rounded-xl border-[--glass-border] text-emerald-50/90">
                      <SelectValue placeholder="Pilih Kebun" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 text-emerald-50 border border-emerald-500/40 shadow-xl backdrop-blur-none">
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
                  <label className="text-[11px] text-emerald-100/75">
                    Kategori Tanaman
                  </label>
                  <Select
                    value={kategori}
                    onValueChange={(v) => setKategori(v as Kategori | "all")}
                    disabled={isMetaLoading}
                  >
                    <SelectTrigger className="w-full h-9 glass-input rounded-xl border-[--glass-border] text-emerald-50/90">
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 text-emerald-50 border border-emerald-500/40 shadow-xl backdrop-blur-none">
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
                  <label className="text-[11px] text-emerald-100/75">
                    Afdeling (AFD)
                  </label>
                  <Select
                    value={afd}
                    onValueChange={setAfd}
                    disabled={isMetaLoading}
                  >
                    <SelectTrigger className="w-full h-9 glass-input rounded-xl border-[--glass-border] text-emerald-50/90">
                      <SelectValue placeholder="Pilih AFD" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 text-emerald-50 border border-emerald-500/40 shadow-xl backdrop-blur-none">
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
                  <label className="text-[11px] text-emerald-100/75">
                    Tahun Tanam (TT)
                  </label>
                  <Select
                    value={tt}
                    onValueChange={setTt}
                    disabled={isMetaLoading}
                  >
                    <SelectTrigger className="w-full h-9 glass-input rounded-xl border-[--glass-border] text-emerald-50/90">
                      <SelectValue placeholder="Pilih Tahun Tanam" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 text-emerald-50 border border-emerald-500/40 shadow-xl backdrop-blur-none">
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
                  <label className="text-[11px] text-emerald-100/75">
                    Blok
                  </label>
                  <Select
                    value={blok}
                    onValueChange={setBlok}
                    disabled={isMetaLoading}
                  >
                    <SelectTrigger className="w-full h-9 glass-input rounded-xl border-[--glass-border] text-emerald-50/90">
                      <SelectValue placeholder="Pilih Blok" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 text-emerald-50 border border-emerald-500/40 shadow-xl backdrop-blur-none">
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
                  <label className="text-[11px] text-emerald-100/75">
                    Jenis Pupuk
                  </label>
                  <Select
                    value={jenis}
                    onValueChange={setJenis}
                    disabled={isMetaLoading}
                  >
                    <SelectTrigger className="w-full h-9 glass-input rounded-xl border-[--glass-border] text-emerald-50/90">
                      <SelectValue placeholder="Pilih Jenis Pupuk" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 text-emerald-50 border border-emerald-500/40 shadow-xl backdrop-blur-none">
                      {safeJenisOptions.map((j) => (
                        <SelectItem key={j} value={j}>
                          {j === "all" ? "Semua" : j.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Aplikasi */}
                <div>
                  <label className="text-[11px] text-emerald-100/75">
                    Aplikasi
                  </label>
                  <Select
                    value={aplikasi}
                    onValueChange={setAplikasi}
                    disabled={isMetaLoading}
                  >
                    <SelectTrigger className="w-full h-9 glass-input rounded-xl border-[--glass-border] text-emerald-50/90">
                      <SelectValue placeholder="Pilih Aplikasi" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 text-emerald-50 border border-emerald-500/40 shadow-xl backdrop-blur-none">
                      {safeAplikasiOptions.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a === "all" ? "Semua" : `Aplikasi ${a}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tahun Data */}
                <div>
                  <label className="text-[11px] text-emerald-100/75">
                    Tahun Data
                  </label>
                  <Select
                    value={dataYear || "all"}
                    onValueChange={(v) =>
                      v === "all" ? setDataYear("") : setDataYear(v)
                    }
                    disabled={isMetaLoading}
                  >
                    <SelectTrigger className="w-full h-9 glass-input rounded-xl border-[--glass-border] text-emerald-50/90">
                      <SelectValue placeholder="Pilih Tahun Data" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 text-emerald-50 border border-emerald-500/40 shadow-xl backdrop-blur-none">
                      <SelectItem value="all">Semua</SelectItem>
                      {safeYearOptions.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date From */}
                <div>
                  <label className="text-[11px] text-emerald-100/75">
                    Realisasi: Dari
                  </label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-9 glass-input rounded-xl border-[--glass-border] text-emerald-50/90"
                    disabled={isMetaLoading}
                  />
                </div>

                {/* Date To */}
                <div>
                  <label className="text-[11px] text-emerald-100/75">
                    Realisasi: Sampai
                  </label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-9 glass-input rounded-xl border-[--glass-border] text-emerald-50/90"
                    disabled={isMetaLoading}
                  />
                </div>
              </div>

              {/* BADGE FILTER AKTIF */}
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                {distrik !== "all" && (
                  <Badge className="bg-white/10 border border-white/30 text-emerald-50/95 backdrop-blur-md rounded-full px-2.5 py-1">
                    Distrik: {distrik}
                  </Badge>
                )}
                {kebun !== "all" && (
                  <Badge className="bg-white/10 border border-white/30 text-emerald-50/95 backdrop-blur-md rounded-full px-2.5 py-1">
                    Kebun: {KEBUN_LABEL[kebun] ?? kebun}
                  </Badge>
                )}
                {kategori !== "all" && (
                  <Badge className="bg-white/10 border border-white/30 text-emerald-50/95 backdrop-blur-md rounded-full px-2.5 py-1">
                    Kategori: {kategori}
                  </Badge>
                )}
                {afd !== "all" && (
                  <Badge className="bg-white/10 border border-white/30 text-emerald-50/95 backdrop-blur-md rounded-full px-2.5 py-1">
                    AFD: {afd}
                  </Badge>
                )}
                {tt !== "all" && (
                  <Badge className="bg-white/10 border border-white/30 text-emerald-50/95 backdrop-blur-md rounded-full px-2.5 py-1">
                    TT: {tt}
                  </Badge>
                )}
                {blok !== "all" && (
                  <Badge className="bg-white/10 border border-white/30 text-emerald-50/95 backdrop-blur-md rounded-full px-2.5 py-1">
                    Blok: {blok}
                  </Badge>
                )}
                {jenis !== "all" && (
                  <Badge className="bg-white/10 border border-white/30 text-emerald-50/95 backdrop-blur-md rounded-full px-2.5 py-1">
                    Jenis: {jenis}
                  </Badge>
                )}
                {aplikasi !== "all" && (
                  <Badge className="bg-white/10 border border-white/30 text-emerald-50/95 backdrop-blur-md rounded-full px-2.5 py-1">
                    Aplikasi: {aplikasi}
                  </Badge>
                )}
                {dataYear && (
                  <Badge className="bg-white/10 border border-white/30 text-emerald-50/95 backdrop-blur-md rounded-full px-2.5 py-1">
                    Tahun: {dataYear}
                  </Badge>
                )}
                {dateFrom && (
                  <Badge className="bg-white/10 border border-white/30 text-emerald-50/95 backdrop-blur-md rounded-full px-2.5 py-1">
                    Dari: {dateFrom}
                  </Badge>
                )}
                {dateTo && (
                  <Badge className="bg-white/10 border border-white/30 text-emerald-50/95 backdrop-blur-md rounded-full px-2.5 py-1">
                    Sampai: {dateTo}
                  </Badge>
                )}

                {distrik === "all" &&
                  kebun === "all" &&
                  kategori === "all" &&
                  afd === "all" &&
                  tt === "all" &&
                  blok === "all" &&
                  jenis === "all" &&
                  aplikasi === "all" &&
                  !dataYear &&
                  !dateFrom &&
                  !dateTo && (
                    <span className="text-emerald-100/60">
                      Tidak ada filter aktif
                    </span>
                  )}
              </div>
            </CardContent>
          </Card>

          {/* 🔄 OVERLAY LOADING META */}
          {isMetaLoading && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-black/35 backdrop-blur-md">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-300" />
              <p className="text-[11px] text-emerald-50/85">
                Memuat opsi filter...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(FilterPanel);
