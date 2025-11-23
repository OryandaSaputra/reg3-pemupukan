import { CSSProperties } from "react";
import {
  PTPN_GREEN,
  PTPN_GREEN_BRIGHT,
  PTPN_GREEN_DARK,
  PTPN_ORANGE,
  PTPN_CREAM,
} from "./constants";
import { FertRow } from "./types";

export const sum = (arr: FertRow[], pick: (r: FertRow) => number | undefined) =>
  arr.reduce((a, b) => a + (pick(b) || 0), 0);

export const pctFormatter = (label: unknown) => {
  const n = Number(label);
  return Number.isFinite(n) ? `${n.toFixed(0)}%` : (label as string);
};

export type StyleVars = CSSProperties & {
  ["--ptpn-green"]?: string;
  ["--ptpn-green-dark"]?: string;
  ["--ptpn-green-bright"]?: string;
  ["--ptpn-orange"]?: string;
  ["--ptpn-cream"]?: string;
};

export const createStyleVars = (): StyleVars => ({
  "--ptpn-green": PTPN_GREEN,
  "--ptpn-green-dark": PTPN_GREEN_DARK,
  "--ptpn-green-bright": PTPN_GREEN_BRIGHT,
  "--ptpn-orange": PTPN_ORANGE,
  "--ptpn-cream": PTPN_CREAM,
});
