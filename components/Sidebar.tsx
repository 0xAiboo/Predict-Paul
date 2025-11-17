'use client'

import { Menu, Settings } from 'lucide-react'
import Image from 'next/image'
import HistoryList from './HistoryList'
import type { HistoryItem } from '@/types'

interface SidebarProps {
  currentPage: string
  setCurrentPage: (page: 'news-stream' | 'news-analysis' | 'thinking-process') => void
  onHistoryItemClick?: (item: HistoryItem) => void
}

export default function Sidebar({ currentPage, setCurrentPage, onHistoryItemClick }: SidebarProps) {
  const handleHistoryItemClick = (item: HistoryItem) => {
    if (onHistoryItemClick) {
      onHistoryItemClick(item)
    }
  }

  return (
    <aside className="w-64 bg-[#0F0F23] border-r border-gray-800 flex flex-col">
      {/* Logo Header */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-full h-10 relative flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Predict Paul Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
       
      </div>

      {/* Menu Toggle */}
      <button className="mx-4 mb-4 p-2 hover:bg-gray-800 rounded-lg transition-colors">
        <Menu className="w-6 h-6" />
      </button>

      {/* New Chat Button */}
      <button 
        onClick={() => setCurrentPage('news-stream')}
        className="mx-4 mb-6 px-4 py-3 bg-white text-purple-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
      >
        +Start New Chat
      </button>

      {/* History Analysis */}
      <div className="px-4 mb-4">
        <button
          onClick={() => setCurrentPage('news-analysis')}
          className="text-sm text-gray-400 hover:text-white transition-colors mb-3"
        >
          History Analysis
        </button>
      </div>

      {/* History List */}
      <HistoryList 
        currentPage={currentPage}
        onHistoryItemClick={handleHistoryItemClick}
      />

      {/* User Profile */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-semibold">
            SW
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Sophia Williams</div>
            <div className="text-xs text-gray-400">sophia@aisocul.com</div>
          </div>
        </div>
        <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800 rounded-lg transition-colors text-sm">
          <Settings className="w-4 h-4" />
          <span>Setting</span>
        </button>
      </div>
    </aside>
  )
}

