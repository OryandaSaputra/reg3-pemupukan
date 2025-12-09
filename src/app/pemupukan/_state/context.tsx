// src/app/pemupukan/_state/context.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { FertRow } from "../_config/types";
import {
  usePemupukanDerived,
  type TmTableRow,
  type Kategori,
} from "./derive";

/* ======================================================================= */
/* =============================== TYPES ================================= */
/* ======================================================================= */

type PemupukanContextValue = {
  // data
  rows: FertRow[];
  loading: boolean;

  // filters
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
  aplikasi: string;
  setAplikasi: (v: string) => void;

  // Tahun Data (opsional, "" = semua tahun)
  dataYear: string;
  setDataYear: (v: string) => void;

  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;

  resetFilter: () => void;

  // ui
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  navRealOpen: boolean;
  setNavRealOpen: React.Dispatch<React.SetStateAction<boolean>>;
  navRencanaOpen: boolean;
  setNavRencanaOpen: React.Dispatch<React.SetStateAction<boolean>>;
  navStokOpen: boolean;
  setNavStokOpen: React.Dispatch<React.SetStateAction<boolean>>;
  filterOpen: boolean;
  setFilterOpen: (v: boolean) => void;

  // options
  jenisOptions: string[];
  aplikasiOptions: string[];
  distrikOptions: string[];
  kebunOptions: string[];
  kategoriOptions: (Kategori | "all")[];
  afdOptions: string[];
  ttOptions: string[];
  blokOptions: string[];
  dataYearOptions: string[]; // daftar tahun dari DB

  // derived
  filtered: FertRow[];
  totalRencana: number;
  totalRealisasi: number;
  tmRencana: number;
  tmRealisasi: number;
  tbmRencana: number;
  tbmRealisasi: number;
  bibRencana: number;
  bibRealisasi: number;
  dtmRencana: number;
  dbrRencana: number;
  dtmRealisasi: number;
  dbrRealisasi: number;
  bestKebun?: { kebun: string; rencana: number; progress: number };

  pieTotal: { name: string; value: number; labelText: string }[];
  pieTmTbm: { name: string; value: number; labelText: string }[];
  barEfisiensiDistrik: {
    distrik: string;
    progress: number;
    rencana: number;
    realisasi: number;
  }[];
  barPerKebun: {
    kebun: string;
    rencana: number;
    realisasi: number;
    progress: number;
  }[];
  aggPupuk: {
    jenis: string;
    rencana: number;
    realisasi: number;
    rencana_ha: number;
    realisasi_ha: number;
    progress: number;
    share: number;
  }[];
  stokVsSisa: {
    distrik: string;
    stok: number;
    sisa: number;
    stok_pct: number;
    sisa_pct: number;
  }[];

  // tabel TM/TBM/TM&TBM
  tmRows: TmTableRow[];
  tbmRows: TmTableRow[];
  tmTbmRows: TmTableRow[];

  // tanggal header + periode realisasi
  headerDates?: {
    today?: string;
    tomorrow?: string;
    sekarang?: string;
    besok?: string;
  };
  realWindow?: { start?: string; end?: string };
  realCutoffDate?: string;

  // ✅ status loading untuk meta / opsi filter (digunakan FilterPanel)
  metaLoading: boolean;
};

const PemupukanContext = createContext<PemupukanContextValue | null>(null);

/* ======================================================================= */
/* ========================= META CLIENT CACHE =========================== */
/* ======================================================================= */

type MetaResponse = {
  kategori: string[];
  afd: string[];
  tt: string[];
  blok: string[];
  jenis: string[];
  aplikasi?: string[];
  years: string[];
};

type MetaCacheEntry = {
  data: MetaResponse;
  ts: number;
};

const META_CACHE_TTL = 60_000; // 60 detik
const metaCache = new Map<string, MetaCacheEntry>();

function buildMetaKey(distrik: string, kebun: string) {
  const d = distrik && distrik !== "" ? distrik : "all";
  const k = kebun && kebun !== "" ? kebun : "all";
  return `${d}|${k}`;
}

function applyMetaToState(
  data: MetaResponse,
  setKategoriOptionsState: React.Dispatch<
    React.SetStateAction<(Kategori | "all")[]>
  >,
  setAfdOptionsState: React.Dispatch<React.SetStateAction<string[]>>,
  setTtOptionsState: React.Dispatch<React.SetStateAction<string[]>>,
  setBlokOptionsState: React.Dispatch<React.SetStateAction<string[]>>,
  setJenisOptionsState: React.Dispatch<React.SetStateAction<string[]>>,
  setAplikasiOptionsState: React.Dispatch<React.SetStateAction<string[]>>,
  setDataYearOptionsState: React.Dispatch<React.SetStateAction<string[]>>
) {
  const kategoriList: (Kategori | "all")[] = [
    "all",
    ...data.kategori.filter(
      (k): k is Kategori =>
        k === "TM" || k === "TBM" || k === "BIBITAN",
    ),
  ];

  setKategoriOptionsState(kategoriList);
  setAfdOptionsState(data.afd);
  setTtOptionsState(data.tt);
  setBlokOptionsState(data.blok);
  setJenisOptionsState(["all", ...data.jenis]);
  setAplikasiOptionsState(["all", ...(data.aplikasi ?? [])]);
  setDataYearOptionsState(data.years);
}

/* ======================================================================= */
/* =============================== PROVIDER ============================== */
/* ======================================================================= */

type PemupukanProviderProps = {
  children: ReactNode;
};

export function PemupukanProvider({ children }: PemupukanProviderProps) {
  // Saat ini rows & loading belum diisi dari API, jadi cukup konstanta.
  // Kalau nanti ada fetch data, tinggal ganti ke useState/useEffect.
  const rows: FertRow[] = [];
  const loading = true;

  // sidebar & nav
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navRealOpen, setNavRealOpen] = useState(true);
  const [navRencanaOpen, setNavRencanaOpen] = useState(true);
  const [navStokOpen, setNavStokOpen] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  // filters
  const [distrik, setDistrik] = useState<string>("all");
  const [kebun, setKebun] = useState<string>("all");
  const [kategori, setKategori] = useState<Kategori | "all">("all");
  const [afd, setAfd] = useState<string>("all");
  const [tt, setTt] = useState<string>("all");
  const [blok, setBlok] = useState<string>("all");
  const [jenis, setJenis] = useState<string>("all");
  const [aplikasi, setAplikasi] = useState<string>("all");

  // Tahun Data ("" artinya semua tahun)
  const [dataYear, setDataYear] = useState<string>("");

  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // options dinamis dari API (berdasarkan distrik + kebun / global)
  const [kategoriOptionsState, setKategoriOptionsState] = useState<
    (Kategori | "all")[]
  >(["all"]);
  const [afdOptionsState, setAfdOptionsState] = useState<string[]>([]);
  const [ttOptionsState, setTtOptionsState] = useState<string[]>([]);
  const [blokOptionsState, setBlokOptionsState] = useState<string[]>([]);
  const [jenisOptionsState, setJenisOptionsState] = useState<string[]>([
    "all",
  ]);
  const [aplikasiOptionsState, setAplikasiOptionsState] = useState<
    string[]
  >(["all"]);
  const [dataYearOptionsState, setDataYearOptionsState] = useState<
    string[]
  >([]);

  // ✅ loading meta
  const [metaLoading, setMetaLoading] = useState<boolean>(false);

  const derived = usePemupukanDerived(rows, {
    distrik,
    kebun,
    kategori,
    afd,
    tt,
    blok,
    jenis,
    aplikasi,
    dateFrom,
    dateTo,
  });

  /* ======================= FETCH META + CACHE ======================= */

  useEffect(() => {
    const controller = new AbortController();
    const key = buildMetaKey(distrik, kebun);

    async function fetchMeta() {
      try {
        setMetaLoading(true);

        const now = Date.now();

        // 1) cek cache terlebih dahulu
        const cached = metaCache.get(key);
        if (cached && now - cached.ts < META_CACHE_TTL) {
          applyMetaToState(
            cached.data,
            setKategoriOptionsState,
            setAfdOptionsState,
            setTtOptionsState,
            setBlokOptionsState,
            setJenisOptionsState,
            setAplikasiOptionsState,
            setDataYearOptionsState,
          );
          return;
        }

        // 2) tidak ada/expired → fetch ke API
        const params = new URLSearchParams();

        if (distrik && distrik !== "all") {
          params.set("distrik", distrik);
        }
        if (kebun && kebun !== "all") {
          params.set("kebun", kebun);
        }

        const qs = params.toString();
        const res = await fetch(`/api/pemupukan/meta${qs ? `?${qs}` : ""}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          console.error("Gagal mengambil meta pemupukan:", await res.text());
          return; // kalau error, jangan ubah opsi lama
        }

        const data: MetaResponse = await res.json();

        // simpan ke cache
        metaCache.set(key, { data, ts: Date.now() });

        applyMetaToState(
          data,
          setKategoriOptionsState,
          setAfdOptionsState,
          setTtOptionsState,
          setBlokOptionsState,
          setJenisOptionsState,
          setAplikasiOptionsState,
          setDataYearOptionsState,
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        console.error("Error fetch meta:", err);
      } finally {
        setMetaLoading(false);
      }
    }

    fetchMeta();

    return () => {
      controller.abort();
    };
  }, [distrik, kebun]);

  /* =========================== RESET FILTER ========================== */

  const resetFilter = () => {
    setDistrik("all");
    setKebun("all");
    setKategori("all");
    setAfd("all");
    setTt("all");
    setBlok("all");
    setJenis("all");
    setAplikasi("all");
    setDataYear("");
    setDateFrom("");
    setDateTo("");
  };

  /* ============================= VALUE =============================== */

  const value: PemupukanContextValue = {
    rows,
    loading,

    // filters
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
    resetFilter,

    // ui
    sidebarOpen,
    setSidebarOpen,
    navRealOpen,
    setNavRealOpen,
    navRencanaOpen,
    setNavRencanaOpen,
    navStokOpen,
    setNavStokOpen,
    filterOpen,
    setFilterOpen,

    // options
    distrikOptions: derived.distrikOptions,
    kebunOptions: derived.kebunOptions,
    jenisOptions: jenisOptionsState,
    aplikasiOptions: aplikasiOptionsState,
    kategoriOptions: kategoriOptionsState,
    afdOptions: afdOptionsState,
    ttOptions: ttOptionsState,
    blokOptions: blokOptionsState,
    dataYearOptions: dataYearOptionsState,

    // derived
    filtered: derived.filtered,
    totalRencana: derived.totalRencana,
    totalRealisasi: derived.totalRealisasi,
    tmRencana: derived.tmRencana,
    tmRealisasi: derived.tmRealisasi,
    tbmRencana: derived.tbmRencana,
    tbmRealisasi: derived.tbmRealisasi,
    bibRencana: derived.bibRencana,
    bibRealisasi: derived.bibRealisasi,
    dtmRencana: derived.dtmRencana,
    dbrRencana: derived.dbrRencana,
    dtmRealisasi: derived.dtmRealisasi,
    dbrRealisasi: derived.dbrRealisasi,
    bestKebun: derived.bestKebun,

    pieTotal: derived.pieTotal,
    pieTmTbm: derived.pieTmTbm,
    barEfisiensiDistrik: derived.barEfisiensiDistrik,
    barPerKebun: derived.barPerKebun,
    aggPupuk: derived.aggPupuk,
    stokVsSisa: derived.stokVsSisa,

    tmRows: derived.tmRows,
    tbmRows: derived.tbmRows,
    tmTbmRows: derived.tmTbmRows,

    headerDates: derived.headerDates,
    realWindow: derived.realWindow,
    realCutoffDate: derived.realCutoffDate,

    // status meta
    metaLoading,
  };

  return (
    <PemupukanContext.Provider value={value}>
      {children}
    </PemupukanContext.Provider>
  );
}

/* ======================================================================= */
/* =============================== HOOK ================================== */
/* ======================================================================= */

export function usePemupukan() {
  const ctx = useContext(PemupukanContext);
  if (!ctx) {
    throw new Error("usePemupukan must be used within PemupukanProvider");
  }
  return ctx;
}
