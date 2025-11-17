"use client";

import { useMemo } from "react";

interface OrderbookData {
  market: string;
  asset_id: string;
  timestamp: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
}

interface OrderbookTableProps {
  orderbook: OrderbookData;
  index?: number;
}

export default function OrderbookTable({ orderbook, index = 0 }: OrderbookTableProps) {
  const bids = orderbook.bids?.slice(0, 15) || [];
  const asks = orderbook.asks?.slice(0, 15) || [];
  
  // 计算买卖盘总量和价差
  const stats = useMemo(() => {
    const totalBidVolume = bids.reduce((sum, bid) => sum + parseFloat(bid.size), 0);
    const totalAskVolume = asks.reduce((sum, ask) => sum + parseFloat(ask.size), 0);
    const totalBidValue = bids.reduce((sum, bid) => sum + parseFloat(bid.price) * parseFloat(bid.size), 0);
    const totalAskValue = asks.reduce((sum, ask) => sum + parseFloat(ask.price) * parseFloat(ask.size), 0);
    
    const bestBid = bids.length > 0 ? parseFloat(bids[0].price) : 0;
    const bestAsk = asks.length > 0 ? parseFloat(asks[0].price) : 0;
    const spread = bestAsk - bestBid;
    const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0;
    
    return {
      totalBidVolume,
      totalAskVolume,
      totalBidValue,
      totalAskValue,
      bestBid,
      bestAsk,
      spread,
      spreadPercent,
      midPrice: (bestBid + bestAsk) / 2
    };
  }, [bids, asks]);

  return (
    <div className="bg-[#1A1A2E] border border-gray-800 rounded-xl p-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-2xl">📊</span>
          订单簿 {index > 0 && `#${index + 1}`}
        </h3>
        <span className="text-xs text-gray-500">
          {new Date(parseInt(orderbook.timestamp)).toLocaleTimeString('zh-CN')}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        {/* 买单 (Bids) */}
        <div>
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-700">
            <h4 className="text-sm font-medium text-green-400">买单 (Bids)</h4>
            <span className="text-xs text-gray-500">{bids.length} 条</span>
          </div>
          <div className="space-y-1.5 max-h-80 overflow-y-auto scrollbar-hide">
            {bids.length > 0 ? (
              bids.map((bid, idx) => {
                const price = parseFloat(bid.price);
                const size = parseFloat(bid.size);
                const total = price * size;
                
                return (
                  <div 
                    key={idx} 
                    className="flex justify-between items-center text-sm hover:bg-green-500/5 px-2 py-1.5 rounded transition-colors"
                  >
                    <span className="text-green-400 font-mono font-medium">
                      {price.toFixed(4)}
                    </span>
                    <span className="text-gray-400 font-mono text-xs">
                      {size.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-gray-500 font-mono text-xs">
                      {total.toFixed(2)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                暂无买单数据
              </div>
            )}
          </div>
        </div>
        
        {/* 卖单 (Asks) */}
        <div>
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-700">
            <h4 className="text-sm font-medium text-red-400">卖单 (Asks)</h4>
            <span className="text-xs text-gray-500">{asks.length} 条</span>
          </div>
          <div className="space-y-1.5 max-h-80 overflow-y-auto scrollbar-hide">
            {asks.length > 0 ? (
              asks.map((ask, idx) => {
                const price = parseFloat(ask.price);
                const size = parseFloat(ask.size);
                const total = price * size;
                
                return (
                  <div 
                    key={idx} 
                    className="flex justify-between items-center text-sm hover:bg-red-500/5 px-2 py-1.5 rounded transition-colors"
                  >
                    <span className="text-red-400 font-mono font-medium">
                      {price.toFixed(4)}
                    </span>
                    <span className="text-gray-400 font-mono text-xs">
                      {size.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-gray-500 font-mono text-xs">
                      {total.toFixed(2)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                暂无卖单数据
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 统计信息 */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        {/* 买卖价差 */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-green-400 mb-1">最佳买价</div>
            <div className="text-sm font-mono font-bold text-white">
              {stats.bestBid.toFixed(4)}
            </div>
          </div>
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 text-center">
            <div className="text-xs text-purple-300 mb-1">买卖价差</div>
            <div className="text-sm font-mono font-bold text-purple-400">
              {stats.spread.toFixed(4)}
              <span className="text-xs ml-1">({stats.spreadPercent.toFixed(3)}%)</span>
            </div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-red-400 mb-1">最佳卖价</div>
            <div className="text-sm font-mono font-bold text-white">
              {stats.bestAsk.toFixed(4)}
            </div>
          </div>
        </div>
        
        {/* 市场深度 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-900/10 border border-green-500/20 rounded-lg p-3">
            <div className="text-xs text-green-400 mb-2 flex items-center justify-between">
              <span>买盘总量</span>
              <span className="font-mono">{stats.totalBidVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="text-xs text-gray-400 flex items-center justify-between">
              <span>买盘总值</span>
              <span className="font-mono">{stats.totalBidValue.toFixed(2)}</span>
            </div>
          </div>
          <div className="bg-red-900/10 border border-red-500/20 rounded-lg p-3">
            <div className="text-xs text-red-400 mb-2 flex items-center justify-between">
              <span>卖盘总量</span>
              <span className="font-mono">{stats.totalAskVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="text-xs text-gray-400 flex items-center justify-between">
              <span>卖盘总值</span>
              <span className="font-mono">{stats.totalAskValue.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {/* 列标题说明 */}
        <div className="mt-3 grid grid-cols-2 gap-6 text-xs text-gray-500">
          <div className="flex justify-between px-2">
            <span>价格</span>
            <span>数量</span>
            <span>总额</span>
          </div>
          <div className="flex justify-between px-2">
            <span>价格</span>
            <span>数量</span>
            <span>总额</span>
          </div>
        </div>
      </div>
    </div>
  );
}

