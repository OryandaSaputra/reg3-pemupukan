// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const isHome = pathname === "/";
  const isLoginPage = pathname === "/login";
  const isPemupukanRoute = pathname.startsWith("/pemupukan");

  // Ambil token session dari NextAuth (JWT di cookie)
  const token = await getToken({ req });
  const isAuthenticated = !!token;

  // 1) Akses "/" → arahkan ke login atau dashboard
  if (isHome) {
    const target = isAuthenticated ? "/pemupukan" : "/login";
    return NextResponse.redirect(new URL(target, req.url));
  }

  // 2) Belum login tapi akses /pemupukan/* → paksa ke /login
  if (isPemupukanRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  // 3) Sudah login tapi masih ke /login → lempar ke /pemupukan
  if (isLoginPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/pemupukan", req.url));
  }

  // 4) Selain itu lanjut
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/pemupukan/:path*"],
};
