import { memo, type ReactNode } from "react";

type SectionHeaderProps = {
  title: string;
  desc?: string;
  /**
   * Optional: elemen di sisi kanan header (misal: tombol filter, select, dsb).
   */
  right?: ReactNode;
};

function SectionHeaderBase({ title, desc, right }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-3 mb-2">
      <div className="min-w-0">
        <h2 className="text-sm sm:text-base font-semibold tracking-tight text-emerald-50/95 truncate">
          {title}
        </h2>
        {desc && (
          <p className="text-[11px] text-emerald-100/70 line-clamp-2">
            {desc}
          </p>
        )}
      </div>

      {right && (
        <div className="flex-shrink-0 flex items-center gap-2">
          {right}
        </div>
      )}
    </div>
  );
}

const SectionHeader = memo(SectionHeaderBase);

export default SectionHeader;
