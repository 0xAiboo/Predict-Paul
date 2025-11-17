export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }

  return (
    <div className="flex items-center justify-center">
      <div
        className={`${sizeClasses[size]} border-purple-600 border-t-transparent rounded-full animate-spin`}
      ></div>
    </div>
  )
}

export function LoadingCard() {
  return (
    <div className="bg-[#1A1A2E] border border-gray-800 rounded-xl p-6 animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-gray-700 rounded-lg"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-3 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-8 bg-gray-700 rounded"></div>
        <div className="h-8 bg-gray-700 rounded"></div>
      </div>
      <div className="flex justify-between">
        <div className="h-4 bg-gray-700 rounded w-24"></div>
        <div className="h-4 bg-gray-700 rounded w-16"></div>
      </div>
    </div>
  )
}

export function LoadingPage() {
  return (
    <div className="min-h-screen bg-[#0F0F23] flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-400">加载中...</p>
      </div>
    </div>
  )
}

