'use client'

import { useState } from 'react'
import Header from './Header'
import { MessageSquarePlus } from 'lucide-react'

interface NewsAnalysisProps {
  onNavigateToNewsStream?: () => void
}

export default function NewsAnalysis({ onNavigateToNewsStream }: NewsAnalysisProps) {
  // 暂时没有历史记录数据
  const historyItems: any[] = []

  return (
    <div className="min-h-screen bg-[#0F0F23]">
      {/* Header */}
      <Header title="History Analysis" showSearch={true} />

      {/* Content */}
      <div className="px-8 py-6">
        {/* Empty State */}
        {historyItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
            <div className="text-center max-w-md">
              {/* Icon */}
              <div className="mb-6 flex justify-center">
                <div className="w-24 h-24 bg-gradient-primary rounded-full flex items-center justify-center">
                  <MessageSquarePlus className="w-12 h-12 text-white" />
            </div>
          </div>

              {/* Title */}
              <h2 className="text-2xl font-bold mb-4">暂无历史记录</h2>

              {/* Description */}
              <p className="text-gray-400 mb-8">
                你还没有任何分析历史记录。开始一个新的对话来分析预测市场吧！
              </p>

              {/* Start New Chat Button */}
                <button 
                onClick={onNavigateToNewsStream}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-primary hover:opacity-90 text-white rounded-xl font-medium transition-all transform hover:scale-105"
                >
                <MessageSquarePlus className="w-5 h-5" />
                Start New Chat
                </button>
            </div>
          </div>
        ) : (
          // 未来的历史记录列表
          <div className="space-y-4">
            {historyItems.map((item: any) => (
              <div key={item.id} className="bg-[#1A1A2E] border border-gray-800 rounded-xl p-6 hover:border-purple-500 transition-colors cursor-pointer">
                <h3 className="text-lg font-semibold mb-2">{item.question}</h3>
                <p className="text-gray-400 text-sm">{item.date}</p>
        </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

