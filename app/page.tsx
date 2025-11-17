'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import NewsStream from '@/components/NewsStream'
import NewsAnalysis from '@/components/NewsAnalysis'
import ThinkingProcess from '@/components/ThinkingProcess'
import type { HistoryItem } from '@/types'

export default function Home() {
  const [currentPage, setCurrentPage] = useState<'news-stream' | 'news-analysis' | 'thinking-process'>('news-stream')
  const [thinkingParams, setThinkingParams] = useState<{ eventId?: string; eventTitle?: string; query?: string; sessionId?: string }>({})

  const handleNavigateToThinking = (eventId?: string, eventTitle?: string, query?: string, sessionId?: string) => {
    setThinkingParams({ eventId, eventTitle, query, sessionId })
    setCurrentPage('thinking-process')
  }

  const handleNavigateToNewsStream = () => {
    setCurrentPage('news-stream')
  }

  const handleHistoryItemClick = (item: HistoryItem) => {
    // 点击历史记录，跳转到 Thinking Process 页面并传入 session_id
    setThinkingParams({
      eventId: item.event_id,
      eventTitle: item.event_title,
      query: item.question,
      sessionId: item.session_id,
    })
    setCurrentPage('thinking-process')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage}
        onHistoryItemClick={handleHistoryItemClick}
      />
      <main className="flex-1 overflow-y-auto">
        {currentPage === 'news-stream' && (
          <NewsStream 
            onNavigateToThinking={handleNavigateToThinking}
          />
        )}
        {currentPage === 'news-analysis' && (
          <NewsAnalysis 
            onNavigateToNewsStream={handleNavigateToNewsStream}
          />
        )}
        {currentPage === 'thinking-process' && (
          <ThinkingProcess 
            eventId={thinkingParams.eventId}
            eventTitle={thinkingParams.eventTitle}
            initialQuery={thinkingParams.query}
            sessionId={thinkingParams.sessionId}
          />
        )}
      </main>
    </div>
  )
}

