"use client";

import React from "react";
import { PemupukanProvider, usePemupukan } from "@/app/pemupukan/context";
import Sidebar from "@/app/pemupukan/components/Sidebar";
import MobileSidebar from "@/app/pemupukan/components/MobileSidebar";
import FilterPanel from "@/app/pemupukan/components/FilterPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter as FilterIcon, Menu } from "lucide-react";
import { createStyleVars } from "@/app/pemupukan/utils";
import { KEBUN_LABEL } from "@/app/pemupukan/constants";

function Frame({ children }: { children: React.ReactNode }) {
  const styleVars = createStyleVars();

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
    resetFilter,
  } = usePemupukan();

  return (
    <div
      className="min-h-screen flex bg-[--ptpn-cream] dark:bg-slate-950 text-slate-900 dark:text-slate-100"
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

      <div className="flex-1 min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-40 bg-white/70 dark:bg-slate-900/70 backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-800"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="text-base font-semibold tracking-tight">
                Dashboard Pemupukan • Divisi Tanaman
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="gap-2 h-8 px-3 border-[--ptpn-green] text-[--ptpn-green] hover:bg-[--ptpn-green]/10"
                onClick={() => setFilterOpen(true)}
              >
                <FilterIcon className="h-4 w-4" /> Filter
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 py-5 space-y-6">
          {/* Chips filter aktif */}
          <div className="flex flex-wrap gap-2 text-[11px]">
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
                <span className="text-slate-400">
                  Tidak ada filter aktif
                </span>
              )}
          </div>

          {children}
        </main>
      </div>

      {/* Filter Panel */}
      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
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
