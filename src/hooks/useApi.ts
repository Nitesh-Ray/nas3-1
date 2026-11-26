import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api-client'
import type { DataFilters } from '../lib/types'

// React Query: caching, loading/error state, retry sab free
export const useStatus = () => useQuery({ queryKey: ['status'], queryFn: api.status })

export const useAllData = (filters: DataFilters = {}) =>
  useQuery({
    queryKey: ['allData', filters],
    queryFn: () => api.allData(filters),
    staleTime: 5 * 60 * 1000, // 5 min tak dobara fetch nahi
  })

export const useHistory = () =>
  useQuery({ queryKey: ['history'], queryFn: api.history, select: (d) => d.history })

export const useForecast = (periods = 4) =>
  useQuery({
    queryKey: ['forecast', periods],
    queryFn: () => api.forecast(periods),
    select: (d) => d.forecast,
  })

export const useBacktest = (testYear?: number) =>
  useQuery({ queryKey: ['backtest', testYear], queryFn: () => api.backtest(testYear) })

export const useAnomalies = (limit = 50, offset = 0) =>
  useQuery({ queryKey: ['anomalies', limit, offset], queryFn: () => api.anomalies(limit, offset) })
