import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ChartCardProps = {
  title: string;
  /**
   * Optional: teks kecil di bawah title (misalnya deskripsi singkat).
   */
  subtitle?: string;
  /**
   * Optional: elemen di sisi kanan header (misal: badge, toggle, dropdown, dsb).
   */
  headerRight?: ReactNode;
  children: ReactNode;
  /**
   * Optional: tambahan className kalau butuh custom styling dari luar.
   */
  className?: string;
};

export default function ChartCard({
  title,
  subtitle,
  headerRight,
  children,
  className,
}: ChartCardProps) {
  return (
    <Card
      className={`
        glass-surface rounded-2xl border border-[--glass-border]
        shadow-[0_18px_45px_rgba(3,18,9,0.8)]
        overflow-visible
        ${className ?? ""}
      `}
    >
      <CardHeader
        className="
          pb-2 border-b border-white/10
          flex items-center justify-between gap-3
          overflow-visible
        "
      >
        <div className="min-w-0">
          <CardTitle className="text-sm font-semibold text-emerald-50/95 tracking-tight truncate">
            {title}
          </CardTitle>
          {subtitle && (
            <p className="mt-0.5 text-[11px] text-emerald-100/70 line-clamp-2">
              {subtitle}
            </p>
          )}
        </div>

        {headerRight && (
          <div className="flex-shrink-0 flex items-center gap-2">
            {headerRight}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-3 overflow-visible">
        {/* Container fleksibel, tidak mengunci tinggi chart */}
        <div className="w-full overflow-visible">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
