// Backend ke JSON ka exact shape (backend/api/routes/*.py se match)

export interface NasRow {
  id: number
  base_year: string | null
  series: string | null
  year: string | null // "2022-23"
  year_int: number | null // 2022
  indicator: string | null
  frequency: string | null // Annual / Quarterly
  estimate_stage: string | null
  industry: string | null
  subindustry: string | null
  institutional_sector: string | null
  quarter: string | null // Q1..Q4
  current_price: number | null // missing = null (0 nahi)
  constant_price: number | null
  unit: string | null
  is_anomaly: boolean
  flagged_for_review: boolean
  anomaly_score: number | null
  source_run_id: number | null
  ingestion_timestamp: string | null
  source_file_hash: string | null
}

export interface IngestionStatus {
  id?: number
  timestamp?: string | null
  rows_processed?: number
  success?: boolean
  source_file_hash?: string | null
  status?: string // "No data ingested yet."
}

export interface ForecastPoint {
  ds: string
  quarter: string // "2025-26 Q3"
  yhat: number
  yhat_lower: number
  yhat_upper: number
}

export interface HistoryPoint {
  ds: string
  quarter: string
  y: number
}

export interface BacktestResult {
  test_year: number
  train_points: number
  metrics: { mae: number; rmse: number; mape_pct: number }
  details: { quarter: string; actual: number; predicted: number; error: number }[]
}

export interface AnomalyItem {
  id: number
  indicator: string | null
  industry: string | null
  year: string | null
  quarter: string | null
  frequency: string | null
  base_year: string | null
  series: string | null
  current_price: number | null
  anomaly_score: number | null
  unit: string | null
}

export interface AnomalyList {
  total: number
  limit: number
  offset: number
  items: AnomalyItem[]
}

export interface DataFilters {
  indicator?: string
  frequency?: string
  base_year?: string
}
