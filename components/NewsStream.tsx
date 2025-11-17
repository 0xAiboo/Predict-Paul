"use client";

import { RefreshCw, Filter, TrendingUp, Flame, Clock } from "lucide-react";
import { useState } from "react";
import Header from "./Header";
import EventCard from "./EventCard";
import EventCardSkeleton from "./EventCardSkeleton";
import { useEvents } from "@/hooks/useEvents";
import ErrorMessage from "./ErrorMessage";

interface NewsStreamProps {
  onNavigateToThinking?: (eventId?: string, eventTitle?: string, query?: string) => void;
}

export default function NewsStream({ onNavigateToThinking }: NewsStreamProps) {
  const [filter, setFilter] = useState<"all" | "featured" | "new" | "hot">("all");
  const [sort, setSort] = useState<"volume" | "liquidity" | "ending">("volume");
  const [inputQuery, setInputQuery] = useState("");

  // 使用事件 API Hook
  const { events, loading, error, refetch } = useEvents();

  const handleAnalysisClick = (eventId: string, eventTitle: string) => {
    if (onNavigateToThinking) {
      onNavigateToThinking(eventId, eventTitle);
    }
  };

  const handleQuerySubmit = () => {
    if (inputQuery.trim() && onNavigateToThinking) {
      onNavigateToThinking(undefined, undefined, inputQuery);
    }
  };

  // 过滤和排序事件
  const filteredEvents = events
    .filter((event) => {
      if (filter === "all") return true;
      if (filter === "featured") return event.featured;
      if (filter === "new") return event.new;
      if (filter === "hot") return (event.volume24hr || 0) > 100000;
      return true;
    })
    .sort((a, b) => {
      if (sort === "volume") return (b.volume24hr || 0) - (a.volume24hr || 0);
      if (sort === "liquidity") return (b.liquidity || 0) - (a.liquidity || 0);
      if (sort === "ending") {
        const aTime = new Date(a.endDate).getTime();
        const bTime = new Date(b.endDate).getTime();
        return aTime - bTime;
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-[#0F0F23] pb-32">
      {/* Header */}
      <Header title="News Stream" showSearch={true} />

      {/* Main Content */}
      <div className="px-8 py-6">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold">Trending</h2>
            <button
              onClick={refetch}
              disabled={loading}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              title="刷新"
            >
              <RefreshCw
                className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              {loading ? "加载中..." : `${filteredEvents.length} / ${events.length} events`}
            </span>
          </div>
        </div>

        {/* 过滤和排序栏 */}
        <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-gray-800">
          {/* 过滤器 */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">Filter:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === "all"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("featured")}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === "featured"
                    ? "bg-yellow-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                ⭐ Featured
              </button>
              <button
                onClick={() => setFilter("new")}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === "new"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                ✨ New
              </button>
              <button
                onClick={() => setFilter("hot")}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === "hot"
                    ? "bg-orange-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                🔥 Hot
              </button>
            </div>
          </div>

          {/* 分隔符 */}
          <div className="h-8 w-px bg-gray-700" />

          {/* 排序 */}
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">Sort by:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setSort("volume")}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  sort === "volume"
                    ? "bg-green-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                Volume
              </button>
              <button
                onClick={() => setSort("liquidity")}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  sort === "liquidity"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                Liquidity
              </button>
              <button
                onClick={() => setSort("ending")}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  sort === "ending"
                    ? "bg-red-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                <Clock className="w-4 h-4 inline mr-1" />
                Ending Soon
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onRetry={refetch} />
          </div>
        )}

        {/* Event Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            // Loading State
            <>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <EventCardSkeleton key={i} />
              ))}
            </>
          ) : filteredEvents.length === 0 ? (
            // Empty State
            <div className="col-span-full text-center py-20">
              <div className="text-gray-500 text-lg mb-2">No events found</div>
              <div className="text-gray-600 text-sm">Try adjusting your filters</div>
            </div>
          ) : (
            // Data State
            filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                id={event.id}
                title={event.title}
                description={event.description}
                image={event.image}
                icon={event.icon}
                markets={event.markets}
                volume={event.volume}
                volume24hr={event.volume24hr}
                liquidity={event.liquidity}
                commentCount={event.commentCount}
                endDate={event.endDate}
                featured={event.featured}
                new={event.new}
                active={event.active}
                closed={event.closed}
                competitive={event.competitive}
                onAnalysisClick={() => handleAnalysisClick(event.id, event.title)}
                onClick={() => {
                  // 可以在这里添加导航到详情页的逻辑
                  console.log('Clicked event:', event.id)
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-64 right-0 bg-[#0F0F23] border-t border-gray-800 p-6">
        <div className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleQuerySubmit()
              }
            }}
            placeholder="Ask me anything about Prediction Market"
            className="w-full bg-[#1A1A2E] border border-gray-700 rounded-lg px-6 py-4 pr-14 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button 
            onClick={handleQuerySubmit}
            disabled={!inputQuery.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
