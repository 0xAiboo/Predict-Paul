import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="bg-red-500 bg-opacity-10 border border-red-500 rounded-xl p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-red-400 font-semibold mb-1">加载失败</h3>
          <p className="text-red-300 text-sm mb-3">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              重试
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function ErrorCard({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="bg-[#1A1A2E] border border-gray-800 rounded-xl p-6">
      <ErrorMessage message={message} onRetry={onRetry} />
    </div>
  )
}

