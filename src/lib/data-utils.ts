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

/* ---------- Sectors ---------- */

// "Total ..." jaisi aggregate rows sector nahi hoti
export const isSector = (name: string | null): name is string => !!name && !/\btotal\b/i.test(name)

export interface SectorGrowth {
  industry: string
  value: number
  growth: number | null // latest saal ka YoY %
}

/** Har sector ki latest value + YoY growth (sab sectors ka common latest saal). */
export function sectorGrowth(
  rows: NasRow[],
  key: ValueKey,
): { year: number | null; items: SectorGrowth[] } {
  const byIndustry = new Map<string, NasRow[]>()
  for (const r of rows) {
    if (!isSector(r.industry)) continue
    const arr = byIndustry.get(r.industry) ?? []
    arr.push(r)
    byIndustry.set(r.industry, arr)
  }
  const latest = [...byIndustry.entries()].flatMap(([industry, rs]) => {
    const last = yoyGrowth(annualSeries(rs, key)).at(-1)
    return last ? [{ industry, year: last.year, value: last.value, growth: last.growth }] : []
  })
  const year = latest.length ? Math.max(...latest.map((l) => l.year)) : null
  return {
    year,
    items: latest
      .filter((l) => l.year === year)
      .map(({ industry, value, growth }) => ({ industry, value, growth })),
  }
}

export type YearRow = Record<string, number | string>

/** Stacked chart ke liye: har saal ek row, har sector ek column. */
export function sectorMatrix(rows: NasRow[], industries: string[], key: ValueKey): YearRow[] {
  const out = new Map<number, YearRow>()
  for (const ind of industries) {
    for (const p of annualSeries(rows.filter((r) => r.industry === ind), key)) {
      const row = out.get(p.year) ?? { year: p.year, label: p.label }
      row[ind] = p.value
      out.set(p.year, row)
    }
  }
  return [...out.values()].sort((a, b) => Number(a.year) - Number(b.year))
}

/* ---------- Seasonality ---------- */

export interface SeasonPoint {
  quarter: string // Q1..Q4
  deviation: number // % jitna quarter apne saal ke average se upar (+) / neeche (-) rehta hai
}

/** Simple seasonal index: (quarter / us saal ka quarterly average) ka sab saalon par average. */
export function seasonalIndex(points: QuarterPoint[]): SeasonPoint[] {
  const byYear = new Map<number, QuarterPoint[]>()
  for (const p of points) {
    const arr = byYear.get(p.year) ?? []
    arr.push(p)
    byYear.set(p.year, arr)
  }
  const acc = new Map<string, number[]>()
  for (const qs of byYear.values()) {
    if (qs.length !== 4) continue // adhoora saal chhod do
    const mean = qs.reduce((s, q) => s + q.value, 0) / 4
    for (const q of qs) {
      const arr = acc.get(q.quarter) ?? []
      arr.push((q.value / mean - 1) * 100)
      acc.set(q.quarter, arr)
    }
  }
  return ['Q1', 'Q2', 'Q3', 'Q4']
    .filter((q) => acc.has(q))
    .map((q) => {
      const v = acc.get(q) as number[]
      return { quarter: q, deviation: v.reduce((s, x) => s + x, 0) / v.length }
    })
}
