import { useState, useEffect } from 'react'
import { analysisService } from '@/lib/api-services'
import type { Analysis, ThinkingProcess } from '@/types'

interface UseAnalysisResult {
  analysis: Analysis | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAnalysis(marketId: string): UseAnalysisResult {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalysis = async () => {
    if (!marketId) return

    try {
      setLoading(true)
      setError(null)
      const response = await analysisService.getNewsAnalysis(marketId)
      setAnalysis(response.data)
    } catch (err: any) {
      setError(err.message || '获取分析数据失败')
      console.error('Error fetching analysis:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalysis()
  }, [marketId])

  return {
    analysis,
    loading,
    error,
    refetch: fetchAnalysis,
  }
}

interface UseThinkingProcessResult {
  thinkingProcess: ThinkingProcess | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useThinkingProcess(analysisId: string): UseThinkingProcessResult {
  const [thinkingProcess, setThinkingProcess] = useState<ThinkingProcess | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchThinkingProcess = async () => {
    if (!analysisId) return

    try {
      setLoading(true)
      setError(null)
      const response = await analysisService.getThinkingProcess(analysisId)
      setThinkingProcess(response.data)
    } catch (err: any) {
      setError(err.message || '获取思考过程失败')
      console.error('Error fetching thinking process:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchThinkingProcess()
  }, [analysisId])

  return {
    thinkingProcess,
    loading,
    error,
    refetch: fetchThinkingProcess,
  }
}

