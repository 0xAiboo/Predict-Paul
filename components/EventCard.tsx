'use client'

import { TrendingUp, MessageCircle, Clock, Flame, Star, Sparkles } from 'lucide-react'
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

  // 格式化概率
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
  const topMarkets = markets.slice(0, 3) // 显示前3个市场

  return (
    <div
      className={`bg-[#1A1A2E] border-2 rounded-xl overflow-hidden transition-all duration-300 cursor-pointer group ${
        isHovered ? 'border-purple-500 shadow-lg shadow-purple-500/20 scale-[1.02]' : 'border-gray-800'
      } ${closed ? 'opacity-60' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* 图片区域 */}
      {displayImage && (
        <div className="relative h-48 w-full overflow-hidden">
          <img
            src={displayImage}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          
          {/* 渐变遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E] via-transparent to-transparent" />
          
          {/* 标签 */}
          <div className="absolute top-3 left-3 flex gap-2">
            {featured && (
              <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30 rounded-full text-xs font-semibold text-yellow-400">
                <Star className="w-3 h-3 fill-yellow-400" />
                Featured
              </span>
            )}
            {isNew && (
              <span className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 backdrop-blur-sm border border-purple-500/30 rounded-full text-xs font-semibold text-purple-400">
                <Sparkles className="w-3 h-3" />
                New
              </span>
            )}
            {hotness && (
              <span className={`flex items-center gap-1 px-2 py-1 bg-black/40 backdrop-blur-sm border border-${hotness.color.replace('text-', '')}/30 rounded-full text-xs font-semibold ${hotness.color}`}>
                <hotness.icon className="w-3 h-3" />
                {hotness.label}
              </span>
            )}
          </div>

          {/* 右上角时间 */}
          {endDate && !closed && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-black/40 backdrop-blur-sm rounded-full text-xs text-gray-300">
              <Clock className="w-3 h-3" />
              {getTimeRemaining(endDate)}
            </div>
          )}

          {closed && (
            <div className="absolute top-3 right-3 px-3 py-1 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-full text-xs font-semibold text-red-400">
              CLOSED
            </div>
          )}
        </div>
      )}

      {/* 内容区域 */}
      <div className="p-5">
        {/* 标题 */}
        <h3 className="text-lg font-bold mb-3 line-clamp-2 group-hover:text-purple-400 transition-colors">
          {title}
        </h3>

        {/* 描述（可选） */}
        {description && (
          <p className="text-sm text-gray-400 mb-4 line-clamp-2">
            {description}
          </p>
        )}

        {/* 市场选项 */}
        {topMarkets.length > 0 && (
          <div className="space-y-2 mb-4">
            {topMarkets.map((market) => {
              const probability = formatProbability(market.outcomePrices)
              const isHighProbability = probability >= 70
              const isMediumProbability = probability >= 40 && probability < 70
              
              return (
                <div
                  key={market.id}
                  className="flex items-center justify-between p-3 bg-[#0F0F23] rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
                >
                  <span className="text-sm font-medium flex-1 truncate">
                    {market.groupItemTitle}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isHighProbability
                            ? 'bg-green-500'
                            : isMediumProbability
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${probability}%` }}
                      />
                    </div>
                    <span
                      className={`text-sm font-bold w-10 text-right ${
                        isHighProbability
                          ? 'text-green-400'
                          : isMediumProbability
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }`}
                    >
                      {probability}%
                    </span>
                  </div>
                </div>
              )
            })}
            
            {markets.length > 3 && (
              <div className="text-xs text-center text-gray-500 pt-1">
                +{markets.length - 3} more options
              </div>
            )}
          </div>
        )}

        {/* 统计信息 */}
        <div className="flex items-center justify-between text-sm mb-4 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-4">
            {volume24hr !== undefined && (
              <div className="flex flex-col">
                <span className="text-gray-500 text-xs">24h Volume</span>
                <span className="font-semibold text-green-400">{formatNumber(volume24hr)}</span>
              </div>
            )}
            {liquidity !== undefined && (
              <div className="flex flex-col">
                <span className="text-gray-500 text-xs">Liquidity</span>
                <span className="font-semibold text-blue-400">{formatNumber(liquidity)}</span>
              </div>
            )}
          </div>
          
          {commentCount !== undefined && commentCount > 0 && (
            <div className="flex items-center gap-1 text-gray-400">
              <MessageCircle className="w-4 h-4" />
              <span>{commentCount}</span>
            </div>
          )}
        </div>

        {/* 竞争度指示器 */}
        {competitive !== undefined && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Competitiveness</span>
              <span>{Math.round(competitive * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all"
                style={{ width: `${competitive * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2">
          {/* <button
            onClick={(e) => {
              e.stopPropagation()
              onClick?.()
            }}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-semibold transition-colors"
          >
            Trade
          </button> */}
          {onAnalysisClick && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAnalysisClick()
              }}
              className="flex-1 bg-[#16213E] hover:bg-[#1e2949] text-white py-2.5 rounded-lg font-semibold transition-colors"
            >
              Analysis
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

