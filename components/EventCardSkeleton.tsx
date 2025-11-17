'use client'

export default function EventCardSkeleton() {
  return (
    <div className="bg-[#1A1A2E] border-2 border-gray-800 rounded-xl overflow-hidden animate-pulse">
      {/* 图片骨架 */}
      <div className="h-48 bg-gray-800" />

      {/* 内容区域 */}
      <div className="p-5">
        {/* 标题骨架 */}
        <div className="h-6 bg-gray-800 rounded mb-3 w-3/4" />
        <div className="h-4 bg-gray-800 rounded mb-4 w-1/2" />

        {/* 市场选项骨架 */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between p-3 bg-[#0F0F23] rounded-lg border border-gray-800">
            <div className="h-4 bg-gray-800 rounded w-1/3" />
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-gray-800 rounded-full" />
              <div className="h-4 bg-gray-800 rounded w-10" />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-[#0F0F23] rounded-lg border border-gray-800">
            <div className="h-4 bg-gray-800 rounded w-1/4" />
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-gray-800 rounded-full" />
              <div className="h-4 bg-gray-800 rounded w-10" />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-[#0F0F23] rounded-lg border border-gray-800">
            <div className="h-4 bg-gray-800 rounded w-1/3" />
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-gray-800 rounded-full" />
              <div className="h-4 bg-gray-800 rounded w-10" />
            </div>
          </div>
        </div>

        {/* 统计信息骨架 */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <div className="h-3 bg-gray-800 rounded w-16" />
              <div className="h-4 bg-gray-800 rounded w-12" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="h-3 bg-gray-800 rounded w-16" />
              <div className="h-4 bg-gray-800 rounded w-12" />
            </div>
          </div>
          <div className="h-4 bg-gray-800 rounded-full w-8" />
        </div>

        {/* 竞争度骨架 */}
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <div className="h-3 bg-gray-800 rounded w-20" />
            <div className="h-3 bg-gray-800 rounded w-8" />
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full" />
        </div>

        {/* 按钮骨架 */}
        <div className="flex gap-2">
          <div className="flex-1 h-10 bg-gray-800 rounded-lg" />
          <div className="flex-1 h-10 bg-gray-800 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

