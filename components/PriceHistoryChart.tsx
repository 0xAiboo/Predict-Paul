"use client";

interface PriceHistoryData {
  history: Array<{ t: number; p: number }>;
}

interface PriceHistoryChartProps {
  priceHistory: PriceHistoryData;
  index?: number;
}

export default function PriceHistoryChart({ priceHistory, index = 0 }: PriceHistoryChartProps) {
  const data = priceHistory.history || [];
  
  if (data.length === 0) {
    return (
      <div className="bg-[#1A1A2E] border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <span className="text-2xl">📈</span>
          价格走势图
        </h3>
        <div className="text-center py-12 text-gray-500">
          暂无价格数据
        </div>
      </div>
    );
  }
  
  // 计算价格范围
  const prices = data.map(d => d.p);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 0.0001; // 避免除以0
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  
  // 计算价格变化
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const priceChange = lastPrice - firstPrice;
  const priceChangePercent = (priceChange / firstPrice) * 100;
  
  // 计算波动率（标准差）
  const variance = prices.reduce((acc, p) => acc + Math.pow(p - avgPrice, 2), 0) / prices.length;
  const volatility = Math.sqrt(variance);
  const volatilityPercent = (volatility / avgPrice) * 100;
  
  // 计算移动平均线 (MA5)
  const calculateMA = (period: number) => {
    const ma: Array<{ x: number; y: number } | null> = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        ma.push(null);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((acc, d) => acc + d.p, 0);
        const avg = sum / period;
        const x = (i / (data.length - 1)) * 1000;
        const y = 190 - ((avg - minPrice) / priceRange) * 180;
        ma.push({ x, y });
      }
    }
    return ma;
  };
  
  const ma5 = calculateMA(5);
  
  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };
  
  // 计算时间跨度
  const timeSpan = data[data.length - 1].t - data[0].t;
  const hours = Math.floor(timeSpan / 3600);
  const minutes = Math.floor((timeSpan % 3600) / 60);
  
  // 判断涨跌（决定颜色）
  const isPositive = priceChange >= 0;
  
  return (
    <div className="bg-[#181A20] border border-[#2B3139] rounded-xl p-6 animate-fadeIn">
      {/* 标题栏 - 币安风格 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-semibold text-[#EAECEF]">
            价格走势 {index > 0 && `#${index + 1}`}
          </h3>
          <div className="flex items-center gap-2 text-xs text-[#848E9C]">
            <span>⏱</span>
            <span>{hours > 0 ? `${hours}h ` : ''}{minutes}m</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#848E9C]">数据点</span>
            <span className="text-sm font-mono text-[#EAECEF]">{data.length}</span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded font-bold ${
            isPositive 
              ? 'bg-[#0ECB81]/10 text-[#0ECB81]' 
              : 'bg-[#F6465D]/10 text-[#F6465D]'
          }`}>
            <span className="text-base">{isPositive ? '▲' : '▼'}</span>
            <span className="text-sm font-mono">
              {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
      
      {/* SVG 图表 - 币安风格 */}
      <div className="relative h-80 bg-[#0B0E11] rounded-lg p-4">
        <svg className="w-full h-full" viewBox="0 0 1000 250" preserveAspectRatio="none">
          {/* 网格线 */}
          <g stroke="#1E2329" strokeWidth="1" opacity="0.5">
            <line x1="0" y1="50" x2="1000" y2="50"/>
            <line x1="0" y1="100" x2="1000" y2="100"/>
            <line x1="0" y1="150" x2="1000" y2="150"/>
            <line x1="0" y1="200" x2="1000" y2="200"/>
          </g>
          
          {/* 渐变定义 - 金黄色系 */}
          <defs>
            <linearGradient id={`priceGradient${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isPositive ? "#F0B90B" : "#F6465D"} stopOpacity="0.5"/>
              <stop offset="50%" stopColor={isPositive ? "#F0B90B" : "#F6465D"} stopOpacity="0.25"/>
              <stop offset="100%" stopColor={isPositive ? "#F0B90B" : "#F6465D"} stopOpacity="0"/>
            </linearGradient>
          </defs>
          
          {/* 移动平均线 MA5 */}
          <polyline
            points={ma5.filter(p => p !== null).map(p => `${p!.x},${p!.y}`).join(' ')}
            fill="none"
            stroke="#848E9C"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.6"
          />
          
          {/* 价格区域填充 */}
          <polygon
            points={
              data.map((d, i) => {
                const x = (i / (data.length - 1)) * 1000;
                const y = 240 - ((d.p - minPrice) / priceRange) * 230;
                return `${x},${y}`;
              }).join(' ') + 
              ` 1000,240 0,240`
            }
            fill={`url(#priceGradient${index})`}
          />
          
          {/* 价格线 - 币安金黄色 */}
          <polyline
            points={data.map((d, i) => {
              const x = (i / (data.length - 1)) * 1000;
              const y = 240 - ((d.p - minPrice) / priceRange) * 230;
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke={isPositive ? "#F0B90B" : "#F6465D"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        
        {/* MA 指标显示 */}
        <div className="absolute top-2 left-2 flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-[#848E9C]"></div>
            <span className="text-[#848E9C] font-mono">MA(5): {ma5[ma5.length - 1] ? ((ma5[ma5.length - 1]!.y - 240) * priceRange / -230 + minPrice).toFixed(4) : '-'}</span>
          </div>
        </div>
      </div>
      
      {/* 统计信息 - 币安风格 */}
      <div className="mt-4 grid grid-cols-6 gap-3">
        <div className="bg-[#0B0E11] border border-[#2B3139] rounded-lg p-3 hover:bg-[#1E2329] transition-colors">
          <div className="text-xs text-[#848E9C] mb-1">最低</div>
          <div className="text-sm font-mono font-semibold text-[#F6465D]">
            {minPrice.toFixed(4)}
          </div>
        </div>
        <div className="bg-[#0B0E11] border border-[#2B3139] rounded-lg p-3 hover:bg-[#1E2329] transition-colors">
          <div className="text-xs text-[#848E9C] mb-1">最高</div>
          <div className="text-sm font-mono font-semibold text-[#0ECB81]">
            {maxPrice.toFixed(4)}
          </div>
        </div>
        <div className="bg-[#0B0E11] border border-[#2B3139] rounded-lg p-3 hover:bg-[#1E2329] transition-colors">
          <div className="text-xs text-[#848E9C] mb-1">平均</div>
          <div className="text-sm font-mono font-semibold text-[#F0B90B]">
            {avgPrice.toFixed(4)}
          </div>
        </div>
        <div className="bg-[#0B0E11] border border-[#2B3139] rounded-lg p-3 hover:bg-[#1E2329] transition-colors">
          <div className="text-xs text-[#848E9C] mb-1">当前</div>
          <div className={`text-sm font-mono font-semibold ${isPositive ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            {lastPrice.toFixed(4)}
          </div>
        </div>
        <div className="bg-[#0B0E11] border border-[#2B3139] rounded-lg p-3 hover:bg-[#1E2329] transition-colors">
          <div className="text-xs text-[#848E9C] mb-1">振幅</div>
          <div className="text-sm font-mono font-semibold text-[#F0B90B]">
            {priceRange.toFixed(4)}
          </div>
        </div>
        <div className="bg-[#0B0E11] border border-[#2B3139] rounded-lg p-3 hover:bg-[#1E2329] transition-colors">
          <div className="text-xs text-[#848E9C] mb-1 flex items-center gap-1" title="价格波动率">
            波动率
          </div>
          <div className="text-sm font-mono font-semibold text-[#F0B90B]">
            {volatilityPercent.toFixed(2)}%
          </div>
        </div>
      </div>
      
      {/* 时间范围 - 币安风格 */}
      <div className="mt-3 flex justify-between text-xs text-[#848E9C] px-1">
        <span>{formatTime(data[0].t)}</span>
        <span>{formatTime(data[Math.floor(data.length / 2)].t)}</span>
        <span>{formatTime(data[data.length - 1].t)}</span>
      </div>
    </div>
  );
}

