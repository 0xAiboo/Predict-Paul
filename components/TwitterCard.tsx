"use client";

import { MessageCircle, Repeat2, Heart, Quote, ExternalLink } from "lucide-react";

interface TwitterCardProps {
  id_str: string;
  favorite_count: number;
  reply_count: number;
  quote_count: number;
  retweet_count: number;
  full_text: string;
  user_screen_name: string;
  user_icon: string;
  url: string;
}

export default function TwitterCard({
  id_str,
  favorite_count,
  reply_count,
  quote_count,
  retweet_count,
  full_text,
  user_screen_name,
  user_icon,
  url,
}: TwitterCardProps) {
  // 格式化数字（K, M 单位）
  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // 处理推文文本（提取链接、hashtags 等）
  const renderText = (text: string) => {
    // 简单的 URL 检测和替换
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="bg-[#1A1A2E] border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all hover:shadow-lg hover:shadow-blue-500/10">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-4 cursor-pointer"
      >
        {/* 用户信息头部 */}
        <div className="flex items-start gap-3 mb-3">
          <img
            src={user_icon}
            alt={user_screen_name}
            className="w-12 h-12 rounded-full flex-shrink-0"
            onError={(e) => {
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${user_screen_name}&background=1DA1F2&color=fff`;
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold truncate">
                @{user_screen_name}
              </span>
              {/* Twitter 蓝标 */}
              <svg
                className="w-4 h-4 text-blue-400 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M22.46 6c-.85.38-1.78.64-2.75.76 1-.6 1.76-1.55 2.12-2.68-.93.55-1.96.95-3.06 1.17-.88-.94-2.13-1.53-3.52-1.53-2.66 0-4.82 2.16-4.82 4.82 0 .38.04.75.13 1.1-4-.2-7.54-2.12-9.91-5.04-.42.72-.66 1.55-.66 2.44 0 1.67.85 3.14 2.14 4-.79-.03-1.53-.24-2.18-.6v.06c0 2.34 1.66 4.29 3.87 4.73-.4.11-.83.17-1.27.17-.31 0-.62-.03-.92-.08.62 1.94 2.43 3.35 4.57 3.39-1.67 1.31-3.77 2.09-6.05 2.09-.39 0-.78-.02-1.17-.07 2.18 1.4 4.77 2.21 7.55 2.21 9.06 0 14-7.5 14-14 0-.21 0-.42-.02-.63.96-.69 1.8-1.56 2.46-2.55z" />
              </svg>
            </div>
            <div className="text-gray-400 text-sm">
              {new Date().toLocaleDateString("zh-CN")}
            </div>
          </div>
        </div>

        {/* 推文内容 */}
        <div className="text-gray-200 mb-3 leading-relaxed whitespace-pre-wrap break-words">
          {renderText(full_text)}
        </div>

        {/* 互动数据 */}
        <div className="flex items-center gap-6 pt-3 border-t border-gray-800">
          {/* 回复 */}
          <div className="flex items-center gap-1.5 text-gray-400 hover:text-blue-400 transition-colors group">
            <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">{formatCount(reply_count)}</span>
          </div>

          {/* 转发 */}
          <div className="flex items-center gap-1.5 text-gray-400 hover:text-green-400 transition-colors group">
            <Repeat2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">{formatCount(retweet_count)}</span>
          </div>

          {/* 点赞 */}
          <div className="flex items-center gap-1.5 text-gray-400 hover:text-pink-400 transition-colors group">
            <Heart className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">{formatCount(favorite_count)}</span>
          </div>

          {/* 引用 */}
          {quote_count > 0 && (
            <div className="flex items-center gap-1.5 text-gray-400 hover:text-purple-400 transition-colors group">
              <Quote className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">{formatCount(quote_count)}</span>
            </div>
          )}

          {/* 外部链接 */}
          <div className="ml-auto flex items-center gap-1.5 text-gray-400 hover:text-blue-400 transition-colors group">
            <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-xs">查看原文</span>
          </div>
        </div>
      </a>
    </div>
  );
}

