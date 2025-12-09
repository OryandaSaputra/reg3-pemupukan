"use client";

import React, { type ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

type ProvidersProps = {
  children: ReactNode;
  /**
   * Optional: session dari server (misalnya dari layout root)
   * supaya SessionProvider tidak perlu fetch ulang di client.
   */
  session?: Session | null;
};

export default function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider
      session={session}
      // ⚙️ Matikan refetch on window focus untuk mengurangi request
      // (bisa diubah sesuai kebutuhan auth di project)
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  );
}
