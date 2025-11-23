// tailwind.config.ts
import type { Config } from "tailwindcss"
import animate from "tailwindcss-animate"

const config: Config = {
  darkMode: "class", // penting untuk toggle Terang/Gelap
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // contoh: kalau mau nambah warna brand sendiri, taruh di sini
      // colors: { brand: { 900: "#0E542A" } }
    },
  },
  plugins: [animate],
}
export default config
