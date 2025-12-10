// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/auth.config";

// Satu handler untuk GET & POST (NextAuth akan handle rute /api/auth/*)
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
