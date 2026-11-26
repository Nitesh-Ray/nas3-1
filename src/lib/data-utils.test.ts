import { describe, expect, it } from 'vitest'
import {
  annualSeries,
  formatCrore,
  formatPercent,
  isSector,
  median,
  seasonalIndex,
  yoyGrowth,
  type QuarterPoint,
} from './data-utils'
import type { NasRow } from './types'

// Test ke liye chhota row-builder
function row(p: Partial<NasRow>): NasRow {
  return {
    id: 1, base_year: '2011-12', series: 'Current', year: '2022-23', year_int: 2022,
    indicator: 'Gross Domestic Product', frequency: 'Annual', estimate_stage: null,
    industry: null, subindustry: null, institutional_sector: null, quarter: null,
    current_price: null, constant_price: null, unit: null, is_anomaly: false,
    flagged_for_review: false, anomaly_score: null, source_run_id: null,
    ingestion_timestamp: null, source_file_hash: null,
    ...p,
  }
}

describe('median', () => {
  it('odd aur even', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })
})

describe('annualSeries', () => {
  it('duplicate rows ka median leta hai aur null skip karta hai', () => {
    const rows = [
      row({ year_int: 2021, year: '2021-22', constant_price: 100 }),
      row({ year_int: 2021, year: '2021-22', constant_price: 300 }),
      row({ year_int: 2021, year: '2021-22', constant_price: null }),
      row({ year_int: 2022, year: '2022-23', constant_price: 400 }),
    ]
    const s = annualSeries(rows, 'constant_price')
    expect(s.map((p) => p.value)).toEqual([200, 400])
    expect(s[0].label).toBe('2021-22')
  })
})

describe('yoyGrowth', () => {
  it('pehle saal null, phir % badlav', () => {
    const g = yoyGrowth([
      { year: 2020, label: '2020-21', value: 100 },
      { year: 2021, label: '2021-22', value: 110 },
    ])
    expect(g[0].growth).toBeNull()
    expect(g[1].growth).toBeCloseTo(10)
  })
})

describe('seasonalIndex', () => {
  const q = (year: number, quarter: string, value: number): QuarterPoint => ({
    year, quarter, label: `${year} ${quarter}`, value,
  })

  it('average se % farak, adhoora saal chhod deta hai', () => {
    const pts = [
      q(2020, 'Q1', 90), q(2020, 'Q2', 100), q(2020, 'Q3', 100), q(2020, 'Q4', 110),
      q(2021, 'Q1', 999), // adhoora saal, ignore hona chahiye
    ]
    const s = seasonalIndex(pts)
    expect(s.map((p) => Math.round(p.deviation))).toEqual([-10, 0, 0, 10])
  })
})

describe('formatting', () => {
  it('formatCrore', () => {
    expect(formatCrore(250000)).toBe('₹2.50 Lakh Cr')
    expect(formatCrore(null)).toBe('—')
  })
  it('formatPercent', () => {
    expect(formatPercent(3.456)).toBe('+3.5%')
    expect(formatPercent(-2)).toBe('-2.0%')
    expect(formatPercent(undefined)).toBe('—')
  })
})

describe('isSector', () => {
  it('Total wali rows sector nahi', () => {
    expect(isSector('Mining')).toBe(true)
    expect(isSector('Total GVA')).toBe(false)
    expect(isSector(null)).toBe(false)
  })
})
