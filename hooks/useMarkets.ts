import { useState, useEffect } from 'react'
import { marketService } from '@/lib/api-services'
import type { Market, SearchParams } from '@/types'

interface UseMarketsResult {
  markets: Market[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useMarkets(params?: SearchParams): UseMarketsResult {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMarkets = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await marketService.getMarkets(params)
      setMarkets(response.data)
    } catch (err: any) {
      setError(err.message || '获取市场数据失败')
      console.error('Error fetching markets:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMarkets()
  }, [JSON.stringify(params)])

  return {
    markets,
    loading,
    error,
    refetch: fetchMarkets,
  }
}

interface UseTrendingResult {
  markets: Market[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useTrending(params?: { platform?: string; sort?: string }): UseTrendingResult {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrending = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await marketService.getTrending(params)
      setMarkets(response.data)
    } catch (err: any) {
      setError(err.message || '获取趋势市场失败')
      console.error('Error fetching trending markets:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrending()
  }, [JSON.stringify(params)])

  return {
    markets,
    loading,
    error,
    refetch: fetchTrending,
  }
}

