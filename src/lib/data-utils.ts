import type { NasRow } from './types'

/* ---------- Filtering ---------- */

export interface RowFilter {
  indicator?: string
  frequency?: string
  base_year?: string
  series?: string
  /** undefined = parwah nahi, null = industry khaali honi chahiye, "Mining" = wahi industry */
  industry?: string | null
}

export function filterRows(rows: NasRow[], f: RowFilter): NasRow[] {
  return rows.filter(
    (r) =>
      (f.indicator === undefined || r.indicator === f.indicator) &&
      (f.frequency === undefined || r.frequency === f.frequency) &&
      (f.base_year === undefined || r.base_year === f.base_year) &&
      (f.series === undefined || r.series === f.series) &&
      (f.industry === undefined || (r.industry ?? null) === f.industry),
  )
}

/* ---------- Small maths ---------- */

export function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/* ---------- Series builders ---------- */

export type ValueKey = 'current_price' | 'constant_price'

export interface YearPoint {
  year: number // 2022
  label: string // "2022-23"
  value: number
}

/** Saal-wise ek value. Ek saal ki kai rows (revisions) ho to median (backend jaisa hi). */
export function annualSeries(rows: NasRow[], key: ValueKey): YearPoint[] {
  const buckets = new Map<number, { label: string; vals: number[] }>()
  for (const r of rows) {
    const v = r[key]
    if (r.year_int == null || v == null) continue
    const b = buckets.get(r.year_int) ?? { label: r.year ?? String(r.year_int), vals: [] }
    b.vals.push(v)
    buckets.set(r.year_int, b)
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, b]) => ({ year, label: b.label, value: median(b.vals) }))
}

export interface GrowthPoint extends YearPoint {
  growth: number | null // % YoY, pehle saal ke liye null
}

export function yoyGrowth(points: YearPoint[]): GrowthPoint[] {
  return points.map((p, i) => {
    const prev = points[i - 1]
    const growth = prev && prev.value !== 0 ? ((p.value - prev.value) / prev.value) * 100 : null
    return { ...p, growth }
  })
}

export interface QuarterPoint {
  year: number
  quarter: string // "Q1"
  label: string // "2022-23 Q1"
  value: number
}

export function quarterlySeries(rows: NasRow[], key: ValueKey): QuarterPoint[] {
  const buckets = new Map<string, { year: number; quarter: string; vals: number[] }>()
  for (const r of rows) {
    const v = r[key]
    if (r.year_int == null || r.quarter == null || v == null) continue
    const id = `${r.year_int}-${r.quarter}`
    const b = buckets.get(id) ?? { year: r.year_int, quarter: r.quarter, vals: [] }
    b.vals.push(v)
    buckets.set(id, b)
  }
  return [...buckets.values()]
    .sort((a, b) => a.year - b.year || a.quarter.localeCompare(b.quarter))
    .map((b) => ({
      year: b.year,
      quarter: b.quarter,
      label: `${b.year}-${String(b.year + 1).slice(-2)} ${b.quarter}`,
      value: median(b.vals),
    }))
}

export interface IndustryValue {
  industry: string
  value: number
}

/** Ek saal me har industry ki value (bade se chhota). */
export function industryValues(rows: NasRow[], year: number, key: ValueKey): IndustryValue[] {
  const buckets = new Map<string, number[]>()
  for (const r of rows) {
    const v = r[key]
    if (r.year_int !== year || !r.industry || v == null) continue
    buckets.set(r.industry, [...(buckets.get(r.industry) ?? []), v])
  }
  return [...buckets.entries()]
    .map(([industry, vals]) => ({ industry, value: median(vals) }))
    .sort((a, b) => b.value - a.value)
}

/* ---------- Formatting ---------- */

/** Values ₹ Crore me hain. 1 Lakh Crore = 1,00,000 Crore. */
export function formatCrore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  const abs = Math.abs(value)
  if (abs >= 1e5) return `₹${(value / 1e5).toFixed(2)} Lakh Cr`
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}%`
}
