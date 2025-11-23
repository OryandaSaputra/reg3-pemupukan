// src/auth.config.ts
import Credentials from "next-auth/providers/credentials";
import type { NextAuthOptions, User, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Admin Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds): Promise<User | null> {
        const username = creds?.username?.toString() ?? "";
        const password = creds?.password?.toString() ?? "";

        if (
          username === process.env.ADMIN_USERNAME &&
          password === process.env.ADMIN_PASSWORD
        ) {
          const user: User = {
            id: "admin-1",
            // simpan username di name supaya mudah dipakai di UI
            name: username || "Administrator",
            email: null, // tidak dipakai, boleh null
            // role dikenali karena sudah di-augment di .d.ts kamu
            role: "admin",
          };
          return user;
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }): Promise<JWT> {
      if (user?.role) token.role = user.role;
      token.role = token.role ?? "user";
      return token;
    },
    async session({ session, token }): Promise<Session> {
      if (session.user) {
        session.user.role = (token as JWT).role ?? "user";
      }
      return session;
    },
  },
};
