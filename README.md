
# 📊 **Dashboard Pemupukan – PTPN4**
_Advanced Monitoring, Planning & Execution System for Fertilizer Application_

Dashboard Pemupukan adalah sistem internal Bagian Tanaman pada Sub Divisi Pemupukan berbasis **Next.js App Router**, **Prisma ORM**, dan **PostgreSQL** yang dirancang untuk mendukung proses **perencanaan**, **pengawasan**, dan **analisis realisasi pemupukan** secara komprehensif pada seluruh unit Distrik dan Kebun PTPN IV REGIONAL III.

Repositori ini mencakup:
- Dashboard visual analitik,
- Manajemen rencana & realisasi,
- Filtering spasial bertingkat,
- Sistem tahun data (auto-detected),
- API terstruktur,
- Arsitektur modular,
- Dokumentasi lengkap.

---

# 📦 1. Teknologi Utama

| Teknologi | Fungsi |
|----------|--------|
| **Next.js 14 (App Router)** | Framework utama high performance |
| **React Server Components** | Render cepat & efisien |
| **TypeScript** | Static typing & safety |
| **Prisma ORM** | ORM untuk PostgreSQL |
| **PostgreSQL** | Database utama |
| **NextAuth.js** | Login & session |
| **TailwindCSS** | Utility-first styling |
| **Shadcn/UI** | Komponen UI enterprise |
| **Recharts / Chart.js** | Visualisasi grafik |
| **Zod** | Validasi data |

---

# 🚀 2. Fitur Lengkap

## 🔹 2.1 Dashboard Interaktif
- Ringkasan **Total Rencana & Realisasi**
- Progress per kategori: **TM, TBM, BIBITAN**
- Grafik dosis pemupukan
- Grafik realisasi harian
- Agregasi INV
- Perbandingan rencana vs realisasi

## 🔹 2.2 Filtering Kuat & Hierarkis
- Distrik → Kebun → AFD → TT → Blok  
- Jenis pupuk  
- Aplikasi ke-1 / 2 / 3  
- **Filter Tahun Data (auto detection)**  
- Manual date-range filtering  
- Kombinasi multi-filter tanpa konflik  

## 🔹 2.3 Manajemen Data Lengkap
- Upload rencana (CSV/XLSX ready)
- Tambah data rencana
- Edit data rencana
- Tambah realisasi harian
- History aktivitas blok
- Validasi data otomatis

## 🔹 2.4 Backend & Kinerja
- Query kompleks menggunakan Prisma
- Caching menggunakan:

```
unstable_cache()
```

- Penggunaan dynamic import pada chart
- Struktur folder modular dan scalable

---

# 🏗️ 3. Struktur Folder Teknis

```
src/
├── app/
│   ├── api/
│   │   └── pemupukan/
│   │       ├── meta/route.ts         → API metadata tahun & summary
│   │       ├── rencana/route.ts      → API CRUD rencana
│   │       └── realisasi/route.ts    → API CRUD realisasi
│   ├── pemupukan/
│   │   ├── _components/
│   │   │   ├── dashboard/            → Ikhtisar, Log Aktivitas, Visualisasi
│   │   │   ├── realisasi/
│   │   │   ├── rencana/
│   │   │   └── layout/
│   │   ├── _services/
│   │   │   ├── pemupukanDashboard.ts → Data aggregator dashboard
│   │   │   ├── pemupukanFilters.ts   → Handler filter query
│   │   │   ├── pemupukanQueries.ts   → Prisma-level query builder
│   │   │   ├── pemupukanStats.ts     → Helper statistik
│   │   ├── _state/
│   │   │   ├── context.tsx           → Global UI state
│   │   │   └── derive.ts             → Derived state & computed store
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── login/
│   └── logout/
├── components/
├── lib/
│   ├── prisma.ts
│   └── auth/
├── prisma/
│   └── schema.prisma
└── types/
```

---

# 🧬 4. Arsitektur Sistem

Diagram arsitektur berikut menunjukkan alur utama data:

```
                  +-----------------------------+
                  |        User Interface       |
                  | Next.js (RSC + Client Comp) |
                  +--------------+--------------+
                                 |
                                 v
+------------------------------------------------------------------+
|                         Services Layer                           |
|------------------------------------------------------------------|
| buildFiltersFromSearchParams()  → parsing query param            |
| resolvePeriodFromSearchParams() → cek tahun / date range         |
| pemupukanDashboard.ts           → aggregator (tmRows, totals)    |
| pemupukanQueries.ts             → Prisma query engine            |
+--------------+--------------------------------+------------------+
               |                                |
               v                                v
+-----------------------------+      +------------------------------+
|     Prisma ORM Layer       |      |  NextAuth Authentication     |
+-------------+---------------+      +---------------+--------------+
              |                                  |
              v                                  v
+-------------------------------+   +-------------------------------+
|        PostgreSQL DB         |   |    Session / User Storage     |
+-------------------------------+   +-------------------------------+
```

---

# 🔌 5. Dokumentasi API Detail

## 📌 5.1 GET `/api/pemupukan/meta`

### **Tujuan**
Mengambil metadata:
- Daftar tahun tersedia
- Total rencana dan realisasi
- Metadata distrik & kebun

### **Response**
```json
{
  "tahun": [2022, 2023, 2024],
  "totals": {
    "rencana": 1520,
    "realisasi": 1400
  }
}
```

---

## 📌 5.2 POST `/api/pemupukan/rencana`

### **Body Contoh**
```json
{
  "tanggal": "2024-02-20",
  "kebun": "KB01",
  "afd": "AFD1",
  "blok": "B01",
  "luas": 2.5,
  "inv": 300,
  "aplikasi": 1,
  "jenis_pupuk": "UREA"
}
```

---

## 📌 5.3 POST `/api/pemupukan/realisasi`

### **Body Contoh**
```json
{
  "tanggal": "2024-02-20",
  "blok": "B01",
  "inv": 125,
  "dosis": 50,
  "jenis_pupuk": "UREA"
}
```

---

# ⚙️ 6. Instalasi & Setup Lengkap

## 6.1 Clone Project

```sh
git clone https://github.com/username/dashboard-pemupukan.git
cd dashboard-pemupukan
```

## 6.2 Install Dependencies

```sh
npm install
```

## 6.3 Setup Database

Migrasi prisma:

```sh
npx prisma migrate dev
```

Generate Prisma client:

```sh
npx prisma generate
```

## 6.4 Setup `.env`

```env
DATABASE_URL="postgresql://user:password@localhost:5432/pemupukan"
NEXTAUTH_SECRET="YOUR_SECRET_HERE"
NEXTAUTH_URL="http://localhost:3000"
UPLOAD_MAX_ROWS=10000
```

## 6.5 Jalankan Dev Server

```sh
npm run dev
```

Akses:
➡ http://localhost:3000/pemupukan

---

# 🧪 7. Pengembangan

## Format kode
```sh
npm run format
```

## Lint
```sh
npm run lint
```

## Build Production
```sh
npm run build
npm run start
```

---

# 📜 8. Lisensi
Bagian Tanaman Sub Divisi Pemupukan PTPN IV Regional III – Tidak untuk distribusi publik.

© 2025 Dashboard Pemupukan
