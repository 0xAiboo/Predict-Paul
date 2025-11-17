import { useState, useEffect } from 'react'
import { historyService } from '@/lib/api-services'
import type { HistoryItem } from '@/types'

interface UseHistoryResult {
  historyItems: HistoryItem[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useHistory(): UseHistoryResult {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await historyService.getHistory()
      if (response.status === 'ok' && response.data) {
        setHistoryItems(response.data)
      } else {
        setError('获取历史记录失败')
      }
    } catch (err: any) {
      setError(err.message || '获取历史记录失败')
      console.error('Error fetching history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  return {
    historyItems,
    loading,
    error,
    refetch: fetchHistory,
  }
}

