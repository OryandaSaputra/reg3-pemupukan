import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      className="
        glass-surface rounded-2xl border border-[--glass-border]
        shadow-[0_18px_45px_rgba(3,18,9,0.8)]
        overflow-visible
      "
    >
      <CardHeader
        className="
          pb-2 border-b border-white/10
          flex items-center justify-between
          overflow-visible
        "
      >
        <CardTitle className="text-sm font-semibold text-emerald-50/95 tracking-tight">
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-3 overflow-visible">
        {/* Tidak ada h-64 / min-h besar di sini */}
        <div className="w-full overflow-visible">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
