'use client'

import { MessageSquare } from 'lucide-react'
import { useHistory } from '@/hooks/useHistory'
import type { HistoryItem } from '@/types'

interface HistoryListProps {
  currentPage: string
  onHistoryItemClick: (item: HistoryItem) => void
}

export default function HistoryList({ currentPage, onHistoryItemClick }: HistoryListProps) {
  const { historyItems, loading, error } = useHistory()

  if (loading) {
    return (
      <nav className="flex-1 overflow-y-auto scrollbar-hide px-4 space-y-1">
        <div className="text-center text-gray-400 text-sm py-4">
          加载中...
        </div>
      </nav>
    )
  }

  if (error) {
    return (
      <nav className="flex-1 overflow-y-auto scrollbar-hide px-4 space-y-1">
        <div className="text-center text-red-400 text-sm py-4">
          {error}
        </div>
      </nav>
    )
  }

  if (historyItems.length === 0) {
    return (
      <nav className="flex-1 overflow-y-auto scrollbar-hide px-4 space-y-1">
        <div className="text-center text-gray-400 text-sm py-4">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
          暂无历史记录
        </div>
      </nav>
    )
  }

  return (
    <nav className="flex-1 overflow-y-auto scrollbar-hide px-4 space-y-1">
      {historyItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onHistoryItemClick(item)}
          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-800 transition-colors truncate"
          title={item.question}
        >
          {item.question}
        </button>
      ))}
    </nav>
  )
}

