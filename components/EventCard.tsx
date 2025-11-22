'use client'

import { TrendingUp, MessageCircle, Clock, Flame, Star, Sparkles, Share2 } from 'lucide-react'
import { useState } from 'react'

interface Market {
  id: string
  question: string
  groupItemTitle: string
  outcomePrices: string
  volume?: string
  volume24hr?: number
  lastTradePrice?: number
}

interface EventCardProps {
  id: string
  title: string
  description?: string
  image?: string
  icon?: string
  markets?: Market[]
  volume?: number
  volume24hr?: number
  liquidity?: number
  commentCount?: number
  endDate?: string
  featured?: boolean
  new?: boolean
  active?: boolean
  closed?: boolean
  competitive?: number
  onAnalysisClick?: () => void
  onClick?: () => void
}

export default function EventCard({
  id,
  title,
  description,
  image,
  icon,
  markets = [],
  volume,
  volume24hr,
  liquidity,
  commentCount,
  endDate,
  featured,
  new: isNew,
  active,
  closed,
  competitive,
  onAnalysisClick,
  onClick
}: EventCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  // 格式化数字
  const formatNumber = (num?: number) => {
    if (!num) return '$0'
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`
    return `$${num.toFixed(0)}`
  }

  // 格式化概率 - 返回所有选项的概率数组
  const formatProbabilities = (priceStr: string) => {
    try {
      const prices = JSON.parse(priceStr)
      return prices.map((p: string) => Math.round(parseFloat(p) * 100))
    } catch {
      return [50, 50]
    }
  }

  // 格式化单个概率
  const formatProbability = (priceStr: string) => {
    try {
      const prices = JSON.parse(priceStr)
      const yesPrice = parseFloat(prices[0])
      return Math.round(yesPrice * 100)
    } catch {
      return 50
    }
  }

  // 计算剩余时间
  const getTimeRemaining = (endDateStr?: string) => {
    if (!endDateStr) return 'TBD'
    const end = new Date(endDateStr)
    const now = new Date()
    const diff = end.getTime() - now.getTime()
    
    if (diff < 0) return 'Ended'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days > 30) {
      const months = Math.floor(days / 30)
      return `${months}mo`
    }
    if (days > 0) return `${days}d`
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    return `${hours}h`
  }

  // 获取热度标签
  const getHotness = () => {
    if (!volume24hr) return null
    if (volume24hr > 1000000) return { label: 'FIRE', icon: Flame, color: 'text-orange-500' }
    if (volume24hr > 100000) return { label: 'HOT', icon: TrendingUp, color: 'text-red-500' }
    return null
  }

  const hotness = getHotness()
  const displayImage = image || icon
  
  // 判断市场类型
  const marketCount = markets.length
  const isBinaryMarket = marketCount === 1 // YES/NO 市场
  const isProbabilityListMarket = marketCount >= 2 // 2个或以上选项，都显示列表样式

  return (
    <div
      className={`bg-[#1A1A2E] border rounded-2xl overflow-hidden transition-all duration-200 group ${
        isHovered ? 'border-gray-600' : 'border-gray-800'
      } ${closed ? 'opacity-60' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 内容区域 */}
      <div className="p-5">
        {/* 顶部：图标 + 标题 */}
        <div className="flex items-start gap-3 mb-4">
          {displayImage && (
            <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-gray-800">
              <img
                src={displayImage}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h3 className="flex-1 text-sm font-semibold leading-snug line-clamp-2">
            {title}
          </h3>
        </div>

        {/* 市场选项按钮 */}
        {isBinaryMarket && (
          // YES/NO 二选项市场
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
              }}
              className="h-[32px] w-full bg-green-600/20 hover:bg-green-600/30 border border-green-600/40 rounded-lg font-semibold text-sm text-green-400 transition-colors"
            >
              YES
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
              }}
              className="h-[32px] w-full bg-transparent hover:bg-red-600/10 border border-red-600/50 rounded-lg font-semibold text-sm text-red-400 transition-colors"
            >
              NO
            </button>
          </div>
        )}

        {isProbabilityListMarket && (
          // 多选项列表（显示概率和 Yes/No 按钮）- 固定显示2条，超出可滚动
          <div 
            className="space-y-2 mb-3 overflow-y-auto pr-1"
            style={{
              maxHeight: '60px', // 固定高度，约2条记录
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(75, 85, 99, 0.5) transparent'
            }}
          >
            {markets.map((market) => {
              const probability = formatProbability(market.outcomePrices)
              const isHighProb = probability >= 60
              
              return (
                <div
                  key={market.id}
                  className="flex items-center gap-3 px-2  rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm  truncate">
                      {market.groupItemTitle}
                    </div>
                  </div>
                  <div className="text-[14px] font-medium flex-shrink-0">
                    {probability}%
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className={`px-[8px] py-[2px] text-[rgba(211,251,122,1)] text-[12px]
                        border border-[rgba(211,251,122,1)] rounded-[6px] font-medium
                        `}
                    >
                      Yes
                    </button>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="px-[8px] py-[2px] text-[rgba(255,92,92,1)] text-[12px]
                        border border-[rgba(255,92,92,1)] rounded-[6px] font-medium
                        "
                    >
                      No
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Analysis 按钮 */}
        {onAnalysisClick && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAnalysisClick()
            }}
            className="w-full h-[40px]  bg-[rgba(43,48,64,1)] hover:bg-purple-700 rounded-lg font-medium text-[14px] transition-colors mb-3"
          >
            Analysis
          </button>
        )}

        {/* 底部：交易量 + 平台信息 */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1">
            {volume24hr !== undefined && (
              <span>{formatNumber(volume24hr)} Vol.EPL</span>
            )}
            {!volume24hr && volume && (
              <span>{formatNumber(volume)} Vol.EPL</span>
            )}
            {endDate && (
              <>
                <span>•</span>
                <Clock className="w-3 h-3 inline" />
                <span>{getTimeRemaining(endDate)}</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-1.5">
            <img src="/ploy.png" className='w-[20px] h-[20px]' alt="" />

          </div>
        </div>
      </div>
    </div>
  )
}

