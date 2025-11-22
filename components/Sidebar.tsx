"use client";

import { Menu } from "lucide-react";
import Image from "next/image";
import { useUserHistory } from "@/hooks/useUserHistory";
import { authService } from "@/lib/api-services";
import type { HistoryItem } from "@/types";

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: "news-stream" | "thinking-process") => void;
  onHistoryItemClick?: (item: HistoryItem) => void;
  onUserSessionClick?: (sessionId: string, title: string) => void;
}

export default function Sidebar({
  currentPage,
  setCurrentPage,
  onHistoryItemClick,
  onUserSessionClick,
}: SidebarProps) {
  const { sessions, loading } = useUserHistory();
  const { userId } = authService.getUserInfo();

  const handleHistoryItemClick = (item: HistoryItem) => {
    if (onHistoryItemClick) {
      onHistoryItemClick(item);
    }
  };

  const handleSessionClick = (sessionId: string, title: string) => {
    if (onUserSessionClick) {
      onUserSessionClick(sessionId, title);
    }
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;

    return date.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    });
  };

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
        onClick={() => setCurrentPage("news-stream")}
        className="px-[20px]"
      >
        <img src="/newChat.png" alt="New Chat" className="w-full" />
      </button>
      <div className="text-[12px] text-[rgba(113,119,132,1)] font-medium pt-[24px] pl-[20px] pb-[12px]">
        History Analysls
      </div>
      {/* 用户会话历史 */}
      <div className="flex-1 overflow-y-auto px-4">
        {!userId ? (
          <div className="text-center py-8 px-4">
            <p className="text-xs text-gray-500">连接钱包查看历史</p>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-gray-800/50 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="text-4xl mb-2">📝</div>
            <p className="text-xs text-gray-500">暂无历史记录</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <button
                key={session.session_id}
                onClick={() =>
                  handleSessionClick(session.session_id, session.title)
                }
                className="w-full text-left p-3 rounded-lg hover:bg-gray-800 transition-colors group"
              >
                <div
                  className="text-sm font-medium text-gray-200 group-hover:text-white 
                              line-clamp-2 mb-1"
                >
                  {session.title}
                </div>
                <div className="text-xs text-gray-500">
                  {formatTime(session.create_time)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
