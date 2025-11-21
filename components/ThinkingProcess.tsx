"use client";

import {
  X,
  Code,
  Brain,
  FileText,
  Lightbulb,
  Sparkles,
  CheckCircle2,
  Clock,
  Zap,
  TrendingUp,
  Activity,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Header from "./Header";
import { LoadingPage } from "./LoadingSpinner";
import ErrorMessage from "./ErrorMessage";
import OrderbookTable from "./OrderbookTable";
import PriceHistoryChart from "./PriceHistoryChart";
import TopHoldersTable from "./TopHoldersTable";
import WhaleTradesList from "./WhaleTradesList";
import TwitterCard from "./TwitterCard";
import { analysisService, historyService, authService } from "@/lib/api-services";
import type {
  SSEEvent,
  Agent,
  Tweet,
  ToolCall,
  ReasoningItem,
  LogItem,
  Event,
  SessionMessage,
} from "@/types";

interface ThinkingProcessProps {
  eventId?: string;
  eventTitle?: string;
  eventData?: Event; // 新增：完整的事件数据
  initialQuery?: string;
  sessionId?: string;
  onLoginSuccess?: () => void;
}

// 市场数据结构
interface OrderbookData {
  market: string;
  asset_id: string;
  timestamp: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
}

interface PriceHistoryData {
  history: Array<{ t: number; p: number }>;
}

// 持有者数据结构（Whales Agent）
// 🔄 旧的持有者数据结构（已废弃，保留用于兼容）
interface HolderData {
  proxyWallet: string;
  name: string;
  pseudonym: string;
  amount: number;
  bio?: string;
  profileImage?: string;
  verified: boolean;
  outcomeIndex: number;
}

// 🆕 新的交易记录数据结构
interface TradeData {
  proxyWallet: string;      // 钱包地址
  side: "BUY" | "SELL";     // 买卖方向
  asset: string;            // 资产ID
  size: number;             // 交易数量
  price: number;            // 交易价格
  timestamp: number;        // 时间戳（毫秒）
  title: string;            // 市场标题
  outcome: string;          // 结果描述（Yes/No）
  outcomeIndex: number;     // 结果索引（0=Yes, 1=No）
}

// 🔄 更新为支持两种格式
interface TopHoldersData {
  // 旧格式（可能还有些地方在用）
  token?: string;
  holders?: HolderData[];
  // 新格式（交易记录数组）
  trades?: TradeData[];
}

// Twitter 引用数据结构（Social Agent）
interface TwitterCitation {
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

// Agent 数据结构
interface AgentData {
  id: string;
  type: "social" | "news" | "tech" | "whales";
  name: string;
  icon: string;
  status: "waiting" | "thinking" | "completed" | "error";
  message: string;
  tweets: Tweet[];
  thinkingContent: string;
  toolCalls: ToolCall[];
  reasoningItems: ReasoningItem[];
  logs: LogItem[];
  // 市场数据（主要用于 tech/whales agent）
  orderbooks: OrderbookData[];
  priceHistory: PriceHistoryData[];
  // 持有者数据（主要用于 whales agent）
  topHolders: TopHoldersData[];
  // Twitter 引用（主要用于 social agent）
  citations: TwitterCitation[];
  // 新闻注释（主要用于 news agent）- 支持多个注释
  annotations: string[];
  // 🆕 Agent 分析结论（来自 tool_output）
  conclusion?: string;
}

export default function ThinkingProcess({
  eventId,
  eventTitle,
  eventData,
  initialQuery = "",
  sessionId,
  onLoginSuccess,
}: ThinkingProcessProps) {
  const [activeTab, setActiveTab] = useState<"result" | "thinking">("thinking");
  const [query, setQuery] = useState(initialQuery);
  const [question, setQuestion] = useState("");
  const [finalText, setFinalText] = useState("");
  const [finalResult, setFinalResult] = useState(""); // 新增：存储最终结果
  const [currentSessionId, setCurrentSessionId] = useState(sessionId || "");
  const [analysisStartTime, setAnalysisStartTime] = useState<Date | null>(null);
  const [analysisEndTime, setAnalysisEndTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // 会话详情相关状态
  const [sessionMessages, setSessionMessages] = useState<SessionMessage[]>([]);
  const [isHistoryView, setIsHistoryView] = useState(false);

  const [selectedAgentId, setSelectedAgentId] = useState<string>("social");

  const [agentsData, setAgentsData] = useState<AgentData[]>([
    {
      id: "social",
      type: "social",
      name: "Social Agent",
      icon: "✖️",
      status: "waiting",
      message: "Waiting to start...",
      tweets: [],
      thinkingContent: "",
      toolCalls: [],
      reasoningItems: [],
      logs: [],
      orderbooks: [],
      priceHistory: [],
      topHolders: [],
      citations: [],
      annotations: [],
    },
    {
      id: "news",
      type: "news",
      name: "News Agent",
      icon: "📰",
      status: "waiting",
      message: "Waiting to start...",
      tweets: [],
      thinkingContent: "",
      toolCalls: [],
      reasoningItems: [],
      logs: [],
      orderbooks: [],
      priceHistory: [],
      topHolders: [],
      citations: [],
      annotations: [],
    },
    {
      id: "tech",
      type: "tech",
      name: "Tech Agent",
      icon: "⚙️",
      status: "waiting",
      message: "Waiting to start...",
      tweets: [],
      thinkingContent: "",
      toolCalls: [],
      reasoningItems: [],
      logs: [],
      orderbooks: [],
      priceHistory: [],
      topHolders: [],
      citations: [],
      annotations: [],
    },
    {
      id: "whales",
      type: "whales",
      name: "Whales Agent",
      icon: "🐋",
      status: "waiting",
      message: "Waiting to start...",
      tweets: [],
      thinkingContent: "",
      toolCalls: [],
      reasoningItems: [],
      logs: [],
      orderbooks: [],
      priceHistory: [],
      topHolders: [],
      citations: [],
      annotations: [],
    },
  ]);

  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  const [liveEventStream, setLiveEventStream] = useState<any[]>([]);

  const [contentChunks, setContentChunks] = useState<
    { agentType: string; chunk: string; timestamp: string }[]
  >([]);

  useEffect(() => {
    agentsData.forEach((agent) => {
      if (agent.thinkingContent.length > 0 || agent.status !== "waiting") {
        console.log(`${agent.icon} ${agent.name}:`, {
          status: agent.status,
          thinkingContentLength: agent.thinkingContent.length,
          thinkingContent: agent.thinkingContent,
          thinkingContentRaw: JSON.stringify(
            agent.thinkingContent.substring(0, 200)
          ),
          tweetsCount: agent.tweets.length,
          logsCount: agent.logs.length,
        });
      }
    });
    console.groupEnd();
  }, [agentsData]);

  const updateAgentData = (agentType: string, updates: Partial<AgentData>) => {
    setAgentsData((prev) =>
      prev.map((agent) => {
        if (agent.type === agentType || agent.id === agentType) {
          return { ...agent, ...updates };
        }
        return agent;
      })
    );
  };

  const extractAgentType = (eventType: string, toolName?: string): string => {
    if (toolName) {
      // 🔧 市场数据工具映射到 tech agent
      if (
        toolName.includes("fetch_price_history") ||
        toolName.includes("fetch_current_orderbook") ||
        toolName.includes("fetch_market") ||
        toolName.includes("price_") ||
        toolName.includes("orderbook")
      ) {
        return "tech";
      }

      // 🐋 持有者数据工具映射到 whales agent
      if (
        toolName.includes("fetch_top_trades") ||
        toolName.includes("holders") ||
        toolName.includes("whale")
      ) {
        return "whales";
      }

      if (toolName.includes("social")) return "social";
      if (toolName.includes("news")) return "news";
      if (toolName.includes("tech")) return "tech";
    }

    if (eventType.includes("social")) return "social";
    if (eventType.includes("news")) return "news";
    if (eventType.includes("tech")) return "tech";
    if (eventType.includes("whales") || eventType.includes("whale"))
      return "whales";

    return "social";
  };

  // 安全地将任意类型转换为字符串
  const safeToString = (value: any): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean")
      return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const handleSSEMessage = (event: SSEEvent) => {
    const now = new Date();
    // 安全地处理 message 字段，确保能正确处理字符串和非字符串类型
    const messageStr = safeToString(event.message);

    setLiveEventStream((prev) =>
      [
        {
          timestamp: now.toISOString(),
          time: now.toLocaleTimeString("zh-CN", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            fractionalSecondDigits: 3,
          }),
          type: event.type,
          tool_name: event.tool_name,
          message: messageStr,
          hasMessage: !!event.message,
          hasContent: !!event.content,
          messageLength: messageStr.length,
          isContent: event.tool_name?.includes("content"),
          rawEvent: JSON.stringify(event).substring(0, 200),
        },
        ...prev,
      ].slice(0, 50)
    );

    if (event.type === "debug") {
      return;
    }

    setRecentEvents((prev) =>
      [
        {
          timestamp: new Date().toISOString(),
          type: event.type,
          tool_name: event.tool_name,
          message: messageStr.substring(0, 50),
          isContent: event.tool_name?.includes("content"),
        },
        ...prev,
      ].slice(0, 10)
    );

    if (loading) {
      setLoading(false);
    }

    const agentType =
      extractAgentType(event.type, event.tool_name) ||
      event.agent_type ||
      "social";

    // 🔍 调试：记录所有 news_agent 相关事件
    if (event.tool_name?.includes("news") || event.type?.includes("news")) {
      console.log("📰 News Agent 事件:", {
        type: event.type,
        tool_name: event.tool_name,
        agentType,
        messagePreview:
          typeof event.message === "string"
            ? event.message.substring(0, 100)
            : event.message,
      });
    }

    // 🔄 链式状态更新：当一个 agent 开始时，自动完成前一个 agent
    const updatePreviousAgentStatus = (currentAgent: string) => {
      const agentOrder = ["social", "news", "tech", "whales"];
      const currentIndex = agentOrder.indexOf(currentAgent);

      console.log(`🔄 链式更新检查: ${currentAgent}, index: ${currentIndex}`);

      if (currentIndex > 0) {
        const previousAgent = agentOrder[currentIndex - 1];
        console.log(
          `✅ 自动完成前置 agent: ${previousAgent} (因为 ${currentAgent} 开始)`
        );

        setAgentsData((prev) => {
          const updated = prev.map((agent) => {
            if (agent.id === previousAgent && agent.status !== "completed") {
              console.log(
                `   更新 ${previousAgent}: ${agent.status} → completed`
              );
              return {
                ...agent,
                status: "completed" as const,
                message: "分析完成",
              };
            }
            return agent;
          });
          return updated;
        });
      } else {
        console.log(`   ${currentAgent} 是第一个 agent，无需更新前置`);
      }
    };

    switch (event.type) {
      case "agent_status":
      case "social_agent":
      case "news_agent":
      case "tech_agent":
      case "whales_agent":
        const status = event.status || "thinking";
        const message = safeToString(event.message || event.content);

        console.log(
          `🤖 Agent 事件: type=${event.type}, agentType=${agentType}, status=${status}`
        );

        // 🔄 当 agent 开始 thinking 时，完成前一个 agent
        if (status === "thinking") {
          console.log(`   ➡️ ${agentType} 开始 thinking，触发链式更新`);
          updatePreviousAgentStatus(agentType);
        }

        updateAgentData(agentType, {
          status: status as "waiting" | "thinking" | "completed" | "error",
          message: message,
        });

        // 自动切换到当前执行的 Agent
        if (status === "thinking") {
          setSelectedAgentId(agentType);
        }
        break;

      case "tweet":
      case "social_tweet":
      case "news_tweet":
      case "tech_tweet":
      case "whales_tweet":
        const newTweet = {
          id: event.tweet_id || event.id || Date.now().toString(),
          author: event.author || event.author_name || "Unknown",
          username: event.username || event.author_username,
          content: event.content || event.text || "",
          imageUrl: event.image_url || event.imageUrl || event.media_url,
          link: event.link || event.url,
          timestamp: event.timestamp || event.created_at,
          followers: event.followers,
          verified: event.verified || false,
          type: event.tweet_type || event.type,
          sentiment: event.sentiment,
        };

        console.log("🐦 Tweet Received:", {
          type: event.type,
          agentType,
          author: newTweet.author,
          hasContent: !!newTweet.content,
          hasLink: !!newTweet.link,
          link: newTweet.link,
          followers: newTweet.followers,
          verified: newTweet.verified,
          sentiment: newTweet.sentiment,
          rawEvent: event,
        });

        setAgentsData((prev) =>
          prev.map((agent) => {
            if (agent.type === agentType || agent.id === agentType) {
              console.log(`✅ Adding tweet to ${agent.name}:`, {
                previousCount: agent.tweets.length,
                newCount: agent.tweets.length + 1,
                tweetAuthor: newTweet.author,
                tweetLink: newTweet.link,
                verified: newTweet.verified,
                followers: newTweet.followers,
              });
              return { ...agent, tweets: [...agent.tweets, newTweet] };
            }
            return agent;
          })
        );
        break;

      case "thinking":
      case "social_thinking":
      case "news_thinking":
      case "tech_thinking":
      case "whales_thinking":
      case "social_content":
      case "news_content":
      case "tech_content":
      case "whales_content":
      case "social_agent_output":
      case "news_agent_output":
      case "tech_agent_output":
      case "whales_agent_output":
        const contentText = safeToString(
          event.message ||
            event.content ||
            event.data ||
            event.text ||
            event.output
        );

        // 🎯 当 news_agent_output 开始时，标记 social agent 为已完成
        if (event.type === "news_agent_output") {
          console.log("✅ news_agent_output 开始，标记 social agent 为已完成");
          setAgentsData((prev) =>
            prev.map((agent) => {
              if (agent.id === "social" && agent.status !== "completed") {
                return {
                  ...agent,
                  status: "completed" as const,
                  message: "分析完成",
                };
              }
              return agent;
            })
          );
        }

        if (contentText) {
          // 🔍 简单过滤：只跳过完整的 JSON 对象，保留所有文本内容
          let shouldInclude = true;

          // 只过滤完整的 JSON 对象（包含元数据字段）
          try {
            const parsed = JSON.parse(contentText);
            if (typeof parsed === "object" && parsed !== null) {
              const keys = Object.keys(parsed);
              const hasMetadataKeys = keys.some((key) =>
                [
                  "event",
                  "tweets",
                  "metadata",
                  "raw_data",
                  "history",
                  "market",
                  "holders",
                ].includes(key)
              );

              if (hasMetadataKeys) {
                console.log("⏭️ 跳过 JSON 元数据 (agent_output case):", {
                  eventType: event.type,
                  agentType,
                  keys: keys.slice(0, 5),
                  preview: JSON.stringify(parsed).substring(0, 100),
                });
                shouldInclude = false;
              }
            }
          } catch (e) {
            // 解析失败说明不是 JSON，保留内容
          }

          if (shouldInclude) {
            console.log("✅ 添加 agent_output 内容:", {
              eventType: event.type,
              agentType,
              length: contentText.length,
              preview: contentText.substring(0, 50),
            });

            setAgentsData((prev) =>
              prev.map((agent) => {
                if (agent.type === agentType || agent.id === agentType) {
                  const newContent = agent.thinkingContent + contentText;
                  return { ...agent, thinkingContent: newContent };
                }
                return agent;
              })
            );
          } else {
            console.log("⏭️ 已过滤 agent_output，不添加到 thinkingContent");
          }
        } else {
          console.warn("⚠️ No content found in event:", {
            type: event.type,
            availableFields: Object.keys(event),
            event,
          });
        }
        break;

      case "question":
        setQuestion(event.content || event.question || "");
        break;

      case "error":
        setError(safeToString(event.message) || "分析过程出错");
        break;

      case "tool_output":
        // 🎯 当收到 tool_output 时，显示结论并标记 agent 为完成
        {
          // 从 tool_name 映射到 agent type
          const toolNameToAgentType = (toolName: string): string => {
            if (toolName.includes("social")) return "social";
            if (toolName.includes("news")) return "news";
            if (toolName.includes("tech")) return "tech";
            if (toolName.includes("whale")) return "whales";
            return "";
          };

          const targetAgentType = toolNameToAgentType(event.tool_name || "");
          
          console.log("🎯 收到 tool_output:", {
            tool_name: event.tool_name,
            targetAgentType,
            outputPreview: typeof event.output === "string" 
              ? event.output.substring(0, 100) 
              : event.output,
          });

          if (targetAgentType) {
            // 更新对应 agent 的状态
            setAgentsData((prev) =>
              prev.map((agent) => {
                if (agent.type === targetAgentType || agent.id === targetAgentType) {
                  console.log(`✅ 标记 ${targetAgentType} agent 为完成，显示结论`);
                  return {
                    ...agent,
                    status: "completed" as const,
                    message: "分析完成",
                    // 🆕 保存结论内容（thinkingContent 保持不变）
                    conclusion: safeToString(event.output) || "",
                  };
                }
                return agent;
              })
            );
          }
        }
        break;

      case "done":
        setIsStreaming(false);
        setAnalysisEndTime(new Date());

        // 保存最终结果和会话ID
        if (event.final_result) {
          setFinalResult(event.final_result);
        }
        if (event.session_id) {
          setCurrentSessionId(event.session_id);
        }

        console.log("✅ 分析完成:", {
          session_id: event.session_id,
          final_result: event.final_result,
          duration: analysisStartTime
            ? (new Date().getTime() - analysisStartTime.getTime()) / 1000
            : 0,
        });
        break;

      case "log":
      case "social_log":
      case "news_log":
      case "tech_log":
      case "whales_log":
        // 🔍 检查是否是市场数据
        if (event.tool_name === "fetch_current_orderbook") {
          try {
            // Python dict 格式转 JSON
            const jsonStr = safeToString(event.message)
              .replace(/'/g, '"')
              .replace(/True/g, "true")
              .replace(/False/g, "false");

            const orderbookData = JSON.parse(jsonStr);

            console.log("📊 收到订单簿数据:", {
              agentType,
              market: orderbookData.market?.substring(0, 20) + "...",
              bidsCount: orderbookData.bids?.length,
              asksCount: orderbookData.asks?.length,
            });

            setAgentsData((prev) =>
              prev.map((agent) => {
                if (agent.type === agentType || agent.id === agentType) {
                  return {
                    ...agent,
                    orderbooks: [...agent.orderbooks, orderbookData],
                  };
                }
                return agent;
              })
            );

            // 🎯 当收到订单簿数据时，标记 news agent 为已完成
            console.log(
              "✅ 收到 fetch_current_orderbook 数据，标记 news agent 为已完成"
            );
            setAgentsData((prev) =>
              prev.map((agent) => {
                if (agent.id === "news" && agent.status !== "completed") {
                  return {
                    ...agent,
                    status: "completed" as const,
                    message: "分析完成",
                  };
                }
                return agent;
              })
            );
          } catch (e) {
            console.error("⚠️ 解析订单簿数据失败:", e);
          }
        }

        // 🔍 检查是否是价格历史数据
        else if (event.tool_name === "fetch_price_history") {
          try {
            const jsonStr = safeToString(event.message).replace(/'/g, '"');
            const priceData = JSON.parse(jsonStr);

            console.log("📈 收到价格历史数据:", {
              agentType,
              historyCount: priceData.history?.length,
              firstPrice: priceData.history?.[0]?.p,
              lastPrice: priceData.history?.[priceData.history.length - 1]?.p,
            });

            setAgentsData((prev) =>
              prev.map((agent) => {
                if (agent.type === agentType || agent.id === agentType) {
                  return {
                    ...agent,
                    priceHistory: [...agent.priceHistory, priceData],
                  };
                }
                return agent;
              })
            );

            // 🎯 当收到价格历史数据时，标记 news agent 为已完成
            console.log(
              "✅ 收到 fetch_price_history 数据，标记 news agent 为已完成"
            );
            setAgentsData((prev) =>
              prev.map((agent) => {
                if (agent.id === "news" && agent.status !== "completed") {
                  return {
                    ...agent,
                    status: "completed" as const,
                    message: "分析完成",
                  };
                }
                return agent;
              })
            );
          } catch (e) {
            console.error("⚠️ 解析价格历史数据失败:", e);
          }
        }

        // 🐋 检查是否是交易数据
        else if (event.tool_name === "fetch_top_trades") {
          try {
            const message = event.message;
            let tradesDataArray: TradeData[] = [];

            // 🆕 新格式：直接是交易记录数组
            if (Array.isArray(message)) {
              // 检查数组第一个元素是否包含交易数据特征
              if (message.length > 0 && message[0].side && message[0].price !== undefined) {
                // 这是新格式的交易数据
                tradesDataArray = message as TradeData[];
                console.log("🐋 收到交易数据（新格式）:", {
                  agentType,
                  tradesCount: tradesDataArray.length,
                  markets: [...new Set(tradesDataArray.map(t => t.title))].length,
                  totalVolume: tradesDataArray.reduce((sum, t) => sum + t.size, 0).toFixed(2),
                });
              } else {
                // 旧格式的持有者数据（兼容）
                console.log("🐋 收到持有者数据（旧格式）");
              }
            } else if (typeof message === "string") {
              // 如果是字符串，尝试解析
              const jsonStr = message
                .replace(/'/g, '"')
                .replace(/True/g, "true")
                .replace(/False/g, "false");
              const parsed = JSON.parse(jsonStr);
              
              if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].side) {
                tradesDataArray = parsed as TradeData[];
                console.log("🐋 收到交易数据（字符串解析）:", {
                  tradesCount: tradesDataArray.length,
                });
              }
            }

            // 将交易数据转换为 TopHoldersData 格式存储
            if (tradesDataArray.length > 0) {
              // 按市场分组交易数据
              const tradesByMarket = tradesDataArray.reduce((acc, trade) => {
                if (!acc[trade.title]) {
                  acc[trade.title] = [];
                }
                acc[trade.title].push(trade);
                return acc;
              }, {} as Record<string, TradeData[]>);

              // 为每个市场创建一个 TopHoldersData 对象
              const groupedData: TopHoldersData[] = Object.entries(tradesByMarket).map(
                ([title, trades]) => ({
                  token: title, // 使用标题作为标识
                  trades: trades, // 存储交易记录
                })
              );

              setAgentsData((prev) =>
                prev.map((agent) => {
                  if (agent.type === agentType || agent.id === agentType) {
                    return {
                      ...agent,
                      topHolders: [...agent.topHolders, ...groupedData],
                    };
                  }
                  return agent;
                })
              );
            }

            // 🎯 当收到交易数据时，标记 whales agent 为已完成
            console.log(
              "✅ 收到 fetch_top_trades 数据，标记 whales agent 为已完成"
            );
            setAgentsData((prev) =>
              prev.map((agent) => {
                if (agent.id === "whales" && agent.status !== "completed") {
                  return {
                    ...agent,
                    status: "completed" as const,
                    message: "分析完成",
                  };
                }
                return agent;
              })
            );
          } catch (e) {
            console.error("⚠️ 解析交易数据失败:", e, event.message);
          }
        }

        // 📰 检查是否是新闻注释（news_agent_annotation）- 这是最终分析结果
        else if (event.tool_name === "news_agent_annotation") {
          const annotationText = safeToString(event.message);
          if (annotationText) {
            console.log("📰 收到新闻注释（最终结果）:", {
              agentType,
              annotation: annotationText.substring(0, 100),
            });

            setAgentsData((prev) =>
              prev.map((agent) => {
                if (agent.type === agentType || agent.id === agentType) {
                  // 将注释添加到 annotations 数组中，支持多个注释
                  return {
                    ...agent,
                    annotations: [...agent.annotations, annotationText],
                  };
                }
                return agent;
              })
            );
          }
        }

        else if (event.tool_name === "social_citations") {
          try {
            const message = event.message;
            let citationData: TwitterCitation | null = null;

            if (typeof message === "object" && message !== null) {
              citationData = message as TwitterCitation;
            } else if (typeof message === "string") {
              // 如果是字符串，尝试解析
              const jsonStr = message
                .replace(/'/g, '"')
                .replace(/True/g, "true")
                .replace(/False/g, "false");
              citationData = JSON.parse(jsonStr);
            }

            if (citationData) {
              console.log("🐦 收到 Twitter 引用:", {
                agentType,
                user: citationData.user_screen_name,
                textPreview: citationData.full_text?.substring(0, 50),
              });

              setAgentsData((prev) =>
                prev.map((agent) => {
                  if (agent.type === agentType || agent.id === agentType) {
                    // 收到第一个 citation 时，标记 social agent 为已完成
                    const shouldComplete =
                      agent.citations.length === 0 && agent.id === "social";
                    if (shouldComplete) {
                      console.log(
                        "✅ 收到第一个 social_citation，标记 social agent 为已完成"
                      );
                    }
                    return {
                      ...agent,
                      citations: [...agent.citations, citationData],
                      ...(shouldComplete
                        ? { status: "completed" as const, message: "分析完成" }
                        : {}),
                    };
                  }
                  return agent;
                })
              );
            }
          } catch (e) {
            console.error("⚠️ 解析 Twitter 引用失败:", e, event.message);
          }
        }

        // 检查是否是需要显示的内容：content 或 agent_output
        else if (
          event.tool_name &&
          (event.tool_name.includes("content") ||
            event.tool_name.includes("agent_output") ||
            event.tool_name.includes("_output"))
        ) {
          const contentText = safeToString(event.message || event.content);

          console.log("🔍 检测到输出事件 (log case):", {
            type: event.type,
            tool_name: event.tool_name,
            agentType,
            messageLength: contentText.length,
            message: event.message,
            preview: contentText.substring(0, 100),
          });

          if (contentText) {
            // 🔍 简单过滤：只跳过完整的 JSON 对象，保留所有文本内容
            let shouldInclude = true;

            // 只过滤完整的 JSON 对象（包含元数据字段）
            try {
              const parsed = JSON.parse(contentText);
              if (typeof parsed === "object" && parsed !== null) {
                const keys = Object.keys(parsed);
                const hasMetadataKeys = keys.some((key) =>
                  [
                    "event",
                    "tweets",
                    "metadata",
                    "raw_data",
                    "history",
                    "market",
                    "holders",
                  ].includes(key)
                );

                if (hasMetadataKeys) {
                  console.log("⏭️ 跳过 JSON 元数据 (log case):", {
                    agentType,
                    type: Array.isArray(parsed) ? "array" : "object",
                    keys: keys.slice(0, 5),
                    preview: JSON.stringify(parsed).substring(0, 100),
                  });
                  shouldInclude = false;
                }
              }
            } catch (e) {
              // 解析失败说明不是 JSON，保留内容
            }

            // 如果是有效内容，才添加
            if (shouldInclude) {
              console.log("✅ 添加有效内容 (log case):", {
                tool_name: event.tool_name,
                agentType,
                length: contentText.length,
                content: contentText,
                preview: contentText.substring(0, 100),
              });

              setContentChunks((prev) =>
                [
                  ...prev,
                  {
                    agentType,
                    chunk: contentText,
                    timestamp: new Date().toLocaleTimeString("zh-CN", {
                      hour12: false,
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      fractionalSecondDigits: 3,
                    }),
                  },
                ].slice(-100)
              );

              setAgentsData((prev) => {
                const updated = prev.map((agent) => {
                  if (agent.type === agentType || agent.id === agentType) {
                    const newContent = agent.thinkingContent + contentText;
                    return { ...agent, thinkingContent: newContent };
                  }
                  return agent;
                });

                setTimeout(() => {
                  console.group("📋 Post-Update State (immediate)");
                  updated.forEach((a) => {
                    if (a.thinkingContent.length > 0) {
                      console.log(`${a.name}:`, {
                        length: a.thinkingContent.length,
                        preview: a.thinkingContent.substring(0, 200),
                      });
                    }
                  });
                  console.groupEnd();
                }, 0);

                return updated;
              });
            } else {
              console.log("⏭️ 已过滤，不添加到 thinkingContent");
            }
          }
        } else {
          const newLog = {
            id: Date.now().toString() + Math.random(),
            level: event.level || "info",
            message: safeToString(event.message || event.content),
            timestamp: new Date().toISOString(),
          };

          setAgentsData((prev) =>
            prev.map((agent) => {
              if (agent.type === agentType || agent.id === agentType) {
                return { ...agent, logs: [...agent.logs, newLog] };
              }
              return agent;
            })
          );
        }
        break;

      case "tool_called":
      case "social_tool_called":
      case "news_tool_called":
      case "tech_tool_called":
      case "whales_tool_called":
        const newToolCall = {
          id: event.call_id || event.tool_call_id || Date.now().toString(),
          tool_name: event.tool_name || "unknown",
          tool_input: event.arguments || event.tool_input,
          timestamp: new Date().toISOString(),
        };

        setAgentsData((prev) =>
          prev.map((agent) => {
            if (agent.type === agentType || agent.id === agentType) {
              const isFirstTool = agent.toolCalls.length === 0;
              return {
                ...agent,
                toolCalls: [...agent.toolCalls, newToolCall],
                status: isFirstTool ? "thinking" : agent.status,
                message: isFirstTool
                  ? `Calling ${newToolCall.tool_name}...`
                  : agent.message,
              };
            }
            return agent;
          })
        );

        // 自动切换到正在执行的 agent
        setAgentsData((prev) => {
          const targetAgent = prev.find(
            (a) => a.type === agentType || a.id === agentType
          );
          if (targetAgent && targetAgent.toolCalls.length === 0) {
            setSelectedAgentId(agentType);
          }
          return prev;
        });
        break;

      case "reasoning_item_created":
      case "social_reasoning":
      case "news_reasoning":
      case "tech_reasoning":
      case "whales_reasoning":
        const newReasoningItem = {
          id: event.reasoning_item_id || Date.now().toString(),
          content: event.content || "",
          timestamp: new Date().toISOString(),
        };

        setAgentsData((prev) =>
          prev.map((agent) => {
            if (agent.type === agentType || agent.id === agentType) {
              return {
                ...agent,
                reasoningItems: [...agent.reasoningItems, newReasoningItem],
              };
            }
            return agent;
          })
        );
        break;

      case "tool_output":
      case "social_tool_output":
      case "news_tool_output":
      case "tech_tool_output":
      case "whales_tool_output":
        setAgentsData((prev) =>
          prev.map((agent) => {
            if (agent.type === agentType || agent.id === agentType) {
              return {
                ...agent,
                toolCalls: agent.toolCalls.map((tool) =>
                  tool.id === event.tool_call_id
                    ? {
                        ...tool,
                        tool_input: {
                          ...tool.tool_input,
                          output: event.output,
                        },
                      }
                    : tool
                ),
              };
            }
            return agent;
          })
        );
        break;

      case "message_output_created":
      case "final_text":
        const finalTextContent = event.data || event.content || "";
        console.log("📝 Final Text:", finalTextContent);
        setFinalText(finalTextContent);

        // 🔄 当最终结果输出时，完成最后一个 agent (whales)
        setAgentsData((prev) =>
          prev.map((agent) => {
            if (agent.id === "whales" && agent.status !== "completed") {
              return {
                ...agent,
                status: "completed" as const,
                message: "分析完成",
              };
            }
            return agent;
          })
        );

        // 自动切换到研究结果标签页
        setActiveTab("result");
        break;

      default:
        const hasContent =
          event.message || event.content || event.data || event.text;
        if (hasContent) {
          const contentText = safeToString(
            event.message || event.content || event.data || event.text
          );
          console.log(
            "🔄 Unhandled event with content, treating as thinking:",
            {
              type: event.type,
              agentType,
              toolName: event.tool_name,
              hasMessage: !!event.message,
              hasContent: !!event.content,
              contentLength: contentText.length,
              rawEvent: event,
            }
          );

          if (contentText) {
            setAgentsData((prev) =>
              prev.map((agent) => {
                if (agent.type === agentType || agent.id === agentType) {
                  const newContent = agent.thinkingContent + contentText;

                  return { ...agent, thinkingContent: newContent };
                }
                return agent;
              })
            );
          }
        } else {
          console.warn("⚠️ Unhandled SSE Event Type:", event.type, event);
        }
        break;
    }
  };

  const startAnalysis = (queryText?: string) => {
    const actualQuery = queryText || query;
    // 如果有 sessionId，不需要 query 或 eventId
    if (!actualQuery && !eventId && !sessionId) {
      setError("请输入查询内容或选择事件");
      return;
    }

    setAgentsData((prev) =>
      prev.map((agent) => ({
        ...agent,
        status: "waiting",
        message: "Waiting to start...",
        tweets: [],
        thinkingContent: "",
        toolCalls: [],
        reasoningItems: [],
        logs: [],
        orderbooks: [],
        priceHistory: [],
        topHolders: [],
        citations: [],
      }))
    );
    setFinalText("");
    setFinalResult("");
    setError(null);
    setIsStreaming(true);
    setLoading(true);
    setAnalysisStartTime(new Date());
    setAnalysisEndTime(null);
    setSelectedAgentId("social");

    if (eventTitle) {
      setQuestion(eventTitle);
    } else if (actualQuery) {
      setQuestion(actualQuery);
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const analyzeParams: any = {};
    if (eventId) {
      analyzeParams.event_id = eventId;
    }
    if (actualQuery) {
      analyzeParams.query = actualQuery;
    }
    if (sessionId) {
      analyzeParams.session_id = sessionId;
    }

    eventSourceRef.current = analysisService.createAnalyzeStream(
      analyzeParams,
      handleSSEMessage,
      (error) => {
        setError(error.message);
        setIsStreaming(false);
        setLoading(false);
      },
      () => {
        setIsStreaming(false);
        setLoading(false);
      }
    );
  };

  // 加载会话详情
  const loadSessionDetail = async (sessionIdToLoad: string) => {
    try {
      setLoading(true);
      setError(null);
      setIsHistoryView(true);
      
      const { userId } = authService.getUserInfo();
      if (!userId) {
        setError("请先登录");
        return;
      }

      console.log("🔄 加载会话详情:", sessionIdToLoad);
      const response = await historyService.getSessionDetail(userId, sessionIdToLoad);

      if (response.status === "ok" && response.code === 0) {
        setSessionMessages(response.data);
        
        // 设置第一个用户消息作为问题标题
        const firstUserMessage = response.data.find(msg => msg.role === 'user');
        if (firstUserMessage) {
          setQuestion(firstUserMessage.content);
          setQuery(firstUserMessage.content);
        }
        
        console.log("✅ 会话详情加载完成:", {
          totalMessages: response.data.length,
          userMessages: response.data.filter(m => m.role === 'user').length,
          assistantMessages: response.data.filter(m => m.role === 'assistant').length,
        });
      } else {
        setError("加载会话失败");
      }
    } catch (err: any) {
      console.error("❌ 加载会话详情失败:", err);
      setError(err.message || "加载会话失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 如果有 sessionId 且没有 eventId/initialQuery，则加载历史会话
    if (sessionId && !eventId && !initialQuery) {
      loadSessionDetail(sessionId);
    }
    // 否则，如果有 eventId 或 initialQuery，开始新分析
    else if (eventId || initialQuery) {
      setIsHistoryView(false);
      startAnalysis(initialQuery);
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [eventId, initialQuery, sessionId]);

  const handleSubmit = () => {
    if (query.trim()) {
      startAnalysis(query);
    }
  };

  const selectedAgent =
    agentsData.find((agent) => agent.id === selectedAgentId) || agentsData[0];

  const displayData =
    activeTab === "result"
      ? {
          tweets: selectedAgent.tweets,
          thinkingContent: selectedAgent.thinkingContent,
          finalText: finalText,
          toolCalls: [],
          reasoningItems: [],
          logs: [],
          orderbooks: selectedAgent.orderbooks,
          priceHistory: selectedAgent.priceHistory,
          topHolders: selectedAgent.topHolders,
          citations: selectedAgent.citations,
          annotations: selectedAgent.annotations,
          conclusion: selectedAgent.conclusion, // 🆕 添加结论
        }
      : {
          tweets: selectedAgent.tweets,
          thinkingContent: selectedAgent.thinkingContent,
          finalText: finalText,
          toolCalls: selectedAgent.toolCalls,
          reasoningItems: selectedAgent.reasoningItems,
          logs: selectedAgent.logs,
          orderbooks: selectedAgent.orderbooks,
          priceHistory: selectedAgent.priceHistory,
          topHolders: selectedAgent.topHolders,
          citations: selectedAgent.citations,
          annotations: selectedAgent.annotations,
          conclusion: selectedAgent.conclusion, // 🆕 添加结论
        };

  if (loading && !question) {
    return <LoadingPage />;
  }

  return (
    <div className="min-h-screen bg-[#0F0F23]">
      {/* Header */}
      <Header title="Thinking Process" showSearch={true} onLoginSuccess={onLoginSuccess} />

      {/* Content */}
      <div className="px-8 py-6 pb-40">
        <div className="max-w-7xl mx-auto">
          {/* Error State */}
          {error && (
            <div className="mb-6">
              <ErrorMessage message={error} onRetry={() => startAnalysis()} />
            </div>
          )}

          {/* Initial Loading State - 初始加载状态 */}
          {!question &&
            isStreaming &&
            agentsData.every((a) => a.status === "waiting") && (
              <div className="bg-gradient-primary rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div
                      className="w-2 h-2 bg-purple-300 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-purple-300 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-purple-300 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                  <span className="text-sm text-purple-300">
                    正在连接 AI 分析服务...
                  </span>
                </div>
              </div>
            )}

          {/* Enhanced Question Card - 像 EventCard 一样展示 */}
          {question && (
            <div className="bg-[#1A1A2E] border-2 border-purple-500/30 rounded-2xl overflow-hidden mb-6 hover:border-purple-500 transition-all">
              {/* 图片区域 - 如果有事件图片 */}
              {eventData?.image && (
                <div className="relative h-48 w-full overflow-hidden">
                  <img
                    src={eventData.image}
                    alt={question}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E] via-transparent to-transparent" />

                  {/* 右上角标签 */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    {eventData.featured && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/30 rounded-full text-xs font-semibold text-yellow-400">
                        <Sparkles className="w-3 h-3 fill-yellow-400" />
                        Featured
                      </span>
                    )}
                    {eventData.new && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 backdrop-blur-sm border border-purple-500/30 rounded-full text-xs font-semibold text-purple-400">
                        <Sparkles className="w-3 h-3" />
                        New
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 头部 - 带渐变背景 */}
              <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-6 border-b border-gray-800">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-5 h-5 text-purple-400" />
                      {/* <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wide">
                        AI 分析会话
                      </h3> */}
                    </div>
                    <p className="text-xl font-bold leading-relaxed mb-3">
                      {question}
                    </p>

                    {/* 事件描述 */}
                    {eventData?.description && (
                      <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                        {eventData.description}
                      </p>
                    )}

                    {/* 市场统计 */}
                    {eventData && (
                      <div className="flex gap-4 flex-wrap text-sm">
                        {eventData.volume24hr !== undefined && (
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-green-400" />
                            <span className="text-gray-400">24h:</span>
                            <span className="font-semibold text-green-400">
                              ${(eventData.volume24hr / 1000000).toFixed(2)}M
                            </span>
                          </div>
                        )}
                        {eventData.liquidity !== undefined && (
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-blue-400" />
                            <span className="text-gray-400">Liquidity:</span>
                            <span className="font-semibold text-blue-400">
                              ${(eventData.liquidity / 1000000).toFixed(2)}M
                            </span>
                          </div>
                        )}
                        {eventData.markets && eventData.markets.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-purple-400" />
                            <span className="text-gray-400">Markets:</span>
                            <span className="font-semibold text-purple-400">
                              {eventData.markets.length}
                            </span>
                          </div>
                        )}
                        {eventData.commentCount !== undefined &&
                          eventData.commentCount > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Brain className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-400">Comments:</span>
                              <span className="font-semibold text-gray-300">
                                {eventData.commentCount}
                              </span>
                            </div>
                          )}
                      </div>
                    )}
                  </div>

                  {/* 状态标签 */}
                  <div className="flex flex-col gap-2">
                    {/* {isStreaming ? (
                      <span className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-xs font-semibold text-yellow-400 whitespace-nowrap">
                        <Activity className="w-3 h-3 animate-pulse" />
                        分析中
                      </span>
                    ) : finalResult || finalText ? (
                      <span className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full text-xs font-semibold text-green-400 whitespace-nowrap">
                        <CheckCircle2 className="w-3 h-3" />
                        已完成
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 px-3 py-1.5 bg-gray-500/20 border border-gray-500/30 rounded-full text-xs font-semibold text-gray-400 whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        准备中
                      </span>
                    )} */}

                    {/* {eventId && (
                      <span className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs font-semibold text-blue-400 whitespace-nowrap">
                        <TrendingUp className="w-3 h-3" />
                        Event
                      </span>
                    )}
                    
                    {!eventId && initialQuery && (
                      <span className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-full text-xs font-semibold text-purple-400 whitespace-nowrap">
                        <Brain className="w-3 h-3" />
                        Query
                      </span>
                    )} */}
                  </div>
                </div>
              </div>

              {/* 市场选项展示（如果有） */}
              {eventData?.markets && eventData.markets.length > 0 && (
                <div className="p-6 border-b border-gray-800 bg-[#0F0F23]/50">
                  {/* <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    市场选项
                  </h4> */}
                  <div className="space-y-2">
                    {eventData.markets.slice(0, 3).map((market) => {
                      try {
                        const prices = JSON.parse(market.outcomePrices);
                        const probability = Math.round(
                          parseFloat(prices[0]) * 100
                        );
                        const isHigh = probability >= 70;
                        const isMedium = probability >= 40 && probability < 70;

                        return (
                          <div
                            key={market.id}
                            className="flex items-center justify-between p-3 bg-[#1A1A2E] rounded-lg border border-gray-800"
                          >
                            <span className="text-sm font-medium flex-1 truncate">
                              {market.groupItemTitle}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    isHigh
                                      ? "bg-green-500"
                                      : isMedium
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{ width: `${probability}%` }}
                                />
                              </div>
                              <span
                                className={`text-sm font-bold w-10 text-right ${
                                  isHigh
                                    ? "text-green-400"
                                    : isMedium
                                    ? "text-yellow-400"
                                    : "text-red-400"
                                }`}
                              >
                                {probability}%
                              </span>
                            </div>
                          </div>
                        );
                      } catch {
                        return null;
                      }
                    })}
                    {eventData.markets.length > 3 && (
                      <div className="text-xs text-center text-gray-500 pt-1">
                        +{eventData.markets.length - 3} more options
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 内容区域 */}
              <div className="p-6">
                {/* 分析进度 - 始终显示，但完成后高度限制 */}
                {(isStreaming ||
                  agentsData.some((a) => a.status !== "waiting")) && (
                  <div
                    className={`mb-6 p-4 bg-purple-500/10 rounded-lg border border-purple-500/20 transition-all ${
                      !isStreaming && (finalResult || finalText)
                        ? "max-h-20 overflow-y-auto"
                        : ""
                    }`}
                    style={{
                      scrollbarWidth: "thin",
                      scrollbarColor:
                        !isStreaming && (finalResult || finalText)
                          ? "rgba(168, 85, 247, 0.5) transparent"
                          : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2"></div>
                      {analysisStartTime && (
                        <span className="text-xs text-gray-400">
                          {isStreaming
                            ? `${Math.floor(
                                (new Date().getTime() -
                                  analysisStartTime.getTime()) /
                                  1000
                              )}s`
                            : analysisEndTime
                            ? `${Math.floor(
                                (analysisEndTime.getTime() -
                                  analysisStartTime.getTime()) /
                                  1000
                              )}s`
                            : ""}
                        </span>
                      )}
                    </div>

                    {/* 活动的 Agents */}
                    {/* <div className="flex gap-2 flex-wrap">
                      {agentsData
                        .filter(agent => agent.status === 'thinking' || agent.status === 'completed')
                        .map(agent => (
                          <div
                            key={agent.id}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
                              agent.status === 'completed'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}
                          >
                            <span>{agent.icon}</span>
                            <span>{agent.name}</span>
                            {agent.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                            {agent.status === 'thinking' && <Activity className="w-3 h-3 animate-pulse" />}
                          </div>
                        ))}
                    </div> */}
                  </div>
                )}

                {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {currentSessionId && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">Session ID</span>
                      <span className="text-sm font-mono text-purple-400 truncate" title={currentSessionId}>
                        {currentSessionId.slice(0, 8)}...
                      </span>
                    </div>
                  )}
                  
                  {analysisStartTime && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">分析时长</span>
                      <span className="text-sm font-semibold text-blue-400">
                        {analysisEndTime
                          ? `${Math.floor((analysisEndTime.getTime() - analysisStartTime.getTime()) / 1000)}s`
                          : `${Math.floor((new Date().getTime() - analysisStartTime.getTime()) / 1000)}s`}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">Agents</span>
                    <span className="text-sm font-semibold text-green-400">
                      {agentsData.filter(a => a.status === 'completed').length} / {agentsData.length}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">类型</span>
                    <span className="text-sm font-semibold text-gray-300">
                      {eventId ? '事件分析' : '查询分析'}
                    </span>
                  </div>
                </div> */}

                {/* 最终结果预览 */}
                {finalResult && !isStreaming && (
                  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-green-400" />
                      <h4 className="text-sm font-semibold text-green-400">
                        分析结论
                      </h4>
                    </div>
                    <p className="text-base text-gray-200 leading-relaxed">
                      {finalResult}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tabs - 历史视图不显示思考过程tab */}
          {!isHistoryView && (
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setActiveTab("result")}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === "result"
                    ? "bg-[#1A1A2E] border border-gray-700"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                研究结果
              </button>
              <button
                onClick={() => setActiveTab("thinking")}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === "thinking"
                    ? "bg-[#1A1A2E] border border-gray-700"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                思考过程
              </button>
            </div>
          )}

          {/* 历史视图 - 显示所有会话消息 */}
          {isHistoryView && sessionMessages.length > 0 && (
            <div className="space-y-6">
              {sessionMessages
                .filter(message => message.content && message.content.trim() !== '' && message.role !== 'user')
                .map((message, index) => (
                  <div
                    key={index}
                    className={`rounded-2xl p-6 animate-fadeInUp ${
                      message.role === 'user'
                        ? 'bg-blue-600/20 border border-blue-500/30'
                        : 'bg-gradient-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      {message.role === 'user' ? (
                        <>
                          {/* <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
                            Q
                          </div>
                          <h3 className="text-lg font-bold">问题</h3> */}
                        </>
                      ) : (
                        <>
                          <FileText className="w-6 h-6" />
                          <h3 className="text-lg font-bold">分析结果</h3>
                        </>
                      )}
                      <span className="ml-auto text-xs text-gray-400">
                        {new Date(message.create_time).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* 研究结果标签页 - 只显示最终分析结果 */}
          {!isHistoryView && activeTab === "result" && (
            <>
              {displayData.finalText ? (
                <div className="bg-gradient-primary rounded-2xl p-8 animate-fadeInUp">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-6 h-6" />
                    <h2 className="text-2xl font-bold">分析结果</h2>
                    {isStreaming && (
                      <div className="flex gap-1 ml-2">
                        <div
                          className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                          className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        ></div>
                        <div
                          className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        ></div>
                      </div>
                    )}
                  </div>
                  <div className="prose prose-invert prose-lg max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ node, ...props }) => (
                          <h1
                            className="text-3xl font-bold text-white mt-6 mb-4"
                            {...props}
                          />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2
                            className="text-2xl font-bold text-white mt-5 mb-3"
                            {...props}
                          />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3
                            className="text-xl font-semibold text-gray-100 mt-4 mb-2"
                            {...props}
                          />
                        ),
                        h4: ({ node, ...props }) => (
                          <h4
                            className="text-lg font-semibold text-gray-200 mt-3 mb-2"
                            {...props}
                          />
                        ),
                        p: ({ node, ...props }) => (
                          <p
                            className="text-gray-100 mb-3 leading-relaxed"
                            {...props}
                          />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul
                            className="list-disc list-inside mb-4 space-y-2 text-gray-100"
                            {...props}
                          />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol
                            className="list-decimal list-inside mb-4 space-y-2 text-gray-100"
                            {...props}
                          />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="text-gray-100 ml-2" {...props} />
                        ),
                        a: ({ node, ...props }) => (
                          <a
                            className="text-blue-300 hover:text-blue-200 underline transition-colors"
                            target="_blank"
                            rel="noopener noreferrer"
                            {...props}
                          />
                        ),
                        blockquote: ({ node, ...props }) => (
                          <blockquote
                            className="border-l-4 border-white/50 pl-4 py-2 mb-3 text-gray-200 italic bg-white/5"
                            {...props}
                          />
                        ),
                        code: ({ node, inline, ...props }: any) =>
                          inline ? (
                            <code
                              className="bg-white/10 text-gray-100 px-1.5 py-0.5 rounded text-sm"
                              {...props}
                            />
                          ) : (
                            <code
                              className="block bg-black/30 text-gray-100 p-4 rounded-lg mb-3 overflow-x-auto text-sm"
                              {...props}
                            />
                          ),
                        strong: ({ node, ...props }) => (
                          <strong className="font-bold text-white" {...props} />
                        ),
                        em: ({ node, ...props }) => (
                          <em className="italic text-gray-200" {...props} />
                        ),
                        hr: ({ node, ...props }) => (
                          <hr className="border-white/30 my-4" {...props} />
                        ),
                        table: ({ node, ...props }) => (
                          <div className="overflow-x-auto mb-4">
                            <table
                              className="min-w-full border border-white/20"
                              {...props}
                            />
                          </div>
                        ),
                        th: ({ node, ...props }) => (
                          <th
                            className="border border-white/20 px-3 py-2 bg-white/10 text-white font-semibold text-left"
                            {...props}
                          />
                        ),
                        td: ({ node, ...props }) => (
                          <td
                            className="border border-white/20 px-3 py-2 text-gray-100"
                            {...props}
                          />
                        ),
                      }}
                    >
                      {displayData.finalText}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="text-gray-400 text-lg">
                    {isStreaming ? "⏳ 正在生成分析结果..." : "暂无分析结果"}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 思考过程标签页 - 显示完整的 Agent 调用过程 */}
          {!isHistoryView && activeTab === "thinking" && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
                {/* Left Column - Agent Cards */}
                <div className="space-y-4">
                  {agentsData.map((agent, index) => {
                    const isSelected = agent.id === selectedAgentId;
                    const isActive = agent.status === "thinking";
                    const isCompleted = agent.status === "completed";
                    const isWaiting = agent.status === "waiting";

                    return (
                      <button
                        key={agent.id}
                        onClick={() => setSelectedAgentId(agent.id)}
                        className={`w-full text-left rounded-2xl p-6 transition-all duration-500 ease-in-out animate-fadeInUp ${
                          isSelected
                            ? "bg-gradient-primary scale-[1.02]"
                            : "bg-[#1A1A2E] border border-gray-800 hover:border-gray-700"
                        } ${
                          isActive
                            ? "ring-2 ring-purple-500 ring-opacity-50 animate-pulse-slow"
                            : ""
                        }`}
                        style={{
                          animationDelay: `${index * 100}ms`,
                          animationFillMode: "both",
                        }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-lg flex-1">{agent.message}</h3>
                          {isActive && (
                            <div className="flex gap-1 ml-2">
                              <div
                                className="w-1.5 h-1.5 bg-purple-300 rounded-full animate-bounce"
                                style={{ animationDelay: "0ms" }}
                              ></div>
                              <div
                                className="w-1.5 h-1.5 bg-purple-300 rounded-full animate-bounce"
                                style={{ animationDelay: "150ms" }}
                              ></div>
                              <div
                                className="w-1.5 h-1.5 bg-purple-300 rounded-full animate-bounce"
                                style={{ animationDelay: "300ms" }}
                              ></div>
                            </div>
                          )}
                          {isCompleted && (
                            <div className="ml-2">
                              <svg
                                className="w-5 h-5 text-green-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          )}
                          {isWaiting && !isStreaming && (
                            <div className="ml-2">
                              <svg
                                className="w-5 h-5 text-gray-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                            isSelected
                              ? "bg-white bg-opacity-20"
                              : "bg-[#0F0F23]"
                          }`}
                        >
                          <span className="text-xl">{agent.icon}</span>
                          <span className="font-medium">{agent.name}</span>
                        </div>
                      </button>
                    );
                  })}

                  {/* Reasoning Items - 推理过程 */}
                  {/* {displayData.reasoningItems.length > 0 && (
                    <div className="bg-[#1A1A2E] border border-gray-800 rounded-2xl p-6 animate-fadeInUp">
                      <div className="flex items-center gap-2 mb-4">
                        <Brain className="w-5 h-5 text-blue-400" />
                        <h3 className="text-lg font-semibold">推理过程</h3>
                      </div>
                      <div className="space-y-3">
                        {displayData.reasoningItems.map((item, idx) => (
                          <div
                            key={item.id}
                            className="bg-[#0F0F23] rounded-lg p-4 animate-fadeIn"
                            style={{
                              animationDelay: `${idx * 100}ms`,
                              animationFillMode: "both",
                            }}
                          >
                            <p className="text-sm text-gray-300 leading-relaxed">
                              {item.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )} */}
                </div>

                <div className="space-y-4">
                  {/* 🆕 Agent 结论卡片 - 当 agent 完成且有结论时显示 */}
                  {selectedAgent.status === "completed" && displayData.conclusion && (
                    <div className="bg-[#1A1A2E] border border-green-800 rounded-2xl p-6 animate-fadeIn">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-green-500/20 rounded-lg">
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-white font-semibold text-lg">分析结论</div>
                      </div>
                      <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="text-gray-300">{children}</li>,
                            code: ({ children }) => <code className="bg-gray-800 px-1.5 py-0.5 rounded text-cyan-400 text-xs">{children}</code>,
                          }}
                        >
                          {displayData.conclusion}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* 思考内容卡片 - 根据 agent 类型和 citations/annotation 状态显示 */}
                  {/* 🆕 只在没有结论时显示思考过程 */}

                  {/* Social Agent: 只显示两行思考过程 */}
                  {!displayData.conclusion && selectedAgent.type === "social" && (
                    <div className="bg-[#1A1A2E] border border-gray-800 rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex gap-1">
                          <div
                            className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          ></div>
                        </div>
                        <div className="text-gray-300 font-medium">
                          思考过程
                        </div>
                      </div>
                      {/* 固定两行高度，有滚动条，自动滚到底部 */}
                      <div 
                        ref={(el) => {
                          if (el && displayData.thinkingContent) {
                            el.scrollTop = el.scrollHeight;
                          }
                        }}
                        className="text-sm text-gray-300 leading-relaxed overflow-y-auto whitespace-pre-wrap"
                        style={{
                          maxHeight: '3rem', // 约两行高度 (1.5rem line-height * 2)
                          scrollbarWidth: 'thin',
                          scrollbarColor: 'rgba(59, 130, 246, 0.5) transparent'
                        }}
                      >
                        {displayData.thinkingContent}
                      </div>
                    </div>
                  )}

                  {/* News Agent: 只显示两行思考过程 */}
                  {!displayData.conclusion && selectedAgent.type === "news"  && (
                    <div className="bg-[#1A1A2E] border border-gray-800 rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex gap-1">
                          <div
                            className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          ></div>
                        </div>
                        <div className="text-gray-300 font-medium">
                          思考过程
                        </div>
                      </div>
                      {/* 固定两行高度，有滚动条，自动滚到底部 */}
                      <div 
                        ref={(el) => {
                          if (el && displayData.thinkingContent) {
                            el.scrollTop = el.scrollHeight;
                          }
                        }}
                        className="text-sm text-gray-300 leading-relaxed overflow-y-auto whitespace-pre-wrap"
                        style={{
                          maxHeight: '3rem', // 约两行高度 (1.5rem line-height * 2)
                          scrollbarWidth: 'thin',
                          scrollbarColor: 'rgba(251, 146, 60, 0.5) transparent'
                        }}
                      >
                        {displayData.thinkingContent}
                      </div>
                    </div>
                  )}

                  {/* 市场数据可视化 (Tech/Whales Agent) */}
                  {(selectedAgent.type === "tech" ||
                    selectedAgent.type === "whales") && (
                    <div className="space-y-6">
                      {/* 订单簿数据 */}
                      {displayData.orderbooks &&
                        displayData.orderbooks.length > 0 && (
                          <div className="space-y-4">
                            {displayData.orderbooks.map((orderbook, idx) => (
                              <OrderbookTable
                                key={idx}
                                orderbook={orderbook}
                                index={idx}
                              />
                            ))}
                          </div>
                        )}

                      {/* 价格历史数据 */}
                      {displayData.priceHistory &&
                        displayData.priceHistory.length > 0 && (
                          <div className="space-y-4">
                            {displayData.priceHistory.map((history, idx) => (
                              <PriceHistoryChart
                                key={idx}
                                priceHistory={history}
                                index={idx}
                              />
                            ))}
                          </div>
                        )}

                      {/* 持有者数据（Whales Agent） */}
                      {displayData.topHolders &&
                        displayData.topHolders.length > 0 && (
                          <div className="space-y-4">
                            {displayData.topHolders.map(
                              (topHoldersData, idx) => {
                                // 🆕 如果有交易数据，使用新的交易列表展示
                                const hasTrades = topHoldersData.trades && topHoldersData.trades.length > 0;
                                
                                if (hasTrades && selectedAgent.type === "whales") {
                                  return (
                                    <WhaleTradesList
                                      key={idx}
                                      tradesData={topHoldersData}
                                    />
                                  );
                                }
                                
                                // 否则使用原来的表格展示
                                return (
                                  <TopHoldersTable
                                    key={idx}
                                    topHoldersData={topHoldersData}
                                    index={idx}
                                  />
                                );
                              }
                            )}
                          </div>
                        )}

                      {/* 市场数据加载提示 */}
                      {isStreaming &&
                        displayData.orderbooks.length === 0 &&
                        displayData.priceHistory.length === 0 && (
                          <div className="bg-[#1A1A2E] border border-gray-800 rounded-xl p-8 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="flex gap-1">
                                <div
                                  className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                                  style={{ animationDelay: "0ms" }}
                                ></div>
                                <div
                                  className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                                  style={{ animationDelay: "150ms" }}
                                ></div>
                                <div
                                  className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                                  style={{ animationDelay: "300ms" }}
                                ></div>
                              </div>
                              <p className="text-sm text-gray-400">
                                ⏳ 正在获取市场数据...
                              </p>
                            </div>
                          </div>
                        )}
                    </div>
                  )}

                  {/* Twitter Citations - 只在 Social Agent 显示 */}
                  {(() => {
                    // 调试日志
                    console.log("🔍 Twitter Citations 调试信息:", {
                      selectedAgentType: selectedAgent.type,
                      selectedAgentId: selectedAgentId,
                      citationsExists: !!displayData.citations,
                      citationsLength: displayData.citations?.length || 0,
                      citations: displayData.citations,
                      shouldShow:
                        selectedAgent.type === "social" &&
                        displayData.citations &&
                        displayData.citations.length > 0,
                    });

                    return selectedAgent.type === "social" &&
                      displayData.citations &&
                      displayData.citations.length > 0 ? (
                      <div className="bg-[#1A1A2E] border border-gray-800 rounded-2xl p-6 mb-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                          <span className="text-2xl">🐦</span>
                          <span>
                            Twitter 引用 ({displayData.citations.length})
                          </span>
                        </h2>
                        <div className="space-y-4">
                          {displayData.citations.map((citation, idx) => (
                            <TwitterCard key={citation.id_str} {...citation} />
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* News Annotations - 只在 News Agent 显示所有最终分析结果 */}
                  {selectedAgent.type === "news" &&
                    displayData.annotations.length > 0 && (
                      <div className="space-y-6">
                        {displayData.annotations.map((annotation, idx) => (
                          <div
                            key={idx}
                            className="bg-[#1A1A2E] border border-gray-800 rounded-2xl p-6 animate-fadeInUp"
                          >
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                              <span className="text-2xl">📰</span>
                              <span>
                                新闻分析结果{" "}
                                {displayData.annotations.length > 1
                                  ? `(${idx + 1}/${
                                      displayData.annotations.length
                                    })`
                                  : ""}
                              </span>
                            </h2>
                            <div className="prose prose-invert prose-sm max-w-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  h1: ({ node, ...props }) => (
                                    <h1
                                      className="text-2xl font-bold text-white mt-6 mb-4"
                                      {...props}
                                    />
                                  ),
                                  h2: ({ node, ...props }) => (
                                    <h2
                                      className="text-xl font-bold text-white mt-5 mb-3"
                                      {...props}
                                    />
                                  ),
                                  h3: ({ node, ...props }) => (
                                    <h3
                                      className="text-lg font-semibold text-orange-300 mt-4 mb-2"
                                      {...props}
                                    />
                                  ),
                                  h4: ({ node, ...props }) => (
                                    <h4
                                      className="text-base font-semibold text-orange-400 mt-3 mb-2"
                                      {...props}
                                    />
                                  ),
                                  p: ({ node, ...props }) => (
                                    <p
                                      className="text-gray-300 mb-3 leading-relaxed"
                                      {...props}
                                    />
                                  ),
                                  ul: ({ node, ...props }) => (
                                    <ul
                                      className="list-disc list-inside mb-3 space-y-1 text-gray-300"
                                      {...props}
                                    />
                                  ),
                                  ol: ({ node, ...props }) => (
                                    <ol
                                      className="list-decimal list-inside mb-3 space-y-1 text-gray-300"
                                      {...props}
                                    />
                                  ),
                                  li: ({ node, ...props }) => (
                                    <li
                                      className="text-gray-300 ml-2"
                                      {...props}
                                    />
                                  ),
                                  a: ({ node, ...props }) => (
                                    <a
                                      className="text-orange-400 hover:text-orange-300 underline transition-colors"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      {...props}
                                    />
                                  ),
                                  blockquote: ({ node, ...props }) => (
                                    <blockquote
                                      className="border-l-4 border-orange-500 pl-4 py-2 mb-3 text-gray-400 italic bg-orange-900/10"
                                      {...props}
                                    />
                                  ),
                                  code: ({ node, inline, ...props }: any) =>
                                    inline ? (
                                      <code
                                        className="bg-gray-800 text-orange-300 px-1.5 py-0.5 rounded text-sm"
                                        {...props}
                                      />
                                    ) : (
                                      <code
                                        className="block bg-gray-900 text-green-300 p-3 rounded-lg mb-3 overflow-x-auto text-sm"
                                        {...props}
                                      />
                                    ),
                                  strong: ({ node, ...props }) => (
                                    <strong
                                      className="font-bold text-white"
                                      {...props}
                                    />
                                  ),
                                  em: ({ node, ...props }) => (
                                    <em
                                      className="italic text-gray-400"
                                      {...props}
                                    />
                                  ),
                                  hr: ({ node, ...props }) => (
                                    <hr
                                      className="border-gray-700 my-4"
                                      {...props}
                                    />
                                  ),
                                  table: ({ node, ...props }) => (
                                    <div className="overflow-x-auto mb-4">
                                      <table
                                        className="min-w-full border border-gray-700"
                                        {...props}
                                      />
                                    </div>
                                  ),
                                  th: ({ node, ...props }) => (
                                    <th
                                      className="border border-gray-700 px-3 py-2 bg-gray-800 text-white font-semibold text-left"
                                      {...props}
                                    />
                                  ),
                                  td: ({ node, ...props }) => (
                                    <td
                                      className="border border-gray-700 px-3 py-2 text-gray-300"
                                      {...props}
                                    />
                                  ),
                                }}
                              >
                                {annotation}
                              </ReactMarkdown>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  {/* Related Tweets - 只在 Social Agent 显示 */}

                  {/* Logs - 日志信息 */}
                  {displayData.logs.length > 0 && (
                    <div className="bg-[#1A1A2E] border border-gray-800 rounded-2xl p-6 animate-fadeInUp">
                      <div className="flex items-center gap-2 mb-4">
                        <Lightbulb className="w-5 h-5 text-yellow-400" />
                        <h3 className="text-lg font-semibold">日志</h3>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
                        {displayData.logs.map((log, idx) => (
                          <div
                            key={log.id}
                            className="text-xs font-mono text-gray-400 animate-fadeIn"
                            style={{
                              animationDelay: `${idx * 50}ms`,
                              animationFillMode: "both",
                            }}
                          >
                            <span
                              className={`inline-block w-16 ${
                                log.level === "error"
                                  ? "text-red-400"
                                  : log.level === "warn"
                                  ? "text-yellow-400"
                                  : "text-gray-500"
                              }`}
                            >
                              [{log.level}]
                            </span>
                            <span className="ml-2">{log.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-64 right-0 bg-[#0F0F23] border-t border-gray-800 p-6">
        <div className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask me anything about Prediction Market"
            className="w-full bg-[#1A1A2E] border border-gray-700 rounded-lg px-6 py-4 pr-14 focus:outline-none focus:border-purple-500 transition-colors"
            disabled={isStreaming}
          />
          <button
            onClick={handleSubmit}
            disabled={isStreaming || !query.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
