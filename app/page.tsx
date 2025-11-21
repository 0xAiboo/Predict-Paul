'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import NewsStream from '@/components/NewsStream'
import ThinkingProcess from '@/components/ThinkingProcess'
import type { HistoryItem, Event } from '@/types'

export default function Home() {
  const [currentPage, setCurrentPage] = useState<'news-stream' | 'thinking-process'>('news-stream')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [thinkingParams, setThinkingParams] = useState<{ 
    eventId?: string; 
    eventTitle?: string; 
    eventData?: Event;
    query?: string; 
    sessionId?: string 
  }>({})

  const handleNavigateToThinking = (eventId?: string, eventTitle?: string, query?: string, eventData?: Event) => {
    setThinkingParams({ eventId, eventTitle, eventData, query })
    setCurrentPage('thinking-process')
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

  const handleUserSessionClick = (sessionId: string, title: string) => {
    // 从用户会话历史跳转到会话，只传 session_id
    setThinkingParams({
      sessionId,
    })
    setCurrentPage('thinking-process')
  }

  const handleLoginSuccess = () => {
    // 登录成功后刷新侧边栏的历史记录
    setRefreshTrigger(prev => prev + 1)
    console.log('✅ 登录成功，刷新历史记录')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        key={refreshTrigger}
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage}
        onHistoryItemClick={handleHistoryItemClick}
        onUserSessionClick={handleUserSessionClick}
      />
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* 主内容区域 */}
        <div className="flex-1">
          {currentPage === 'news-stream' && (
            <NewsStream 
              onNavigateToThinking={handleNavigateToThinking}
              onLoginSuccess={handleLoginSuccess}
            />
          )}
          {currentPage === 'thinking-process' && (
            <ThinkingProcess 
              eventId={thinkingParams.eventId}
              eventTitle={thinkingParams.eventTitle}
              eventData={thinkingParams.eventData}
              initialQuery={thinkingParams.query}
              sessionId={thinkingParams.sessionId}
              onLoginSuccess={handleLoginSuccess}
            />
          )}
        </div>
      </main>
    </div>
  )
}

