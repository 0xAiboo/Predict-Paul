"use client";

import { ExternalLink } from "lucide-react";

interface NewsArticle {
  title: string;
  source: string;
  time: string;
  url: string;
  icon?: string; // 图标URL或文本
  description?: string;
}

interface NewsTableProps {
  articles: NewsArticle[];
}

export default function NewsTable({ articles }: NewsTableProps) {
  // 格式化时间
  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}/${month}/${day}`;
    } catch {
      return timeStr;
    }
  };

  // 根据索引生成不同的渐变色
  const getGradientColor = (idx: number) => {
    const gradients = [
      "from-pink-500 to-rose-500",      // 粉红色
      "from-cyan-500 to-teal-500",      // 青色
      "from-purple-500 to-indigo-500",  // 紫色
      "from-blue-500 to-indigo-600",    // 蓝色
      "from-orange-500 to-red-500",     // 橙红色
      "from-green-500 to-emerald-500",  // 绿色
    ];
    return gradients[idx % gradients.length];
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-800">
      {/* 表格容器 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          {/* 表头 */}
          <thead>
            <tr className="bg-[#E8EBF0] border-b border-gray-300">
              <th className="text-left px-5 py-3 text-sm font-normal text-gray-700 w-[35%]">
                Article Title Name
              </th>
              <th className="text-left px-5 py-3 text-sm font-normal text-gray-700 w-[20%]">
                Source
              </th>
              <th className="text-left px-5 py-3 text-sm font-normal text-gray-700 w-[15%]">
                Time
              </th>
              <th className="text-left px-5 py-3 text-sm font-normal text-gray-700 w-[30%]">
                Article link
              </th>
            </tr>
          </thead>

          {/* 表体 */}
          <tbody className="bg-[#1A1D2E]">
            {articles.map((article, idx) => (
              <tr
                key={idx}
                className="border-b border-gray-700 last:border-b-0 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
              >
                {/* 文章标题 */}
                <td className="px-5 py-4 text-sm text-white align-top">
                  <div className="line-clamp-2 leading-normal">
                    {article.title}
                  </div>
                </td>

                {/* 来源 */}
                <td className="px-5 py-4 text-sm text-white align-top">
                  {article.source}
                </td>

                {/* 时间 */}
                <td className="px-5 py-4 text-sm text-white align-top">
                  {formatTime(article.time)}
                </td>

                {/* 文章链接 */}
                <td className="px-5 py-4 align-top">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2.5 text-sm group"
                  >
                    {/* 图标 */}
                    {/* <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getGradientColor(idx)} flex items-center justify-center flex-shrink-0 overflow-hidden shadow-lg`}>
                      {article.icon ? (
                        // 如果是图片 URL
                        article.icon.startsWith('http') ? (
                          <img
                            src={article.icon}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // 图片加载失败时显示文字
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextSibling) {
                                (e.currentTarget.nextSibling as HTMLElement).style.display = 'block';
                              }
                            }}
                          />
                        ) : (
                          // 如果是文本，显示首字母
                          <span className="text-xs font-bold text-white">
                            {article.icon.substring(0, 2).toUpperCase()}
                          </span>
                        )
                      ) : (
                        
                        <ExternalLink className="w-4 h-4 text-white" />
                      )}
                    </div> */}

                    {/* 链接文本 */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="truncate underline text-white hover:text-gray-300 transition-colors">
                        {article.description || article.title}
                      </div>
                    </div>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 空状态 */}
      {articles.length === 0 && (
        <div className="px-4 py-8 text-center text-gray-500">
          <p className="text-sm">No news articles found</p>
        </div>
      )}
    </div>
  );
}

