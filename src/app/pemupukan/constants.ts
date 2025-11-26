export const KEBUN_LABEL: Record<string, string> = {
  // DTM
  TME: "Tanjung Medan",
  TPU: "Tanah Putih",
  SPA: "Sei Pagar",
  SGH: "Sei Galuh",
  SGO: "Sei Garo",
  LDA: "Lubuk Dalam",
  SBT: "Sei Buatan",
  "AMO-1": "Air Molek- I",
  "AMO-2": "Air Molek- II",
  // DBR
  SKE: "Sei Kencana",
  TER: "Terantam",
  TAN: "Tandun",
  SLI: "Sei Lindai",
  TAM: "Tamora",
  SBL: "Sei Batulangkah",
  SBE: "Sei Berlian",
  SRO: "Sei Rokan",
  SIN: "Sei Intan",
  SSI: "Sei Siasam",
  STA: "Sei Tapung",
};

export const ORDER_DTM = ["TME", "TPU", "SPA", "SGH", "SGO", "LDA", "SBT", "AMO-1", "AMO-2"];
export const ORDER_DBR = ["SKE", "TER", "TAN", "SLI", "TAM", "SBL", "SBE", "SRO", "SIN", "SSI", "STA"];

export const PTPN_GREEN_DARK = "#004D25";
export const PTPN_GREEN = "#006B3F";
export const PTPN_GREEN_BRIGHT = "#00A45A";
export const PTPN_ORANGE = "#F59E0B";
export const PTPN_CREAM = "#FFF7ED";
export const PTPN_INK = "#0B1320";

export const COLOR_PLAN = PTPN_INK;
export const COLOR_REAL = PTPN_GREEN;
export const COLOR_REMAIN = "#E2E8F0";
export const COLOR_TM = PTPN_GREEN_BRIGHT;
export const COLOR_TBM = "#86EFAC";
export const COLOR_STOK = PTPN_GREEN_DARK;
export const COLOR_SISA = PTPN_ORANGE;

export const PUPUK_KEYS = ["npk", "urea", "tsp", "mop", "dolomite", "borate", "cuso4", "znso4"] as const;

export const LABEL_PUPUK = {
  npk: "NPK",
  urea: "Urea",
  tsp: "TSP",
  mop: "MOP",
  dolomite: "Dolomite",
  borate: "Borate",
  cuso4: "CuSO₄",
  znso4: "ZnSO₄",
} as const;
