export default function SectionHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {desc && <p className="text-[11px] text-slate-500 dark:text-slate-400">{desc}</p>}
      </div>
    </div>
  );
}
