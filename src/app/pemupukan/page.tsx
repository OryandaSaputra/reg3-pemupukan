// src/app/pemupukan/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import PemupukanClient, { type SearchParams } from "./PemupukanClient";

export default async function PemupukanPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return <PemupukanClient searchParams={searchParams} />;
}
