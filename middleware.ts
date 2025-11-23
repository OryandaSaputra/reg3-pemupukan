// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isPemupukanRoute = pathname.startsWith("/pemupukan");
  const isLoginPage = pathname === "/login";

  // Ambil token session dari NextAuth
  const token = await getToken({
    req,
  });

  const isAuthenticated = !!token;

  // 1) Kalau belum login dan mau masuk ke /pemupukan → redirect ke /login
  if (isPemupukanRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    // optional: simpan callbackUrl supaya bisa balik ke halaman semula
    loginUrl.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  // 2) Kalau SUDAH login dan masih ke /login → lempar ke /pemupukan
  if (isLoginPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/pemupukan", req.url));
  }

  // 3) Selain itu, lanjutkan saja
  return NextResponse.next();
}

export const config = {
  // Middleware ini hanya jalan di:
  matcher: [
    "/pemupukan/:path*", // semua halaman di bawah /pemupukan
    "/login",            // plus halaman login (untuk redirect kalau sudah login)
  ],
};
