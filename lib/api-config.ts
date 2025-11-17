// API 配置文件
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://51.79.173.45:8000'

export const API_ENDPOINTS = {
  // 市场相关
  markets: '/api/markets',
  marketDetail: (id: string) => `/api/markets/${id}`,
  trending: '/api/markets/trending',
  
  // 事件相关
  events: '/event',
  
  // 分析相关
  analysis: '/api/analysis',
  newsAnalysis: '/api/analysis/news',
  thinkingProcess: '/api/analysis/thinking',
  analyze: '/analyze',
  
  // 历史记录相关
  history: '/history',
  
  // Agent 相关
  agents: '/api/agents',
  socialAgent: '/api/agents/social',
  newsAgent: '/api/agents/news',
  techAgent: '/api/agents/tech',
  whalesAgent: '/api/agents/whales',
  
  // 预测相关
  predictions: '/api/predictions',
  createPrediction: '/api/predictions/create',
  
  // 搜索
  search: '/api/search',
}

