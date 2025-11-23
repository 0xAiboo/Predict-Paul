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
      // 使用新的正则表达式来测试，避免全局标志的 lastIndex 问题
      const isUrl = /^https?:\/\/[^\s]+$/.test(part);
      if (isUrl) {
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
    <div className="bg-[rgba(28,30,43,1)] border border-gray-800 rounded-lg overflow-hidden hover:border-gray-700 transition-all">
      <div className="p-4">
        {/* 用户信息头部 */}
        <div className="flex items-start gap-3 mb-3">
          {/* X (Twitter) 图标 */}
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0">
              <svg
              className="w-4 h-4 text-black"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-medium text-sm">
                {user_screen_name}
              </span>
            </div>
          </div>
        </div>

        {/* 推文内容 */}
        <div className="text-gray-300 text-sm mb-3 leading-relaxed whitespace-pre-wrap break-words">
          {renderText(full_text)}
        </div>

        {/* Show more 按钮 */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-gray-300 transition-colors inline-block"
          onClick={(e) => e.stopPropagation()}
        >
          Show more
        </a>
        </div>
    </div>
  );
}

