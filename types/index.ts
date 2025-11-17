// 市场类型定义
export interface Market {
  id: string
  title: string
  subtitle?: string
  description?: string
  tags?: string[]
  options?: MarketOption[]
  volume: string
  volumeUSD?: number
  time: string
  deadline?: string
  status: 'active' | 'binary' | 'closed' | 'resolved'
  category?: string
  platform?: string
  imageUrl?: string
}

export interface MarketOption {
  label: string
  value: boolean | string
  percentage?: number
  price?: number
}

// 分析类型定义
export interface Analysis {
  id: string
  question: string
  prediction: 'yes' | 'no' | string
  confidence?: number
  tableOfContents?: AnalysisSection[]
  sections?: AnalysisContent[]
  generatedAt: string
  marketInfo?: {
    volume: string
    time: string
    currentPrice?: number
  }
}

export interface AnalysisSection {
  id: string
  title: string
  order: number
}

export interface AnalysisContent {
  id: string
  sectionId: string
  title: string
  content: string
  type: 'news' | 'rumor' | 'trade' | 'whales' | 'prediction'
}

// Agent 类型定义
export interface Agent {
  id: string
  type: 'social' | 'news' | 'tech' | 'whales'
  name: string
  status: 'thinking' | 'completed' | 'error'
  message: string
  icon?: string
  data?: any
}

// 思考过程类型定义
export interface ThinkingProcess {
  id: string
  question: string
  agents: Agent[]
  relatedTweets?: Tweet[]
  thinkingContent?: string
  generatedAt: string
}

export interface Tweet {
  id: string
  author: string
  username?: string
  content: string
  imageUrl?: string
  link?: string
  timestamp?: string
  followers?: number
  verified?: boolean
  type?: 'news' | 'analysis' | 'tweet'
  sentiment?: string
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// 搜索类型
export interface SearchParams {
  query?: string
  category?: string
  platform?: string
  sort?: 'volume' | 'recent' | 'ending'
  page?: number
  pageSize?: number
}

// 预测请求类型
export interface PredictionRequest {
  marketId: string
  option: string
  amount: number
}

// 子市场类型定义
export interface SubMarket {
  id: string
  question: string
  conditionId?: string
  slug?: string
  groupItemTitle: string
  outcomePrices: string  // JSON string of prices array
  outcomes?: string  // JSON string of outcomes array
  volume?: string
  volume24hr?: number
  liquidity?: string
  lastTradePrice?: number
  active?: boolean
  closed?: boolean
  image?: string
  icon?: string
  description?: string
  endDate?: string
  startDate?: string
}

// 事件类型定义
export interface Event {
  id: string
  ticker: string
  slug: string
  title: string
  description?: string
  resolutionSource?: string
  startDate: string
  creationDate: string
  endDate: string
  image?: string
  icon?: string
  active?: boolean
  closed?: boolean
  archived?: boolean
  new?: boolean
  featured?: boolean
  restricted?: boolean
  liquidity?: number
  volume?: number
  volume24hr?: number
  volume1wk?: number
  volume1mo?: number
  volume1yr?: number
  openInterest?: number
  competitive?: number
  commentCount?: number
  enableOrderBook?: boolean
  liquidityClob?: number
  negRisk?: boolean
  negRiskMarketID?: string
  markets?: SubMarket[]
  sortBy?: string
  createdAt?: string
  updatedAt?: string
}

// 分析请求类型
export interface AnalyzeRequest {
  event_id?: string
  query?: string
  session_id?: string
}

// SSE 事件类型
export interface SSEEvent {
  type: string
  [key: string]: any
}

// 工具调用类型
export interface ToolCall {
  id: string
  tool_name: string
  tool_input?: any
  timestamp: string
}

// 推理项类型
export interface ReasoningItem {
  id: string
  content: string
  timestamp: string
}

// 日志类型
export interface LogItem {
  id: string
  level: string
  message: string
  timestamp: string
}

// 历史记录类型
export interface HistoryItem {
  id: string
  session_id: string
  question: string
  event_id?: string
  event_title?: string
  created_at: string
  updated_at: string
}

