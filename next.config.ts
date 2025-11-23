// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // cara sederhana: pakai "domains"
    domains: [
      "upload.wikimedia.org",
      "www.ptpn4.co.id",
      "ptpn4.co.id",
    ],
    // Atau, kalau mau lebih ketat, gunakan remotePatterns (pilih salah satu, tidak wajib keduanya)
    // remotePatterns: [
    //   { protocol: "https", hostname: "www.ptpn4.co.id" },
    //   { protocol: "https", hostname: "ptpn4.co.id" },
    //   { protocol: "https", hostname: "upload.wikimedia.org" },
    // ],
  },
};

export default nextConfig;
