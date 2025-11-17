"use client";

import { useMemo } from "react";

interface HolderData {
  proxyWallet: string;
  name: string;
  pseudonym: string;
  amount: number;
  bio?: string;
  profileImage?: string;
  profileImageOptimized?: string;
  verified: boolean;
  outcomeIndex: number;
  displayUsernamePublic?: boolean;
}

interface TopHoldersData {
  token: string;
  holders: HolderData[];
}

interface TopHoldersTableProps {
  topHoldersData: TopHoldersData;
  index?: number;
}

export default function TopHoldersTable({ topHoldersData, index = 0 }: TopHoldersTableProps) {
  const holders = topHoldersData.holders?.slice(0, 20) || [];
  
  // 计算持有者统计数据
  const stats = useMemo(() => {
    const totalAmount = holders.reduce((sum, holder) => sum + holder.amount, 0);
    const verifiedCount = holders.filter(h => h.verified).length;
    const avgAmount = holders.length > 0 ? totalAmount / holders.length : 0;
    const maxHolder = holders.length > 0 ? holders.reduce((max, h) => h.amount > max.amount ? h : max, holders[0]) : null;
    
    return {
      totalAmount,
      verifiedCount,
      avgAmount,
      maxHolder,
      holderCount: holders.length
    };
  }, [holders]);

  // 格式化钱包地址
  const formatAddress = (address: string) => {
    if (!address) return "N/A";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 格式化数量
  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K`;
    }
    return amount.toFixed(2);
  };

  // 获取持有占比
  const getPercentage = (amount: number) => {
    return stats.totalAmount > 0 ? ((amount / stats.totalAmount) * 100).toFixed(2) : "0.00";
  };

  return (
    <div className="bg-[#1A1A2E] border border-gray-800 rounded-xl p-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-2xl">🐋</span>
          <span className="text-white">Top Holders {index > 0 ? `#${index + 1}` : ""}</span>
        </h3>
        <div className="text-xs text-gray-400">
          Token: {topHoldersData.token.slice(0, 8)}...{topHoldersData.token.slice(-8)}
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-[#0D0D1A] rounded-lg p-3 border border-gray-800">
          <div className="text-xs text-gray-400 mb-1">持有人数</div>
          <div className="text-lg font-bold text-blue-400">{stats.holderCount}</div>
        </div>
        
        <div className="bg-[#0D0D1A] rounded-lg p-3 border border-gray-800">
          <div className="text-xs text-gray-400 mb-1">总持有量</div>
          <div className="text-lg font-bold text-purple-400">{formatAmount(stats.totalAmount)}</div>
        </div>
        
        <div className="bg-[#0D0D1A] rounded-lg p-3 border border-gray-800">
          <div className="text-xs text-gray-400 mb-1">平均持有</div>
          <div className="text-lg font-bold text-cyan-400">{formatAmount(stats.avgAmount)}</div>
        </div>
        
        <div className="bg-[#0D0D1A] rounded-lg p-3 border border-gray-800">
          <div className="text-xs text-gray-400 mb-1">认证用户</div>
          <div className="text-lg font-bold text-green-400">{stats.verifiedCount}</div>
        </div>
        
        <div className="bg-[#0D0D1A] rounded-lg p-3 border border-gray-800">
          <div className="text-xs text-gray-400 mb-1">最大持仓</div>
          <div className="text-lg font-bold text-yellow-400">
            {stats.maxHolder ? formatAmount(stats.maxHolder.amount) : "N/A"}
          </div>
        </div>
      </div>

      {/* 持有者列表 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-gray-400 text-xs border-b border-gray-800">
              <th className="text-left py-2 px-2 font-medium">排名</th>
              <th className="text-left py-2 px-2 font-medium">持有人</th>
              <th className="text-left py-2 px-2 font-medium">钱包地址</th>
              <th className="text-right py-2 px-2 font-medium">持有量</th>
              <th className="text-right py-2 px-2 font-medium">占比</th>
              <th className="text-center py-2 px-2 font-medium">结果</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {holders.map((holder, idx) => {
              const percentage = getPercentage(holder.amount);
              const displayName = holder.name || holder.pseudonym || formatAddress(holder.proxyWallet);
              
              return (
                <tr 
                  key={holder.proxyWallet} 
                  className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors"
                >
                  <td className="py-3 px-2">
                    <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      idx === 0 ? "bg-yellow-500/20 text-yellow-400" :
                      idx === 1 ? "bg-gray-400/20 text-gray-300" :
                      idx === 2 ? "bg-orange-500/20 text-orange-400" :
                      "bg-gray-700/20 text-gray-400"
                    }`}>
                      {idx + 1}
                    </div>
                  </td>
                  
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      {holder.profileImage || holder.profileImageOptimized ? (
                        <img 
                          src={holder.profileImageOptimized || holder.profileImage} 
                          alt={displayName}
                          className="w-6 h-6 rounded-full"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-white font-medium">{displayName}</span>
                          {holder.verified && (
                            <span className="text-blue-400" title="已认证">✓</span>
                          )}
                        </div>
                        {holder.bio && (
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">
                            {holder.bio}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="py-3 px-2">
                    <a 
                      href={`https://polygonscan.com/address/${holder.proxyWallet}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 font-mono text-xs"
                    >
                      {formatAddress(holder.proxyWallet)}
                    </a>
                  </td>
                  
                  <td className="py-3 px-2 text-right">
                    <div className="font-mono font-bold text-white">
                      {formatAmount(holder.amount)}
                    </div>
                  </td>
                  
                  <td className="py-3 px-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                          style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
                        />
                      </div>
                      <span className="text-purple-400 font-medium w-12 text-right">
                        {percentage}%
                      </span>
                    </div>
                  </td>
                  
                  <td className="py-3 px-2 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      holder.outcomeIndex === 0 ? "bg-red-500/20 text-red-400" :
                      holder.outcomeIndex === 1 ? "bg-green-500/20 text-green-400" :
                      "bg-gray-500/20 text-gray-400"
                    }`}>
                      {holder.outcomeIndex === 0 ? "NO" : holder.outcomeIndex === 1 ? "YES" : "N/A"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {holders.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          暂无持有者数据
        </div>
      )}
    </div>
  );
}
