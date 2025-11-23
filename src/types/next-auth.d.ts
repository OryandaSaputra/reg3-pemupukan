// src/types/next-auth.d.ts
import type { DefaultSession } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      role?: "admin" | "user";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: "admin" | "user";
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role?: "admin" | "user";
  }
}
