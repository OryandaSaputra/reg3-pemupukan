export default function StatLine({
  label, value, sub,
}: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[11px] text-slate-500 dark:text-slate-400">{label}</span>
      <div className="text-right">
        <div className="text-sm font-semibold">{value}</div>
        {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
      </div>
    </div>
  );
}
