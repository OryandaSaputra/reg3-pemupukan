// src/app/pemupukan/derive.ts
import { useMemo, useCallback } from "react";
import {
  KEBUN_LABEL,
  ORDER_DTM,
  ORDER_DBR,
  LABEL_PUPUK,
  PUPUK_KEYS,
} from "./constants";
import { FertRow, PupukKey } from "./types";
import { sum } from "./utils";

export type Kategori = "TM" | "TBM" | "BIBITAN";

// Perluasan type FertRow supaya bisa pakai afd/tt/blok/kategori (opsional)
type FertRowWithMeta = FertRow & {
  kategori?: Kategori;
  afd?: string;
  tt?: string;
  blok?: string;
};

export type Filters = {
  distrik: string;
  kebun: string;
  kategori: Kategori | "all";
  afd: string;
  tt: string;
  blok: string;
  jenis: string;
  dateFrom: string;
  dateTo: string;
};

// ---- Baris untuk Tabel TM/TBM/TM&TBM
export type TmTableRow = {
  no?: number;
  kebun: string;
  app1_rencana: number;
  app1_real: number;
  app1_pct: number;
  app2_rencana: number;
  app2_real: number;
  app2_pct: number;
  app3_rencana: number;
  app3_real: number;
  app3_pct: number;
  // Harian
  renc_sekarang: number; // Rencana Hari Ini
  real_sekarang: number; // Realisasi Hari Ini
  renc_besok: number; // Rencana Besok
  // Jumlah
  jumlah_rencana2025: number; // total rencana
  jumlah_realSd0710: number; // total realisasi untuk periode
  jumlah_pct: number;
};

// ==================== HELPER TANGGAL (ASIA/JAKARTA) ====================

const todayISOJakarta = (base = new Date()): string => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(base); // "YYYY-MM-DD"
};

const addDaysJakarta = (iso: string, delta: number): string => {
  // iso: "YYYY-MM-DD"
  const d = new Date(`${iso}T00:00:00+07:00`);
  d.setDate(d.getDate() + delta);
  return todayISOJakarta(d);
};

export function usePemupukanDerived(rows: FertRow[], filters: Filters) {
  const {
    distrik,
    kebun,
    kategori,
    afd,
    tt,
    blok,
    jenis,
    dateFrom,
    dateTo,
  } = filters;

  // Cast sekali di awal supaya bisa pakai field meta opsional
  const rowsEx = rows as FertRowWithMeta[];

  // ================= OPTIONS =================

  // Distrik diambil dari data (fallback: DTM/DBR)
  const distrikOptions = useMemo(() => {
    const ds = Array.from(
      new Set(
        rowsEx
          .map((r) => r.distrik)
          .filter((v): v is "DTM" | "DBR" => !!v)
      )
    ).sort();
    return ds.length ? ds : ["DTM", "DBR"];
  }, [rowsEx]);


  // Kebun sesuai distrik yang dipilih
  const kebunOptions = useMemo(() => {
    if (distrik === "DTM") return ORDER_DTM;
    if (distrik === "DBR") return ORDER_DBR;
    // kalau distrik = "all", tampilkan semua kebun (DTM + DBR)
    return [...ORDER_DTM, ...ORDER_DBR];
  }, [distrik]);

  // Kategori berdasarkan data & kebun yang dipilih
  const kategoriOptions = useMemo<(Kategori | "all")[]>(() => {
    const base = rowsEx.filter(
      (r) =>
        (distrik === "all" || r.distrik === distrik) &&
        (kebun === "all" || r.kebun === kebun)
    );
    const set = new Set<Kategori>();
    base.forEach((r) => {
      if (r.kategori) set.add(r.kategori);
    });
    const arr = Array.from(set).sort();
    return ["all", ...arr];
  }, [rowsEx, distrik, kebun]);

  // AFD, TT, Blok berdasarkan distrik & kebun
  const afdOptions = useMemo(() => {
    const base = rowsEx.filter(
      (r) =>
        (distrik === "all" || r.distrik === distrik) &&
        (kebun === "all" || r.kebun === kebun)
    );
    return Array.from(
      new Set(base.map((r) => r.afd).filter((v): v is string => !!v))
    ).sort();
  }, [rowsEx, distrik, kebun]);

  const ttOptions = useMemo(() => {
    const base = rowsEx.filter(
      (r) =>
        (distrik === "all" || r.distrik === distrik) &&
        (kebun === "all" || r.kebun === kebun)
    );
    return Array.from(
      new Set(base.map((r) => r.tt).filter((v): v is string => !!v))
    ).sort();
  }, [rowsEx, distrik, kebun]);

  const blokOptions = useMemo(() => {
    const base = rowsEx.filter(
      (r) =>
        (distrik === "all" || r.distrik === distrik) &&
        (kebun === "all" || r.kebun === kebun)
    );
    return Array.from(
      new Set(base.map((r) => r.blok).filter((v): v is string => !!v))
    ).sort();
  }, [rowsEx, distrik, kebun]);

  // Jenis pupuk dinamis dari data (berdasarkan distrik & kebun)
  const jenisOptions = useMemo(() => {
    const base = rowsEx.filter(
      (r) =>
        (distrik === "all" || r.distrik === distrik) &&
        (kebun === "all" || r.kebun === kebun)
    );

    const set = new Set<string>();

    base.forEach((r) => {
      const addIf = (label: string, v: number) => {
        if (v > 0) set.add(label);
      };

      const totalNpk = (r.real_npk ?? 0) + (r.rencana_npk ?? 0);
      if (totalNpk > 0) {
        // kalau di data ada NPK, tampilkan kedua formula seperti sebelumnya
        set.add("NPK 13.6.27.4");
        set.add("NPK 12.12.17.2");
      }
      addIf("UREA", (r.real_urea ?? 0) + (r.rencana_urea ?? 0));
      addIf("TSP", (r.real_tsp ?? 0) + (r.rencana_tsp ?? 0));
      addIf("MOP", (r.real_mop ?? 0) + (r.rencana_mop ?? 0));
      addIf("RP", (r.real_rp ?? 0) + (r.rencana_rp ?? 0));
      addIf(
        "DOLOMITE",
        (r.real_dolomite ?? 0) + (r.rencana_dolomite ?? 0)
      );
      addIf(
        "BORATE",
        (r.real_borate ?? 0) + (r.rencana_borate ?? 0)
      );
      addIf("CuSO4", (r.real_cuso4 ?? 0) + (r.rencana_cuso4 ?? 0));
      addIf("ZnSO4", (r.real_znso4 ?? 0) + (r.rencana_znso4 ?? 0));
    });

    const arr = Array.from(set).sort();
    return ["all", ...arr];
  }, [rowsEx, distrik, kebun]);

  // ================= FILTERED ROWS =================

  const filtered = useMemo(() => {
    return rowsEx.filter((r) => {
      const passDistrik = distrik === "all" || r.distrik === distrik;
      const passKebun = kebun === "all" || r.kebun === kebun;

      const passKategori =
        kategori === "all" || (r.kategori && r.kategori === kategori);

      const passAfd = afd === "all" || afd === "" || r.afd === afd;
      const passTt = tt === "all" || tt === "" || r.tt === tt;
      const passBlok =
        blok === "all" || blok === "" || r.blok === blok.toUpperCase();

      const passJenis =
        jenis === "all"
          ? true
          : (() => {
            const j = jenis.toUpperCase();
            const jumlahPerJenis: Record<string, number> = {
              "NPK 13.6.27.4":
                (r.real_npk ?? 0) + (r.rencana_npk ?? 0),
              "NPK 12.12.17.2":
                (r.real_npk ?? 0) + (r.rencana_npk ?? 0),
              UREA: (r.real_urea ?? 0) + (r.rencana_urea ?? 0),
              TSP: (r.real_tsp ?? 0) + (r.rencana_tsp ?? 0),
              MOP: (r.real_mop ?? 0) + (r.rencana_mop ?? 0),
              RP: (r.real_rp ?? 0) + (r.rencana_rp ?? 0),
              DOLOMITE:
                (r.real_dolomite ?? 0) + (r.rencana_dolomite ?? 0),
              BORATE:
                (r.real_borate ?? 0) + (r.rencana_borate ?? 0),
              CUSO4:
                (r.real_cuso4 ?? 0) + (r.rencana_cuso4 ?? 0),
              ZNSO4:
                (r.real_znso4 ?? 0) + (r.rencana_znso4 ?? 0),
            };
            const totalJenis = jumlahPerJenis[j] ?? 0;
            return totalJenis > 0;
          })();

      const passDate = (() => {
        if (!r.tanggal) {
          // kalau user pakai filter tanggal, baris tanpa tanggal di-skip
          if (dateFrom || dateTo) return false;
          return true;
        }

        const t = r.tanggal; // "YYYY-MM-DD"
        const hasDateRange = !!dateFrom || !!dateTo;

        if (hasDateRange) {
          const geFrom = !dateFrom || t >= dateFrom;
          const leTo = !dateTo || t <= dateTo;
          return geFrom && leTo;
        }

        return true;
      })();

      return (
        passDistrik &&
        passKebun &&
        passKategori &&
        passAfd &&
        passTt &&
        passBlok &&
        passJenis &&
        passDate
      );
    });
  }, [
    rowsEx,
    distrik,
    kebun,
    kategori,
    afd,
    tt,
    blok,
    jenis,
    dateFrom,
    dateTo,
  ]);

  // ================= PERIODE REALISASI (berdasarkan data TERFILTER) =================

  // Hanya kalau user pilih dateFrom/dateTo kita batasi perhitungan realisasi.
  const hasDateRange = !!dateFrom || !!dateTo;
  const limitByPeriod = hasDateRange;

  const { realStartISO, realEndISO } = useMemo(() => {
    // ambil semua tanggal dari DATA YANG SUDAH TERFILTER (sudah kena distrik, kebun, dll.)
    const dates = filtered
      .map((r) => r.tanggal)
      .filter((v): v is string => !!v)
      .sort();

    const today = todayISOJakarta();

    if (!dates.length) {
      // kalau tidak ada tanggal sama sekali → pakai hari ini
      return { realStartISO: today, realEndISO: today };
    }

    let start = dates[0]; // tanggal paling kecil
    let end = dates[dates.length - 1]; // tanggal paling besar

    // Jika user pilih dateFrom/dateTo, override pakai range yang diminta
    if (hasDateRange) {
      if (dateFrom) start = dateFrom;
      if (dateTo) end = dateTo;
    }

    return { realStartISO: start, realEndISO: end };
  }, [filtered, hasDateRange, dateFrom, dateTo]);

  // ================= KPI =================

  const totalRencana = useMemo(
    () => sum(filtered, (r) => r.rencana_total),
    [filtered]
  );
  const totalRealisasi = useMemo(
    () => sum(filtered, (r) => r.realisasi_total),
    [filtered]
  );

  const tmRencana = useMemo(
    () => sum(filtered, (r) => r.tm_rencana),
    [filtered]
  );
  const tmRealisasi = useMemo(
    () => sum(filtered, (r) => r.tm_realisasi),
    [filtered]
  );

  const tbmRencana = useMemo(
    () => sum(filtered, (r) => r.tbm_rencana),
    [filtered]
  );
  const tbmRealisasi = useMemo(
    () => sum(filtered, (r) => r.tbm_realisasi),
    [filtered]
  );

  const bibRencana = useMemo(
    () => sum(filtered, (r) => r.bibitan_rencana),
    [filtered]
  );
  const bibRealisasi = useMemo(
    () => sum(filtered, (r) => r.bibitan_realisasi),
    [filtered]
  );

  const isDTM = (r: FertRowWithMeta) =>
    r.distrik === "DTM" || r.is_dtm || r.wilayah === "DTM";
  const isDBR = (r: FertRowWithMeta) =>
    r.distrik === "DBR" || r.is_dbr || r.wilayah === "DBR";

  const dtmRencana = useMemo(
    () => sum(filtered.filter(isDTM), (r) => r.rencana_total),
    [filtered]
  );
  const dbrRencana = useMemo(
    () => sum(filtered.filter(isDBR), (r) => r.rencana_total),
    [filtered]
  );
  const dtmRealisasi = useMemo(
    () => sum(filtered.filter(isDTM), (r) => r.realisasi_total),
    [filtered]
  );
  const dbrRealisasi = useMemo(
    () => sum(filtered.filter(isDBR), (r) => r.realisasi_total),
    [filtered]
  );

  const kebunProgress = useMemo(
    () =>
      filtered.map((r) => ({
        kebun: r.kebun,
        distrik: r.distrik,
        rencana: r.rencana_total || 0,
        realisasi: r.realisasi_total || 0,
        progress: r.rencana_total
          ? (r.realisasi_total / r.rencana_total) * 100
          : 0,
      })),
    [filtered]
  );

  const bestKebun = useMemo(
    () =>
      [...kebunProgress].sort((a, b) => b.progress - a.progress)[0] ||
      undefined,
    [kebunProgress]
  );

  const pieTotal = useMemo(() => {
    const real = Math.max(0, totalRealisasi);
    const sisa = Math.max(0, totalRencana - totalRealisasi);
    const sumV = Math.max(1, real + sisa);
    const pct = (v: number) => `${((v / sumV) * 100).toFixed(1)}%`;
    return [
      { name: "Realisasi (Kg)", value: real, labelText: pct(real) },
      { name: "Sisa Rencana (Kg)", value: sisa, labelText: pct(sisa) },
    ];
  }, [totalRencana, totalRealisasi]);

  const pieTmTbm = useMemo(() => {
    const tm = Math.max(0, tmRealisasi);
    const tbm = Math.max(0, tbmRealisasi);
    const sumV = Math.max(1, tm + tbm);
    const pct = (name: string, v: number) =>
      `${name} ${((v / sumV) * 100).toFixed(1)}%`;
    return [
      { name: "TM Realisasi", value: tm, labelText: pct("TM", tm) },
      { name: "TBM Realisasi", value: tbm, labelText: pct("TBM", tbm) },
    ];
  }, [tmRealisasi, tbmRealisasi]);

  const barPerKebun = useMemo(
    () =>
      [...kebunProgress].sort((a, b) => b.rencana - a.rencana).slice(0, 20),
    [kebunProgress]
  );

  const barEfisiensiDistrik = useMemo(() => {
    const byDistrik = new Map<
      string,
      { rencana: number; realisasi: number }
    >();
    filtered.forEach((r) => {
      const key = r.distrik || "-";
      const curr = byDistrik.get(key) || { rencana: 0, realisasi: 0 };
      curr.rencana += r.rencana_total || 0;
      curr.realisasi += r.realisasi_total || 0;
      byDistrik.set(key, curr);
    });
    return Array.from(byDistrik.entries())
      .map(([d, v]) => ({
        distrik: d,
        progress: v.rencana ? (v.realisasi / v.rencana) * 100 : 0,
        rencana: v.rencana,
        realisasi: v.realisasi,
      }))
      .sort((a, b) => b.progress - a.progress);
  }, [filtered]);

  // ================= AGG PUPUK =================

  const aggPupuk = useMemo(() => {
    const initPair = () => ({ rencana: 0, real: 0 });

    const totalsKg: Record<PupukKey, { rencana: number; real: number }> = {
      npk: initPair(),
      urea: initPair(),
      tsp: initPair(),
      mop: initPair(),
      dolomite: initPair(),
      borate: initPair(),
      cuso4: initPair(),
      znso4: initPair(),
    };

    const totalsHa: Record<PupukKey, { rencana: number; real: number }> = {
      npk: initPair(),
      urea: initPair(),
      tsp: initPair(),
      mop: initPair(),
      dolomite: initPair(),
      borate: initPair(),
      cuso4: initPair(),
      znso4: initPair(),
    };

    filtered.forEach((r) => {
      totalsKg.npk.rencana += r.rencana_npk ?? 0;
      totalsKg.npk.real += r.real_npk ?? 0;
      totalsKg.urea.rencana += r.rencana_urea ?? 0;
      totalsKg.urea.real += r.real_urea ?? 0;
      totalsKg.tsp.rencana += r.rencana_tsp ?? 0;
      totalsKg.tsp.real += r.real_tsp ?? 0;
      totalsKg.mop.rencana += r.rencana_mop ?? 0;
      totalsKg.mop.real += r.real_mop ?? 0;
      totalsKg.dolomite.rencana += r.rencana_dolomite ?? 0;
      totalsKg.dolomite.real += r.real_dolomite ?? 0;
      totalsKg.borate.rencana += r.rencana_borate ?? 0;
      totalsKg.borate.real += r.real_borate ?? 0;
      totalsKg.cuso4.rencana += r.rencana_cuso4 ?? 0;
      totalsKg.cuso4.real += r.real_cuso4 ?? 0;
      totalsKg.znso4.rencana += r.rencana_znso4 ?? 0;
      totalsKg.znso4.real += r.real_znso4 ?? 0;

      totalsHa.npk.rencana += r.rencana_npk_ha ?? 0;
      totalsHa.npk.real += r.real_npk_ha ?? 0;
      totalsHa.urea.rencana += r.rencana_urea_ha ?? 0;
      totalsHa.urea.real += r.real_urea_ha ?? 0;
      totalsHa.tsp.rencana += r.rencana_tsp_ha ?? 0;
      totalsHa.tsp.real += r.real_tsp_ha ?? 0;
      totalsHa.mop.rencana += r.rencana_mop_ha ?? 0;
      totalsHa.mop.real += r.real_mop_ha ?? 0;
      totalsHa.dolomite.rencana += r.rencana_dolomite_ha ?? 0;
      totalsHa.dolomite.real += r.real_dolomite_ha ?? 0;
      totalsHa.borate.rencana += r.rencana_borate_ha ?? 0;
      totalsHa.borate.real += r.real_borate_ha ?? 0;
      totalsHa.cuso4.rencana += r.rencana_cuso4_ha ?? 0;
      totalsHa.cuso4.real += r.real_cuso4_ha ?? 0;
      totalsHa.znso4.rencana += r.rencana_znso4_ha ?? 0;
      totalsHa.znso4.real += r.real_znso4_ha ?? 0;
    });

    const totalRealKg =
      PUPUK_KEYS.reduce((acc, key) => acc + totalsKg[key].real, 0) || 1;

    return PUPUK_KEYS.map((key) => ({
      jenis: LABEL_PUPUK[key],
      rencana: totalsKg[key].rencana,
      realisasi: totalsKg[key].real,
      rencana_ha: totalsHa[key].rencana,
      realisasi_ha: totalsHa[key].real,
      progress: totalsKg[key].rencana
        ? (totalsKg[key].real / totalsKg[key].rencana) * 100
        : 0,
      share: (totalsKg[key].real / totalRealKg) * 100,
    }));
  }, [filtered]);

  // ================= STOK vs SISA =================

  const stokVsSisa = useMemo(() => {
    const byDistrik = new Map<string, { stok: number; sisa: number }>();
    filtered.forEach((r) => {
      const d = r.distrik || "-";
      const curr = byDistrik.get(d) || { stok: 0, sisa: 0 };
      curr.stok += r.stok || 0;
      curr.sisa += r.sisa_kebutuhan || 0;
      byDistrik.set(d, curr);
    });
    return Array.from(byDistrik.entries())
      .map(([d, v]) => {
        const total = Math.max(1, v.stok + v.sisa);
        return {
          distrik: d,
          stok: v.stok,
          sisa: v.sisa,
          stok_pct: (v.stok / total) * 100,
          sisa_pct: (v.sisa / total) * 100,
        };
      })
      .filter((x) => x.stok > 0 || x.sisa > 0);
  }, [filtered]);

  // ==================== TANGGAL UNTUK TABEL TM/TBM/TM&TBM ====================

  const todayISO = todayISOJakarta();
  const tomorrowISO = addDaysJakarta(todayISO, 1);

  // =============== DEBUG: hanya kalau limitByPeriod = true ==============

  if (process.env.NODE_ENV !== "production" && limitByPeriod) {
    const debugRows = filtered.filter(
      (r) =>
        r.tanggal &&
        (!realStartISO || r.tanggal >= realStartISO) &&
        (!realEndISO || r.tanggal <= realEndISO)
    );

    if (debugRows.length > 0) {
      console.groupCollapsed(
        "[Pemupukan] DEBUG Realisasi Periode",
        `window: ${realStartISO} s.d. ${realEndISO}`
      );
      console.table(
        debugRows.map((r) => ({
          tanggal: r.tanggal,
          kebun: r.kebun,
          tm_realisasi: r.tm_realisasi ?? 0,
          tbm_realisasi: r.tbm_realisasi ?? 0,
          real_total: r.realisasi_total ?? 0,
        }))
      );
      console.groupEnd();
    } else {
      console.info(
        "[Pemupukan] DEBUG Realisasi Periode: tidak ada baris dalam window ini",
        `window: ${realStartISO} s.d. ${realEndISO}`
      );
    }
  }

  // ==================== TABEL TM/TBM/TM&TBM ====================

  type Agg = {
    app1_rencana: number;
    app2_rencana: number;
    app3_rencana: number;
    app1_real: number;
    app2_real: number;
    app3_real: number;
    rencana_today: number;
    real_today: number;
    rencana_tomorrow: number;
    jumlah_rencana_total: number;
    real_last5_total: number; // total realisasi (per periode / semua)
  };

  type Apps = {
    rencana_app1?: number;
    rencana_app2?: number;
    rencana_app3?: number;
    real_app1?: number;
    real_app2?: number;
    real_app3?: number;
  };

  type Mode = "TM" | "TBM" | "ALL";

  const buildRows = useCallback(
    (mode: Mode): TmTableRow[] => {
      const by = new Map<string, Agg>();

      const ensure = (k: string): Agg => {
        const v = by.get(k);
        if (v) return v;
        const initAgg: Agg = {
          app1_rencana: 0,
          app2_rencana: 0,
          app3_rencana: 0,
          app1_real: 0,
          app2_real: 0,
          app3_real: 0,
          rencana_today: 0,
          real_today: 0,
          rencana_tomorrow: 0,
          jumlah_rencana_total: 0,
          real_last5_total: 0,
        };
        by.set(k, initAgg);
        return initAgg;
      };

      filtered.forEach((r) => {
        const g = ensure(r.kebun);

        let renBase = 0;
        let realBase = 0;
        if (mode === "TM") {
          renBase = r.tm_rencana ?? 0;
          realBase = r.tm_realisasi ?? 0;
        } else if (mode === "TBM") {
          renBase = r.tbm_rencana ?? 0;
          realBase = r.tbm_realisasi ?? 0;
        } else {
          renBase =
            r.rencana_total ?? (r.tm_rencana ?? 0) + (r.tbm_rencana ?? 0);
          realBase =
            r.realisasi_total ??
            (r.tm_realisasi ?? 0) + (r.tbm_realisasi ?? 0);
        }

        g.jumlah_rencana_total += renBase;

        const apps: Apps = r as unknown as Apps;

        // Realisasi periode:
        // - kalau user pilih dateFrom/dateTo → batasi realStartISO–realEndISO
        // - kalau tidak, ambil semua realisasi (jumlah seluruh tabel terfilter)
        if (limitByPeriod) {
          if (
            r.tanggal &&
            (!realStartISO || r.tanggal >= realStartISO) &&
            (!realEndISO || r.tanggal <= realEndISO)
          ) {
            g.real_last5_total += realBase;
            g.app1_real += apps.real_app1 ?? 0;
            g.app2_real += apps.real_app2 ?? 0;
            g.app3_real += apps.real_app3 ?? 0;
          }
        } else {
          g.real_last5_total += realBase;
          g.app1_real += apps.real_app1 ?? 0;
          g.app2_real += apps.real_app2 ?? 0;
          g.app3_real += apps.real_app3 ?? 0;
        }

        // Harian (hari ini & besok) tetap pakai tanggal hari ini / besok
        if (r.tanggal === todayISO) {
          g.rencana_today += renBase;
          g.real_today += realBase;
        }
        if (r.tanggal === tomorrowISO) {
          g.rencana_tomorrow += renBase;
        }

        // Rencana per aplikasi
        g.app1_rencana += apps.rencana_app1 ?? 0;
        g.app2_rencana += apps.rencana_app2 ?? 0;
        g.app3_rencana += apps.rencana_app3 ?? 0;
      });

      const split3 = (total: number) => {
        const raw = [0.4 * total, 0.35 * total, 0.25 * total];
        const a1 = Math.round(raw[0]);
        const a2 = Math.round(raw[1]);
        const a3 = Math.max(0, Math.round(total - a1 - a2));
        return [a1, a2, a3] as const;
      };

      by.forEach((g) => {
        const hasRenApps =
          g.app1_rencana + g.app2_rencana + g.app3_rencana > 0;

        // Kalau rencana per aplikasi belum diisi, bagi otomatis dari total rencana
        if (!hasRenApps && g.jumlah_rencana_total > 0) {
          const [a1, a2, a3] = split3(g.jumlah_rencana_total);
          g.app1_rencana = a1;
          g.app2_rencana = a2;
          g.app3_rencana = a3;
        }

        // REAL per aplikasi sudah diisi di atas (tidak dibagi otomatis).
      });

      const pct = (real: number, ren: number) =>
        ren > 0 ? (real / ren) * 100 : 0;

      const orderMap = new Map<string, number>();
      ORDER_DTM.forEach((k, i) => orderMap.set(k, i));
      const baseIndex = ORDER_DTM.length;
      ORDER_DBR.forEach((k, i) => orderMap.set(k, baseIndex + i));

      const keys = Array.from(by.keys()).sort((a, b) => {
        const ia = orderMap.get(a);
        const ib = orderMap.get(b);
        if (ia != null && ib != null) return ia - ib;
        const la = KEBUN_LABEL[a] ?? a;
        const lb = KEBUN_LABEL[b] ?? b;
        return la.localeCompare(lb);
      });

      return keys.map((k, i) => {
        const g = by.get(k)!;
        return {
          no: i + 1,
          kebun: KEBUN_LABEL[k] ?? k,
          app1_rencana: g.app1_rencana,
          app1_real: g.app1_real,
          app1_pct: pct(g.app1_real, g.app1_rencana),
          app2_rencana: g.app2_rencana,
          app2_real: g.app2_real,
          app2_pct: pct(g.app2_real, g.app2_rencana),
          app3_rencana: g.app3_rencana,
          app3_real: g.app3_real,
          app3_pct: pct(g.app3_real, g.app3_rencana),
          renc_sekarang: g.rencana_today,
          real_sekarang: g.real_today,
          renc_besok: g.rencana_tomorrow,
          jumlah_rencana2025: g.jumlah_rencana_total,
          jumlah_realSd0710: g.real_last5_total,
          jumlah_pct: pct(g.real_last5_total, g.jumlah_rencana_total),
        };
      });
    },
    [filtered, todayISO, tomorrowISO, realStartISO, realEndISO, limitByPeriod]
  );

  const tmRows = useMemo(() => buildRows("TM"), [buildRows]);
  const tbmRows = useMemo(() => buildRows("TBM"), [buildRows]);
  const tmTbmRows = useMemo(() => buildRows("ALL"), [buildRows]);

  return {
    // options & filtered
    distrikOptions,
    kebunOptions,
    kategoriOptions,
    afdOptions,
    ttOptions,
    blokOptions,
    jenisOptions,
    filtered,
    // KPIs
    totalRencana,
    totalRealisasi,
    tmRencana,
    tmRealisasi,
    tbmRencana,
    tbmRealisasi,
    bibRencana,
    bibRealisasi,
    dtmRencana,
    dbrRencana,
    dtmRealisasi,
    dbrRealisasi,
    // charts & helpers
    kebunProgress,
    bestKebun,
    pieTotal,
    pieTmTbm,
    barPerKebun,
    barEfisiensiDistrik,
    aggPupuk,
    stokVsSisa,
    // tabel TM/TBM/TM&TBM + info tanggal header
    tmRows,
    tbmRows,
    tmTbmRows,
    headerDates: { sekarang: todayISO, besok: tomorrowISO },
    realCutoffDate: realEndISO,
    realWindow: { start: realStartISO, end: realEndISO },
    ORDER_DTM,
    ORDER_DBR,
  };
}
