export default function SectionHeader({
  title,
  desc,
}: {
  title: string;
  desc?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-2">
      <div>
        <h2 className="text-sm sm:text-base font-semibold tracking-tight text-emerald-50/95">
          {title}
        </h2>
        {desc && (
          <p className="text-[11px] text-emerald-100/70">
            {desc}
          </p>
        )}
      </div>
    </div>
  );
}
