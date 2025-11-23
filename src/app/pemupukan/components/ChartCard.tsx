import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-800">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* ⬇️ JANGAN pakai h-64 / h-72. Pakai min-h atau biarkan auto */}
        <div className="w-full min-h-[260px] overflow-visible">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
