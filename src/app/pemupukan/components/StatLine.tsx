export default function StatLine({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[11px] text-emerald-100/70">
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
