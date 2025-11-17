import { get, post } from "./api";
import { API_ENDPOINTS, API_BASE_URL } from "./api-config";
import type {
  Market,
  Analysis,
  ThinkingProcess,
  ApiResponse,
  PaginatedResponse,
  SearchParams,
  PredictionRequest,
  Event,
  AnalyzeRequest,
  SSEEvent,
  HistoryItem,
} from "@/types";

// 事件服务
export const eventService = {
  // 获取所有事件
  getEvents: async () => {
    return get<{ status: string; data: Event[]; code: number }>(
      API_ENDPOINTS.events
    );
  },
};

// 市场服务
export const marketService = {
  // 获取所有市场
  getMarkets: async (params?: SearchParams) => {
    return get<PaginatedResponse<Market>>(API_ENDPOINTS.markets, params);
  },

  // 获取趋势市场
  getTrending: async (params?: {
    platform?: string;
    sort?: string;
    limit?: number;
  }) => {
    return get<ApiResponse<Market[]>>(API_ENDPOINTS.trending, params);
  },

  // 获取市场详情
  getMarketDetail: async (id: string) => {
    return get<ApiResponse<Market>>(API_ENDPOINTS.marketDetail(id));
  },

  // 搜索市场
  searchMarkets: async (query: string, params?: SearchParams) => {
    return get<PaginatedResponse<Market>>(API_ENDPOINTS.search, {
      query,
      ...params,
    });
  },
};

// 分析服务
export const analysisService = {
  // 获取新闻分析
  getNewsAnalysis: async (marketId: string) => {
    return get<ApiResponse<Analysis>>(API_ENDPOINTS.newsAnalysis, { marketId });
  },

  // 创建新分析
  createAnalysis: async (question: string) => {
    return post<ApiResponse<Analysis>>(API_ENDPOINTS.analysis, { question });
  },

  // 获取思考过程
  getThinkingProcess: async (analysisId: string) => {
    return get<ApiResponse<ThinkingProcess>>(API_ENDPOINTS.thinkingProcess, {
      analysisId,
    });
  },

  // 创建分析请求（SSE 流）- 使用 POST 方法，参数通过 body 传递
  createAnalyzeStream: (
    params: AnalyzeRequest,
    onMessage: (event: SSEEvent) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void
  ) => {
    // 使用 fetch API 发送 POST 请求并处理 SSE 流
    const controller = new AbortController();
    const signal = controller.signal;

    // 构建 body 参数，只包含存在的字段
    const body: any = {};
    if (params.event_id) {
      body.event_id = params.event_id;
    }
    if (params.query) {
      body.query = params.query;
    }
    if (params.session_id) {
      body.session_id = params.session_id;
    }

    fetch(`${API_BASE_URL}${API_ENDPOINTS.analyze}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
      signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("Response body is not readable");
        }

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            if (onComplete) {
              onComplete();
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const jsonStr = line.slice(6); // Remove 'data: ' prefix
                const data = JSON.parse(jsonStr);
                onMessage(data);

                // 检查是否完成
                if (data.type === "done") {
                  if (onComplete) {
                    onComplete();
                  }
                  controller.abort();
                  return;
                }
              } catch (error) {
                console.error("Failed to parse SSE message:", error, line);
              }
            }
          }
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("SSE Error:", error);
          if (onError) {
            onError(error);
          }
        }
      });

    // 返回一个可以用来中止连接的对象
    return {
      close: () => controller.abort(),
    } as EventSource;
  },
};

// 预测服务
export const predictionService = {
  // 创建预测
  createPrediction: async (data: PredictionRequest) => {
    return post<ApiResponse<any>>(API_ENDPOINTS.createPrediction, data);
  },

  // 获取用户预测历史
  getUserPredictions: async (userId?: string) => {
    return get<ApiResponse<any[]>>(API_ENDPOINTS.predictions, { userId });
  },
};

// Agent 服务
export const agentService = {
  // 获取所有 Agent 状态
  getAgents: async (analysisId: string) => {
    return get<ApiResponse<any>>(API_ENDPOINTS.agents, { analysisId });
  },

  // 获取社交 Agent 数据
  getSocialAgent: async (analysisId: string) => {
    return get<ApiResponse<any>>(API_ENDPOINTS.socialAgent, { analysisId });
  },
};

// 历史记录服务
export const historyService = {
  // 获取历史记录列表
  getHistory: async () => {
    return get<{ status: string; data: HistoryItem[]; code: number }>(
      API_ENDPOINTS.history
    );
  },
};

// 导出所有服务
export const apiService = {
  event: eventService,
  market: marketService,
  analysis: analysisService,
  prediction: predictionService,
  agent: agentService,
  history: historyService,
};

export default apiService;
