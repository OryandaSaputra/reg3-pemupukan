// src/server/lib/auth.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";

/**
 * Helper supaya route handler rapi & konsisten.
 */
export async function requireSession() {
  const session = await getServerSession(authOptions);
  return session;
}
