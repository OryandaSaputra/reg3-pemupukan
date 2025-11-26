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

// Perluasan type FertRow supaya bisa pakai afd/tt/blok/kategori/aplikasiKe (opsional)
type FertRowWithMeta = FertRow & {
  kategori?: Kategori;
  afd?: string;
  tt?: string;
  blok?: string;
  aplikasiKe?: number;
};

// Field real/rencana per aplikasi yang ada di tabel TM
type Apps = {
  rencana_app1?: number;
  rencana_app2?: number;
  rencana_app3?: number;
  real_app1?: number;
  real_app2?: number;
  real_app3?: number;
};

export type Filters = {
  distrik: string;
  kebun: string;
  kategori: Kategori | "all";
  afd: string;
  tt: string;
  blok: string;
  jenis: string;
  aplikasi: string;
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
    aplikasi,
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

  // Opsi aplikasi (1/2/3)
  const aplikasiOptions = useMemo(() => {
    const base = rowsEx.filter(
      (r) =>
        (distrik === "all" || r.distrik === distrik) &&
        (kebun === "all" || r.kebun === kebun)
    );

    const set = new Set<string>();

    base.forEach((r) => {
      if (r.aplikasiKe != null && Number.isFinite(r.aplikasiKe)) {
        set.add(String(r.aplikasiKe)); // "1", "2", "3"
      }
    });

    const arr = Array.from(set).sort((a, b) => Number(a) - Number(b));
    return ["all", ...arr]; // ["all", "1", "2", "3"]
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

      // NOTE:
      // Di level baris, kita TIDAK lagi mem-filter berdasarkan aplikasi,
      // karena data per baris berisi total semua aplikasi (tm_realisasi, realisasi_total, dst).
      // Filter aplikasi dipakai di level agregasi (KPI & tabel) menggunakan Apps.real_appX.
      const passAplikasiBaris = true;

      return (
        passDistrik &&
        passKebun &&
        passKategori &&
        passAfd &&
        passTt &&
        passBlok &&
        passJenis &&
        passAplikasiBaris &&
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

  // ================= HELPER REALISASI BERDASARKAN APLIKASI =================

  // Ambil realisasi TOTAL (semua kategori) per baris sesuai aplikasi yang dipilih
  const pickRealByAplikasi = useCallback(
    (r: FertRowWithMeta): number => {
      const apps = r as unknown as Apps;
      const app1 = apps.real_app1 ?? 0;
      const app2 = apps.real_app2 ?? 0;
      const app3 = apps.real_app3 ?? 0;
      const totalApps = app1 + app2 + app3;

      if (aplikasi === "1") return app1;
      if (aplikasi === "2") return app2;
      if (aplikasi === "3") return app3;

      // "all" → kalau ada breakdown per aplikasi, pakai jumlahnya.
      if (totalApps > 0) return totalApps;

      // fallback ke total asli
      return r.realisasi_total ?? 0;
    },
    [aplikasi]
  );

  // Ambil realisasi TM per baris sesuai aplikasi yang dipilih
  // (pakai proporsi dari breakdown aplikasi terhadap total)
  const pickTmRealByAplikasi = useCallback(
    (r: FertRowWithMeta): number => {
      const baseTm = r.tm_realisasi ?? 0;
      if (!baseTm) return 0;

      const apps = r as unknown as Apps;
      const app1 = apps.real_app1 ?? 0;
      const app2 = apps.real_app2 ?? 0;
      const app3 = apps.real_app3 ?? 0;
      const totalApps = app1 + app2 + app3;

      // kalau tidak ada breakdown aplikasi sama sekali
      if (totalApps <= 0) {
        if (aplikasi === "all" || aplikasi === "") return baseTm;
        return 0;
      }

      if (aplikasi === "1") return (baseTm * app1) / totalApps;
      if (aplikasi === "2") return (baseTm * app2) / totalApps;
      if (aplikasi === "3") return (baseTm * app3) / totalApps;

      // "all"
      return baseTm;
    },
    [aplikasi]
  );

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

  // ================= KPI (VERSI DASAR, SEBELUM OVERRIDE DARI ROW) =================

  const totalRencanaBase = useMemo(
    () => sum(filtered, (r) => r.rencana_total),
    [filtered]
  );

  // TOTAL realisasi mengikuti filter aplikasi
  const totalRealisasiBase = useMemo(
    () =>
      filtered.reduce(
        (acc, r) => acc + pickRealByAplikasi(r as FertRowWithMeta),
        0
      ),
    [filtered, pickRealByAplikasi]
  );

  // const tmRencanaBase = useMemo(
  //   () => sum(filtered, (r) => r.tm_rencana),
  //   [filtered]
  // );

  // TM realisasi mengikuti filter aplikasi
  const tmRealisasiBase = useMemo(
    () =>
      filtered.reduce(
        (acc, r) => acc + pickTmRealByAplikasi(r as FertRowWithMeta),
        0
      ),
    [filtered, pickTmRealByAplikasi]
  );

  // const tbmRencanaBase = useMemo(
  //   () => sum(filtered, (r) => r.tbm_rencana),
  //   [filtered]
  // );
  const tbmRealisasiBase = useMemo(
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

  // DTM/DBR realisasi juga mengikuti filter aplikasi
  const dtmRealisasi = useMemo(
    () =>
      filtered
        .filter(isDTM)
        .reduce(
          (acc, r) => acc + pickRealByAplikasi(r as FertRowWithMeta),
          0
        ),
    [filtered, pickRealByAplikasi]
  );
  const dbrRealisasi = useMemo(
    () =>
      filtered
        .filter(isDBR)
        .reduce(
          (acc, r) => acc + pickRealByAplikasi(r as FertRowWithMeta),
          0
        ),
    [filtered, pickRealByAplikasi]
  );

  // Progress per kebun juga ikut aplikasi
  const kebunProgress = useMemo(
    () =>
      filtered.map((r) => {
        const real = pickRealByAplikasi(r as FertRowWithMeta);
        const ren = r.rencana_total || 0;
        return {
          kebun: r.kebun,
          distrik: r.distrik,
          rencana: ren,
          realisasi: real,
          progress: ren ? (real / ren) * 100 : 0,
        };
      }),
    [filtered, pickRealByAplikasi]
  );

  const bestKebun = useMemo(
    () =>
      [...kebunProgress].sort((a, b) => b.progress - a.progress)[0] ||
      undefined,
    [kebunProgress]
  );

  const pieTotal = useMemo(() => {
    const real = Math.max(0, totalRealisasiBase);
    const sisa = Math.max(0, totalRencanaBase - totalRealisasiBase);
    const sumV = Math.max(1, real + sisa);
    const pct = (v: number) => `${((v / sumV) * 100).toFixed(1)}%`;
    return [
      { name: "Realisasi (Kg)", value: real, labelText: pct(real) },
      { name: "Sisa Rencana (Kg)", value: sisa, labelText: pct(sisa) },
    ];
  }, [totalRencanaBase, totalRealisasiBase]);

  const pieTmTbm = useMemo(() => {
    const tm = Math.max(0, tmRealisasiBase);
    const tbm = Math.max(0, tbmRealisasiBase);
    const sumV = Math.max(1, tm + tbm);
    const pct = (name: string, v: number) =>
      `${name} ${((v / sumV) * 100).toFixed(1)}%`;
    return [
      { name: "TM Realisasi", value: tm, labelText: pct("TM", tm) },
      { name: "TBM Realisasi", value: tbm, labelText: pct("TBM", tbm) },
    ];
  }, [tmRealisasiBase, tbmRealisasiBase]);

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
      curr.realisasi += pickRealByAplikasi(r as FertRowWithMeta);
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
  }, [filtered, pickRealByAplikasi]);

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

        // nilai default: semua aplikasi
        let app1_rencana = g.app1_rencana;
        let app2_rencana = g.app2_rencana;
        let app3_rencana = g.app3_rencana;
        let app1_real = g.app1_real;
        let app2_real = g.app2_real;
        let app3_real = g.app3_real;
        let jumlah_rencana_total = g.jumlah_rencana_total;
        let real_last5_total = g.real_last5_total;

        // kalau user memilih aplikasi tertentu, kita hanya pakai aplikasi itu
        if (aplikasi === "1") {
          app2_rencana = 0;
          app3_rencana = 0;
          app2_real = 0;
          app3_real = 0;
          jumlah_rencana_total = g.app1_rencana;
          real_last5_total = g.app1_real;
        } else if (aplikasi === "2") {
          app1_rencana = 0;
          app3_rencana = 0;
          app1_real = 0;
          app3_real = 0;
          jumlah_rencana_total = g.app2_rencana;
          real_last5_total = g.app2_real;
        } else if (aplikasi === "3") {
          app1_rencana = 0;
          app2_rencana = 0;
          app1_real = 0;
          app2_real = 0;
          jumlah_rencana_total = g.app3_rencana;
          real_last5_total = g.app3_real;
        }
        // kalau "all", biarkan apa adanya (gabungan app1+app2+app3)

        return {
          no: i + 1,
          kebun: k, // pakai kode kebun
          app1_rencana,
          app1_real,
          app1_pct: pct(app1_real, app1_rencana),
          app2_rencana,
          app2_real,
          app2_pct: pct(app2_real, app2_rencana),
          app3_rencana,
          app3_real,
          app3_pct: pct(app3_real, app3_rencana),
          renc_sekarang: g.rencana_today,
          real_sekarang: g.real_today,
          renc_besok: g.rencana_tomorrow,
          jumlah_rencana2025: jumlah_rencana_total,
          jumlah_realSd0710: real_last5_total,
          jumlah_pct: pct(real_last5_total, jumlah_rencana_total),
        };
      });
    },
    [
      filtered,
      todayISO,
      tomorrowISO,
      realStartISO,
      realEndISO,
      limitByPeriod,
      aplikasi,
    ]
  );

  const tmRows = useMemo(() => buildRows("TM"), [buildRows]);
  const tbmRows = useMemo(() => buildRows("TBM"), [buildRows]);
  const tmTbmRows = useMemo(() => buildRows("ALL"), [buildRows]);

  // ================= OVERRIDE KPI UNTUK IKHTISAR (BERDASARKAN ROW) =================
  //
  // Supaya angka di Ikhtisar SELALU SAMA dengan Jumlah TM/TBM di tabel
  // dan otomatis mengikuti filter aplikasi (1 / 2 / 3 / all)

  const sumFromRows = (
    rows: TmTableRow[],
    selector: (r: TmTableRow) => number
  ) => rows.reduce((acc, row) => acc + (selector(row) || 0), 0);

  const tmRencanaKpi = sumFromRows(tmRows, (r) => r.jumlah_rencana2025);
  const tmRealisasiKpi = sumFromRows(tmRows, (r) => r.jumlah_realSd0710);

  const tbmRencanaKpi = sumFromRows(tbmRows, (r) => r.jumlah_rencana2025);
  const tbmRealisasiKpi = sumFromRows(tbmRows, (r) => r.jumlah_realSd0710);

  // Total = TM + TBM + Bibitan (kalau ada)
  const totalRencanaKpi = tmRencanaKpi + tbmRencanaKpi + bibRencana;
  const totalRealisasiKpi = tmRealisasiKpi + tbmRealisasiKpi + bibRealisasi;

  return {
    // options & filtered
    distrikOptions,
    kebunOptions,
    kategoriOptions,
    afdOptions,
    ttOptions,
    blokOptions,
    jenisOptions,
    aplikasiOptions,
    filtered,
    // KPIs (SUDAH DI-OVERRIDE PAKAI ROWS)
    totalRencana: totalRencanaKpi,
    totalRealisasi: totalRealisasiKpi,
    tmRencana: tmRencanaKpi,
    tmRealisasi: tmRealisasiKpi,
    tbmRencana: tbmRencanaKpi,
    tbmRealisasi: tbmRealisasiKpi,
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
