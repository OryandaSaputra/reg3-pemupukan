// src/auth.config.ts
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions, User, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { timingSafeEqual } from "crypto";

// Helper kecil untuk perbandingan string yang lebih aman
function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);

  if (aBuf.length !== bBuf.length) {
    return false;
  }

  return timingSafeEqual(aBuf, bBuf);
}

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

// Optional: bisa bantu debug kalau env lupa diset (tidak di-throw supaya build tetap jalan)
if (process.env.NODE_ENV === "development") {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    console.warn(
      "[auth.config] ADMIN_USERNAME / ADMIN_PASSWORD belum diset di .env"
    );
  }
  if (!NEXTAUTH_SECRET) {
    console.warn(
      "[auth.config] NEXTAUTH_SECRET belum diset. NextAuth akan coba pakai default, tetapi disarankan eksplisit."
    );
  }
}

export const authOptions: NextAuthOptions = {
  // Pakai JWT supaya stateless (cocok dengan App Router & middleware)
  session: { strategy: "jwt" },

  // Sekedar memperjelas (NextAuth sebenarnya otomatis baca NEXTAUTH_SECRET)
  ...(NEXTAUTH_SECRET && { secret: NEXTAUTH_SECRET }),

  providers: [
    CredentialsProvider({
      name: "Admin Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<User | null> {
        const username = credentials?.username?.toString().trim() ?? "";
        const password = credentials?.password?.toString() ?? "";

        // Kalau env belum diset → tidak perlu cek panjang string lagi
        if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
          return null;
        }

        const isUserMatch = safeCompare(username, ADMIN_USERNAME);
        const isPassMatch = safeCompare(password, ADMIN_PASSWORD);

        if (isUserMatch && isPassMatch) {
          const user: User = {
            id: "admin-1",
            name: username || "Administrator",
            email: null, // tidak dipakai
            role: "admin", // sudah di-augment di next-auth.d.ts
          };

          return user;
        }

        // null → NextAuth akan throw CredentialsSignin error
        return null;
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },

  callbacks: {
    // Dipanggil setiap kali JWT dibuat/diupdate
    async jwt({ token, user }): Promise<JWT> {
      // Saat login pertama, 'user' berisi data dari authorize()
      if (user?.role) {
        token.role = user.role;
      }

      // Default role "user" kalau belum ada
      if (!token.role) {
        token.role = "user";
      }

      return token;
    },

    // Dipanggil setiap kali session diambil di client (useSession / getServerSession)
    async session({ session, token }): Promise<Session> {
      if (session.user) {
        session.user.role = (token as JWT).role ?? "user";
      }

      return session;
    },
  },
};
