// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const isHome = pathname === "/";
  const isLoginPage = pathname === "/login";
  const isPemupukanRoute = pathname.startsWith("/pemupukan");
  const isCurahHujanApi = pathname.startsWith("/api/curah-hujan");

  const token = await getToken({
    req,
    ...(NEXTAUTH_SECRET && { secret: NEXTAUTH_SECRET }),
  });

  const isAuthenticated = !!token;

  // 0) Proteksi API: kalau belum login, balas 401 JSON (bukan redirect)
  if (isCurahHujanApi && !isAuthenticated) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 }
    );
  }

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/pemupukan/:path*", "/api/curah-hujan/:path*"],
};
