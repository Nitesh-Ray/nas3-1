import type {
  AnomalyList,
  BacktestResult,
  DataFilters,
  ForecastPoint,
  HistoryPoint,
  IngestionStatus,
  NasRow,
} from './types'

// Dev me khaali string (Vite proxy /api ko 8000 par bhejta hai). Deploy me VITE_API_URL set karo.
const BASE = import.meta.env.VITE_API_URL ?? ''

// erasableSyntaxOnly ki wajah se constructor parameter properties (public x) allowed nahi
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}

// Same GET request jab tak chal rahi hai, dobara network par nahi jaati (deduplication)
const inflight = new Map<string, Promise<unknown>>()

async function doFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(BASE + path, init)
  } catch {
    throw new NetworkError('Backend tak nahi pahunch paaye. Kya uvicorn chal raha hai?')
  }
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail ?? detail
    } catch {
      /* body JSON nahi tha */
    }
    throw new ApiError(res.status, String(detail))
  }
  return (await res.json()) as T
}

function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? 'GET'
  if (method !== 'GET') return doFetch<T>(path, init)

  const existing = inflight.get(path)
  if (existing) return existing as Promise<T>

  const p = doFetch<T>(path, init)
  const clean = () => {
    inflight.delete(path)
  }
  p.then(clean, clean)
  inflight.set(path, p)
  return p
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export const api = {
  status: () => request<IngestionStatus>('/api/data/status'),
  allData: (f: DataFilters = {}) => request<NasRow[]>(`/api/data/all${qs({ ...f })}`),
  anomalies: (limit = 50, offset = 0) =>
    request<AnomalyList>(`/api/anomalies/${qs({ limit, offset })}`),
  approve: (id: number) => request<{ status: string }>(`/api/anomalies/${id}/approve`, { method: 'POST' }),
  reject: (id: number) => request<{ status: string }>(`/api/anomalies/${id}/reject`, { method: 'POST' }),
  forecast: (periods = 4) =>
    request<{ forecast: ForecastPoint[] }>(`/api/forecast/gdp${qs({ periods })}`),
  history: () => request<{ history: HistoryPoint[] }>('/api/forecast/history'),
  backtest: (testYear?: number) =>
    request<BacktestResult>(`/api/forecast/backtest${qs({ test_year: testYear })}`),
}
