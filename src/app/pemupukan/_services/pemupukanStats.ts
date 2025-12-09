// src/app/pemupukan/_services/pemupukanStats.ts

// hitung total kg untuk range tanggal tertentu
export function sumKg(
  rows: {
    kebun: string;
    kgPupuk: number;
    aplikasiKe: number;
    tanggal: Date | null;
  }[],
  kebun: string,
  aplikasi: number,
  start?: Date,
  end?: Date
) {
  return rows.reduce((acc, r) => {
    if (r.kebun !== kebun) return acc;
    if (r.aplikasiKe !== aplikasi) return acc;
    if (start && (!r.tanggal || r.tanggal < start)) return acc;
    if (end && (!r.tanggal || r.tanggal > end)) return acc;
    return acc + (r.kgPupuk || 0);
  }, 0);
}
