// src/app/pemupukan/layout.tsx
"use client";

import React, { useCallback, useMemo } from "react";
import { PemupukanProvider, usePemupukan } from "@/app/pemupukan/_state/context";
import Sidebar from "@/app/pemupukan/_components/layout/Sidebar";
import MobileSidebar from "@/app/pemupukan/_components/layout/MobileSidebar";
import FilterPanel from "@/app/pemupukan/_components/layout/FilterPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter as FilterIcon, Menu } from "lucide-react";
import { createStyleVars } from "@/app/pemupukan/utils";
import { KEBUN_LABEL } from "@/app/pemupukan/_config/constants";

function Frame({ children }: { children: React.ReactNode }) {
  const {
    // ui
    sidebarOpen,
    setSidebarOpen,
    navRealOpen,
    setNavRealOpen,
    navRencanaOpen,
    setNavRencanaOpen,
    filterOpen,
    setFilterOpen,

    // filters + setters
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
    aplikasi,
    setAplikasi,
    dataYear,
    setDataYear,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,

    // options (sudah difilter oleh context sesuai distrik/kebun)
    distrikOptions,
    kebunOptions,
    kategoriOptions,
    afdOptions,
    ttOptions,
    blokOptions,
    jenisOptions,
    aplikasiOptions,
    dataYearOptions,

    // ✅ status loading meta
    metaLoading,

    resetFilter,
  } = usePemupukan();

  // Style vars tidak berubah antar render → memo supaya tidak recreate object tiap kali
  const styleVars = useMemo(() => createStyleVars(), []);

  // Callbacks sering dipass ke child → dibungkus useCallback agar referensinya stabil
  const openSidebar = useCallback(() => setSidebarOpen(true), [setSidebarOpen]);
  const openFilter = useCallback(() => setFilterOpen(true), [setFilterOpen]);
  const closeFilter = useCallback(() => setFilterOpen(false), [setFilterOpen]);

  return (
    <div
      className="min-h-screen flex gap-4 px-3 py-4 lg:px-6 lg:py-6 text-emerald-50 transition-colors duration-300"
      style={styleVars}
    >
      {/* Sidebar desktop */}
      <Sidebar
        navRealOpen={navRealOpen}
        setNavRealOpen={setNavRealOpen}
        navRencanaOpen={navRencanaOpen}
        setNavRencanaOpen={setNavRencanaOpen}
        setFilterOpen={setFilterOpen}
      />

      {/* Sidebar mobile */}
      <MobileSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        setFilterOpen={setFilterOpen}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Wrapper utama: kartu kaca besar untuk topbar + konten */}
        <div className="flex-1 flex flex-col rounded-3xl border border-[--glass-border] bg-[--glass-bg] backdrop-blur-2xl ring-1 ring-white/10 shadow-[0_18px_45px_rgba(6,40,18,0.65)] overflow-hidden">
          {/* Topbar */}
          <header className="sticky top-0 z-40 border-b border-white/15 bg-[--glass-bg] backdrop-blur-2xl">
            <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  className="lg:hidden p-2 rounded-xl border border-white/25 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-colors"
                  onClick={openSidebar}
                >
                  <Menu className="h-5 w-5" />
                </button>
                <h1 className="text-sm sm:text-base font-semibold tracking-tight text-emerald-50/95">
                  Dashboard Pemupukan •{" "}
                  <span className="text-emerald-200">Divisi Tanaman</span>
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="gap-2 h-8 px-3 rounded-full border-[--glass-border] bg-white/5 text-emerald-50 hover:bg-white/10 hover:text-emerald-50/90 backdrop-blur-md transition-colors"
                  onClick={openFilter}
                >
                  <FilterIcon className="h-4 w-4" /> Filter
                </Button>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="w-full max-w-6xl mx-auto px-4 lg:px-6 py-5 space-y-6">
            {/* Chips filter aktif */}
            <div className="flex flex-wrap gap-2 text-[11px]">
              {distrik !== "all" && (
                <Badge
                  variant="secondary"
                  className="bg-white/7 border border-white/25 text-emerald-50/95 backdrop-blur-md rounded-full px-2.5 py-1"
                >
                  Distrik: {distrik}
                </Badge>
              )}
              {kebun !== "all" && (
                <Badge
                  variant="secondary"
                  className="bg-white/7 border border-white/25 text-emerald-50/95 backdrop-blur-md rounded-full px-2.5 py-1"
                >
                  Kebun: {KEBUN_LABEL[kebun] ?? kebun}
                </Badge>
              )}
              {kategori !== "all" && (
                <Badge
                  variant="secondary"
                  className="bg-white/7 border border-white/25 text-emerald-50/95 backdrop-blur-md rounded-full px-2.5 py-1"
                >
                  Kategori: {kategori}
                </Badge>
              )}
              {afd !== "all" && (
                <Badge
                  variant="secondary"
                  className="bg-white/7 border border-white/25 text-emerald-50/95 backdrop-blur-md rounded-full px-2.5 py-1"
                >
                  AFD: {afd}
                </Badge>
              )}
              {tt !== "all" && (
                <Badge
                  variant="secondary"
                  className="bg-white/7 border border-white/25 text-emerald-50/95 backdrop-blur-md rounded-full px-2.5 py-1"
                >
                  TT: {tt}
                </Badge>
              )}
              {blok !== "all" && (
                <Badge
                  variant="secondary"
                  className="bg-white/7 border border-white/25 text-emerald-50/95 backdrop-blur-md rounded-full px-2.5 py-1"
                >
                  Blok: {blok}
                </Badge>
              )}
              {jenis !== "all" && (
                <Badge
                  variant="secondary"
                  className="bg-white/7 border border-white/25 text-emerald-50/95 backdrop-blur-md rounded-full px-2.5 py-1"
                >
                  Jenis: {jenis}
                </Badge>
              )}
              {aplikasi !== "all" && (
                <Badge
                  variant="secondary"
                  className="bg-white/7 border border-white/25 text-emerald-50/95 backdrop-blur-md rounded-full px-2.5 py-1"
                >
                  Aplikasi: {aplikasi}
                </Badge>
              )}
              {dataYear && (
                <Badge
                  variant="secondary"
                  className="bg-white/7 border border-white/25 text-emerald-50/95 backdrop-blur-md rounded-full px-2.5 py-1"
                >
                  Tahun: {dataYear}
                </Badge>
              )}
              {dateFrom && (
                <Badge
                  variant="secondary"
                  className="bg-white/7 border border-white/25 text-emerald-50/95 backdrop-blur-md rounded-full px-2.5 py-1"
                >
                  Dari: {dateFrom}
                </Badge>
              )}
              {dateTo && (
                <Badge
                  variant="secondary"
                  className="bg-white/7 border border-white/25 text-emerald-50/95 backdrop-blur-md rounded-full px-2.5 py-1"
                >
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
                  <span className="text-emerald-50/60">
                    Tidak ada filter aktif
                  </span>
                )}
            </div>

            {children}
          </main>
        </div>
      </div>

      {/* Filter Panel */}
      <FilterPanel
        open={filterOpen}
        onClose={closeFilter}
        distrik={distrik}
        setDistrik={setDistrik}
        kebun={kebun}
        setKebun={setKebun}
        kategori={kategori}
        setKategori={setKategori}
        afd={afd}
        setAfd={setAfd}
        tt={tt}
        setTt={setTt}
        blok={blok}
        setBlok={setBlok}
        jenis={jenis}
        setJenis={setJenis}
        jenisOptions={jenisOptions}
        aplikasi={aplikasi}
        setAplikasi={setAplikasi}
        aplikasiOptions={aplikasiOptions}
        dataYear={dataYear}
        setDataYear={setDataYear}
        dataYearOptions={dataYearOptions}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        distrikOptions={distrikOptions}
        kebunOptions={kebunOptions}
        kategoriOptions={kategoriOptions}
        afdOptions={afdOptions}
        ttOptions={ttOptions}
        blokOptions={blokOptions}
        resetFilter={resetFilter}
        metaLoading={metaLoading}
      />
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PemupukanProvider>
      <Frame>{children}</Frame>
    </PemupukanProvider>
  );
}
