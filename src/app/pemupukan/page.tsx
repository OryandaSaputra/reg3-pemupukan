// src/app/pemupukan/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import PemupukanClient from "./PemupukanClient";

export default async function PemupukanPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Kalau mau batasi hanya admin:
  // if ((session.user as any).role !== "admin") {
  //   redirect("/login");
  // }

  return <PemupukanClient />;
}
