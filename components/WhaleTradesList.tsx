import React, { useState } from 'react';

interface TradeData {
  proxyWallet: string;
  side: "BUY" | "SELL";
  asset: string;
  size: number;
  price: number;
  timestamp: number;
  title: string;
  outcome: string;
  outcomeIndex: number;
}

interface TopHoldersData {
  token?: string;
  trades?: TradeData[];
}

interface WhaleTradesListProps {
  tradesData: TopHoldersData;
}

export default function WhaleTradesList({ tradesData }: WhaleTradesListProps) {
  const [copiedAddress, setCopiedAddress] = useState<string>('');
  
  // 提取交易列表
  const trades = tradesData.trades || [];
  
  // 如果没有交易数据，不渲染
  if (trades.length === 0) {
    return null;
  }

  // 格式化钱包地址
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-7)}`;
  };

  // 计算交易金额（USD）
  const formatTradeValue = (size: number, price: number) => {
    const value = size * price;
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  // 复制地址到剪贴板
  const copyToClipboard = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(''), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 格式化百分比
  const formatPercentage = (price: number) => {
    return (price * 100).toFixed(1);
  };

  return (
    <div className="bg-[#1A1A2E] border border-gray-800 rounded-2xl p-6 animate-fadeIn">
      {/* 标题区域 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-8 h-8 bg-green-500/10 rounded-lg">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white">Whales Activities</h3>
      </div>

      {/* 简介文字 */}
    

      {/* 交易列表 */}
      <div className="space-y-2">
        {trades.slice(0, 20).map((trade, idx) => (
          <div
            key={`${trade.proxyWallet}-${trade.timestamp}-${idx}`}
            className="bg-[#0D0D1A] border border-gray-800 rounded-lg px-4 py-3 hover:border-gray-700 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm flex-wrap">
              {/* 钱包地址 */}
              <a
                href={`https://polygonscan.com/address/${trade.proxyWallet}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-200 font-mono transition-colors"
              >
                {formatAddress(trade.proxyWallet)}
              </a>

              {/* 复制按钮 */}
              <button
                onClick={() => copyToClipboard(trade.proxyWallet)}
                className="text-gray-600 hover:text-gray-400 transition-colors p-0.5"
                title="复制地址"
              >
                {copiedAddress === trade.proxyWallet ? (
                  <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>

              {/* 操作类型 */}
              <span className={`font-semibold ${
                trade.side === "BUY" 
                  ? "text-green-400" 
                  : "text-red-400"
              }`}>
                {trade.side === "BUY" ? "Bought" : "Sold"}
              </span>

              {/* 交易金额 */}
              <span className="text-yellow-400 font-bold">
                {formatTradeValue(trade.size, trade.price)}
              </span>

              {/* 结果方向 */}
              <span className="text-white font-medium">
                {trade.outcome.toUpperCase()}
              </span>

              {/* at */}
              <span className="text-gray-500">at</span>

              {/* 价格百分比 */}
              <span className="text-white font-semibold">
                {formatPercentage(trade.price)}%
              </span>

              {/* on */}
              <span className="text-gray-500">on</span>

              {/* 市场标题 */}
              <span className="text-white flex-1 min-w-[300px]">
                {trade.title}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 统计信息 */}
      {trades.length > 20 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          显示前 20 条交易，共 {trades.length} 条
        </div>
      )}
    </div>
  );
}

