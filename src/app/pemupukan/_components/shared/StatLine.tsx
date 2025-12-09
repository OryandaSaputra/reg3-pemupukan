import { memo } from "react";

type StatLineProps = {
  label: string;
  value: string | number;
  sub?: string;
};

/**
 * Baris statistik kecil (label di kiri, nilai di kanan).
 * Dibungkus memo agar lebih hemat re-render saat dipakai di list panjang.
 */
function StatLineBase({ label, value, sub }: StatLineProps) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] text-emerald-100/70 truncate">
        {label}
      </span>
      <div className="text-right">
        <div className="text-sm font-semibold text-emerald-50/95">
          {value}
        </div>
        {sub && (
          <div className="text-[10px] text-emerald-100/60">
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

const StatLine = memo(StatLineBase);

export default StatLine;
