import { useState, useEffect } from 'react'
import { eventService } from '@/lib/api-services'
import type { Event } from '@/types'

interface UseEventsResult {
  events: Event[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useEvents(): UseEventsResult {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await eventService.getEvents()
      if (response.status === 'ok' && response.data) {
        setEvents(response.data)
      } else {
        setError('获取事件数据失败')
      }
    } catch (err: any) {
      setError(err.message || '获取事件数据失败')
      console.error('Error fetching events:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  return {
    events,
    loading,
    error,
    refetch: fetchEvents,
  }
}

