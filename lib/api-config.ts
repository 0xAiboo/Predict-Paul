// API 配置文件

/**
 * API 基础 URL
 * 开发环境和生产环境都使用反向代理
 * 请求会被重写到后端服务器：http://51.79.173.45:8000
 */
export const API_BASE_URL = ''

/**
 * API 端点配置
 * 所有路径都使用 /api 前缀，会通过反向代理转发到后端
 */
export const API_ENDPOINTS = {
  // 事件相关
  events: '/api/event',
  eventDetail: (id: string) => `/api/event/${id}`,
  
  // 市场相关
  markets: '/api/markets',
  marketDetail: (id: string) => `/api/markets/${id}`,
  trending: '/api/markets/trending',
  
  // 分析相关
  analysis: '/api/analysis',
  newsAnalysis: '/api/analysis/news',
  thinkingProcess: '/api/analysis/thinking',
  analyze: '/api/analyze',
  
  // 历史记录
  history: '/api/history',
  
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

/**
 * 获取完整的 API URL
 * @param endpoint - API 端点路径
 * @returns 完整的 API URL
 */
export const getApiUrl = (endpoint: string): string => {
  // 如果端点已经包含完整 URL，直接返回
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint
  }
  
  // 否则使用相对路径（通过反向代理）
  return endpoint
}

