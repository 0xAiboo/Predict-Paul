'use client'

import { Link2 } from 'lucide-react'

interface PredictionCardProps {
  id?: string
  title: string
  subtitle?: string
  tags?: string[]
  options?: Array<{ label: string; value: boolean }>
  volume?: string
  time: string
  status: 'active' | 'binary'
  image?: string
  onAnalysisClick?: () => void
}

export default function PredictionCard({
  id,
  title,
  subtitle,
  tags,
  options,
  volume,
  time,
  status,
  image,
  onAnalysisClick
}: PredictionCardProps) {
  return (
    <div className="bg-[#1A1A2E] border border-gray-800 rounded-xl p-6 hover:border-purple-600 transition-colors">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {image ? (
          <img src={image} alt={title} className="w-10 h-10 rounded-lg flex-shrink-0 object-cover" />
        ) : (
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex-shrink-0"></div>
        )}
        <div className="flex-1">
          <h3 className="font-semibold mb-1">{title}</h3>
          {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
        </div>
      </div>

      {/* Tags or Options */}
      {tags && (
        <div className="flex gap-2 mb-4">
          {tags.map((tag, index) => {
            const colors = ['border-red-500 text-red-400', 'border-purple-500 text-purple-400', 'border-blue-500 text-blue-400']
            return (
              <button
                key={index}
                className={`px-4 py-1 border rounded-full text-sm hover:bg-opacity-10 hover:bg-white transition-colors ${colors[index % colors.length]}`}
              >
                {tag}
              </button>
            )
          })}
        </div>
      )}

      {options && (
        <div className="flex gap-3 mb-4">
          {options.map((option, index) => (
            <button
              key={index}
              className={`flex-1 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                option.value
                  ? 'border-green-500 text-green-400 hover:bg-green-500 hover:bg-opacity-10'
                  : 'border-red-500 text-red-400 hover:bg-red-500 hover:bg-opacity-10'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-sm">
        {volume && <span className="text-gray-400">{volume}</span>}
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{time}</span>
          <button className="p-1 hover:bg-gray-700 rounded transition-colors">
            <Link2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Analysis Button */}
      <button 
        onClick={onAnalysisClick}
        className="w-full mt-4 bg-[#16213E] hover:bg-[#1e2949] text-white py-2 rounded-lg transition-colors"
      >
        Analysis
      </button>
    </div>
  )
}

