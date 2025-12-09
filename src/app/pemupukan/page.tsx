// src/app/pemupukan/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";

// ⬇️ import default component saja
import PemupukanDashboardPage from "./_components/dashboard/PemupukanDashboardPage";

// ⬇️ type SearchParams diambil dari _services/pemupukanFilters
import type { SearchParams } from "./_services/pemupukanFilters";

// Supaya halaman ini selalu dinamis (tidak di-prerender statis oleh Next)
export const dynamic = "force-dynamic";

type PemupukanPageProps = {
  // Di Next 15, searchParams di Server Component adalah Promise
  searchParams: Promise<SearchParams>;
};

export default async function PemupukanPage({ searchParams }: PemupukanPageProps) {
  // 1. Cek auth dulu — kalau tidak login, langsung redirect tanpa kerja lain
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // 2. Kalau sudah login, baru resolve searchParams
  //    (bisa Promise<SearchParams> ataupun SearchParams biasa)
  const resolvedSearchParams = await searchParams;

  // 3. Kirim object biasa ke PemupukanDashboardPage (Client Component)
  return <PemupukanDashboardPage searchParams={resolvedSearchParams} />;
}
