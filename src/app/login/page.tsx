// src/app/login/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import { redirect } from "next/navigation";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  // Kalau sudah ada session, TIDAK render login, langsung ke dashboard
  if (session) {
    redirect("/pemupukan");
  }

  // Kalau belum login, render halaman login client
  return <LoginClient />;
}
