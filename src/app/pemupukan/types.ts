import { PUPUK_KEYS } from "./constants";

export type PupukKey = typeof PUPUK_KEYS[number];

export type FertRow = {
  distrik: "DTM" | "DBR";
  kebun: string;
  tanggal?: string;

  rencana_total: number;
  realisasi_total: number;
  rencana_total_ha?: number;
  realisasi_total_ha?: number;

  tm_rencana?: number;
  tm_realisasi?: number;
  tbm_rencana?: number;
  tbm_realisasi?: number;
  bibitan_rencana?: number;
  bibitan_realisasi?: number;

  wilayah?: "DTM" | "DBR";
  is_dtm?: boolean;
  is_dbr?: boolean;

  rencana_npk?: number; rencana_npk_ha?: number;
  rencana_urea?: number; rencana_urea_ha?: number;
  rencana_tsp?: number; rencana_tsp_ha?: number;
  rencana_mop?: number; rencana_mop_ha?: number;
  rencana_rp?: number; rencana_rp_ha?: number;
  rencana_dolomite?: number; rencana_dolomite_ha?: number;
  rencana_borate?: number; rencana_borate_ha?: number;
  rencana_cuso4?: number; rencana_cuso4_ha?: number;
  rencana_znso4?: number; rencana_znso4_ha?: number;

  real_npk?: number; real_npk_ha?: number;
  real_urea?: number; real_urea_ha?: number;
  real_tsp?: number; real_tsp_ha?: number;
  real_mop?: number; real_mop_ha?: number;
  real_rp?: number; real_rp_ha?: number;
  real_dolomite?: number; real_dolomite_ha?: number;
  real_borate?: number; real_borate_ha?: number;
  real_cuso4?: number; real_cuso4_ha?: number;
  real_znso4?: number; real_znso4_ha?: number;

  stok?: number;
  sisa_kebutuhan?: number;
};
