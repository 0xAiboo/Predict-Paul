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
import React, { useState, useEffect, useRef } from "react";
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
import {
  analysisService,
  historyService,
  authService,
} from "@/lib/api-services";
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
  proxyWallet: string; // 钱包地址
  side: "BUY" | "SELL"; // 买卖方向
  asset: string; // 资产ID
  size: number; // 交易数量
  price: number; // 交易价格
  timestamp: number; // 时间戳（毫秒）
  title: string; // 市场标题
  outcome: string; // 结果描述（Yes/No）
  outcomeIndex: number; // 结果索引（0=Yes, 1=No）
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
  icon: string | React.ReactNode;
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
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clip-path="url(#clip0_2_3297)">
            <rect opacity="0.01" width="24" height="24" fill="#DCD5FF" />
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M19.9362 4H17.176L12.6279 9.11262L8.69546 4H3L9.80517 12.7508L3.35544 20H6.11722L11.0951 14.4066L15.4456 20H21L13.9061 10.7774L19.9362 4ZM17.7368 18.3755H16.2074L6.22321 5.53943H7.86444L17.7368 18.3755Z"
              fill="#D3FB7A"
            />
          </g>
          <defs>
            <clipPath id="clip0_2_3297">
              <rect width="24" height="24" fill="white" />
            </clipPath>
          </defs>
        </svg>
      ),
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
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clip-path="url(#clip0_2_3310)">
            <rect opacity="0.01" width="24" height="24" fill="#DCD5FF" />
            <path
              d="M14.6693 20.7377C14.3292 20.8683 13.9809 20.9763 13.6265 21.0609C13.035 21.2028 12.4297 21.2793 11.8214 21.2892C7.25942 21.365 3.50232 17.7597 3.42704 13.238C3.35171 8.71531 6.98783 4.98791 11.5496 4.91192C16.1114 4.83601 19.8692 8.44201 19.9448 12.9642C19.9827 15.2533 19.0651 17.4072 17.4399 18.9736C17.3864 19.0248 17.3435 19.0861 17.3139 19.1541C17.2843 19.222 17.2685 19.2951 17.2674 19.3692C17.2664 19.4432 17.2801 19.5168 17.3077 19.5855C17.3353 19.6543 17.3764 19.7168 17.4284 19.7695C17.534 19.8763 17.6774 19.9372 17.8275 19.9391C17.9777 19.9409 18.1225 19.8836 18.2307 19.7795C20.0766 18.0018 21.1223 15.5498 21.0793 12.9449C20.9939 7.80111 16.7182 3.7013 11.5308 3.78772C6.34323 3.8735 2.20651 8.11372 2.29182 13.2563C2.37714 18.4001 6.65232 22.4993 11.84 22.4129C12.5314 22.4019 13.2196 22.3151 13.892 22.1539C14.2956 22.0583 14.6922 21.9354 15.0791 21.7863C15.3711 21.674 15.5164 21.3474 15.4031 21.0582C15.2914 20.7687 14.9615 20.6258 14.6693 20.7377Z"
              fill="white"
            />
            <path
              d="M16.1327 20.0017C16.0227 20.0716 15.9097 20.1382 15.7913 20.2064C15.7271 20.2431 15.6708 20.2921 15.6256 20.3506C15.5804 20.4091 15.5472 20.476 15.528 20.5473C15.5087 20.6187 15.5037 20.6932 15.5134 20.7665C15.523 20.8398 15.5471 20.9105 15.5841 20.9744C15.7405 21.2441 16.0878 21.3367 16.3589 21.1799C16.4889 21.1063 16.6171 21.0296 16.7433 20.9496C16.8059 20.9101 16.8601 20.8586 16.9027 20.7981C16.9452 20.7376 16.9754 20.6692 16.9915 20.5969C17.0075 20.5247 17.0091 20.45 16.9962 20.3771C16.9832 20.3042 16.956 20.2346 16.916 20.1723C16.7472 19.9127 16.3964 19.8352 16.1327 20.0017ZM11.5848 6.58133C11.4373 6.59014 11.2882 6.59293 11.1348 6.59514C11.0506 6.59572 10.9674 6.61299 10.89 6.64595C10.8125 6.67892 10.7423 6.72691 10.6836 6.78717C10.6248 6.84743 10.5785 6.91874 10.5475 6.99699C10.5164 7.07524 10.5012 7.15887 10.5027 7.24304C10.5099 7.59784 10.8036 7.88104 11.1573 7.87675C11.3295 7.87494 11.4982 7.86894 11.6666 7.86013C11.7507 7.8558 11.833 7.83483 11.9089 7.79846C11.9848 7.76208 12.0527 7.711 12.1087 7.6482C12.1647 7.58539 12.2077 7.51209 12.2352 7.43255C12.2627 7.35301 12.2741 7.26881 12.2688 7.18482C12.2454 6.83275 11.9399 6.56162 11.5848 6.58133ZM6.26611 12.0144C6.62362 10.2104 7.93751 8.71993 9.7372 8.15232C10.0765 8.04503 10.2646 7.68364 10.1591 7.34764C10.0529 7.01043 9.69033 6.82452 9.351 6.93184C7.09652 7.64293 5.44701 9.51193 5.00041 11.7736C4.93221 12.1218 5.15941 12.456 5.50873 12.5232C5.85912 12.5897 6.19791 12.362 6.26611 12.0144ZM0.186819 19.8696C-0.296579 18.778 0.231327 17.8186 1.8176 16.4784C2.05573 16.2794 2.42041 16.3376 2.61131 16.5835C2.79991 16.8294 2.751 17.1814 2.50401 17.3722C0.959015 18.5568 0.919523 19.096 1.21861 19.4089C2.04471 20.2718 8.47491 18.0618 12.7497 16.1253C18.0915 13.7073 23.2741 9.61424 22.8952 8.69673C22.7278 8.29253 22.4552 7.92674 20.5323 8.22925C20.2288 8.27713 19.9335 8.06863 19.8854 7.75954C19.8375 7.45644 20.0452 7.15063 20.3563 7.11993C22.4249 6.88944 23.7333 7.27283 23.9604 8.44494C24.2532 9.95193 22.1178 12.5347 13.3375 17.0822C1.23841 22.6353 0.186819 19.8696 0.186819 19.8696Z"
              fill="white"
            />
            <path
              d="M20.5023 3.19325L21.6793 2.90787C22.107 2.80415 22.107 2.19581 21.6793 2.09209L20.5023 1.8067C20.3496 1.76967 20.2304 1.65043 20.1933 1.49772L19.9079 0.320778C19.8107 -0.0802237 19.27 -0.105286 19.1173 0.24559C19.1071 0.268982 19.0986 0.294045 19.0922 0.320778L18.8068 1.49772C18.7721 1.64089 18.6651 1.75463 18.526 1.7988C18.5168 1.80175 18.5073 1.80438 18.4978 1.8067L17.3209 2.09209C16.9199 2.18933 16.8948 2.73007 17.2457 2.88275C17.2691 2.89293 17.2941 2.90138 17.3209 2.90786L18.4978 3.19326C18.6314 3.22566 18.7394 3.321 18.7891 3.44663C18.7962 3.46458 18.8021 3.48315 18.8068 3.50224L19.0922 4.67918C19.1959 5.10691 19.8042 5.10691 19.9079 4.67918L20.1933 3.50224C20.2304 3.34952 20.3496 3.23029 20.5023 3.19325Z"
              fill="white"
            />
          </g>
          <defs>
            <clipPath id="clip0_2_3310">
              <rect width="24" height="24" fill="white" />
            </clipPath>
          </defs>
        </svg>
      ),
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
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clip-path="url(#clip0_2_3324)">
            <rect opacity="0.01" width="24" height="24" fill="#DCD5FF" />
            <path
              d="M14.4867 17.4851H7.01377C6.66787 17.4851 6.38653 17.1981 6.38653 16.8379C6.38653 16.4813 6.6655 16.1912 7.01437 16.1912H14.4962C14.8427 16.1912 15.1241 16.4788 15.1241 16.8385C15.1205 17.0106 15.0519 17.1746 14.9329 17.2953C14.8138 17.4161 14.6538 17.4842 14.4867 17.4851ZM13.4867 14.2562C13.4867 14.2562 6.35967 14.2562 6.01377 14.2562C5.66787 14.2562 5.38653 13.9692 5.38653 13.609C5.38653 13.2524 5.6655 12.9629 6.01437 12.9629H13.4962C13.8427 12.9629 14.1241 13.2499 14.1241 13.6096C14.1241 13.9662 13.8332 14.2562 13.4867 14.2562ZM20.1189 22H3.87994C3.63294 22.0005 3.38827 21.9507 3.15997 21.8535C2.93167 21.7562 2.72424 21.6135 2.54958 21.4334C2.37492 21.2534 2.23646 21.0395 2.14215 20.8042C2.04784 20.5688 1.99954 20.3166 2 20.0619V3.93869C2.00047 3.42478 2.19867 2.93203 2.55111 2.56858C2.90355 2.20513 3.38144 2.00065 3.87994 2H17.236C17.9307 2 18.4881 2.57764 18.4881 3.29389V18.1342C18.4881 18.4908 18.2097 18.7815 17.8608 18.7815C17.5149 18.7815 17.233 18.4932 17.233 18.1342V4.58228C17.2332 4.41265 17.201 4.24463 17.1381 4.08787C17.0752 3.93111 16.983 3.78869 16.8666 3.66877C16.7502 3.54885 16.612 3.45379 16.4599 3.38904C16.3078 3.32429 16.1449 3.29112 15.9803 3.29145H4.50659C4.34203 3.29104 4.179 3.32415 4.02688 3.38887C3.87476 3.45359 3.73653 3.54865 3.62014 3.66859C3.50374 3.78852 3.41147 3.93098 3.34862 4.08778C3.28577 4.24457 3.25358 4.41262 3.25389 4.58228V19.4226C3.2535 19.5923 3.28563 19.7604 3.34845 19.9173C3.41127 20.0742 3.50353 20.2167 3.61993 20.3367C3.73633 20.4567 3.87458 20.5518 4.02674 20.6166C4.1789 20.6813 4.34198 20.7144 4.50659 20.714H19.4904C19.6552 20.7144 19.8184 20.6813 19.9707 20.6166C20.123 20.5519 20.2614 20.4568 20.378 20.3368C20.4945 20.2169 20.587 20.0744 20.6501 19.9175C20.7132 19.7606 20.7456 19.5924 20.7455 19.4226V4.58228C20.7455 4.22568 21.0239 3.93503 21.3728 3.93503C21.7187 3.93503 22 4.22324 22 4.58228V20.0589C22.0002 20.3137 21.9517 20.5661 21.8573 20.8016C21.7628 21.0371 21.6242 21.2511 21.4494 21.4313C21.2746 21.6116 21.0671 21.7545 20.8387 21.852C20.6103 21.9495 20.3661 22.0002 20.1189 22Z"
              fill="white"
            />
            <path
              d="M11.5023 9.19328L12.6792 8.90789C13.1069 8.80417 13.1069 8.19583 12.6792 8.09211L11.5023 7.80672C11.3495 7.76969 11.2303 7.65045 11.1933 7.49774L10.9079 6.3208C10.8106 5.9198 10.2699 5.89474 10.1172 6.24561C10.107 6.26901 10.0986 6.29407 10.0921 6.3208L9.80672 7.49774C9.77201 7.64091 9.66504 7.75466 9.52597 7.79883C9.5167 7.80177 9.50729 7.80441 9.49774 7.80672L8.3208 8.09211C7.9198 8.18935 7.89474 8.7301 8.24561 8.88277C8.26901 8.89295 8.29407 8.90141 8.3208 8.90789L9.49774 9.19328C9.63137 9.22568 9.73936 9.32102 9.78908 9.44666C9.79618 9.4646 9.80209 9.48317 9.80672 9.50226L10.0921 10.6792C10.1958 11.1069 10.8042 11.1069 10.9079 10.6792L11.1933 9.50226C11.2303 9.34955 11.3495 9.23031 11.5023 9.19328Z"
              fill="white"
            />
          </g>
          <defs>
            <clipPath id="clip0_2_3324">
              <rect width="24" height="24" fill="white" />
            </clipPath>
          </defs>
        </svg>
      ),
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
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13.5023 5.19325L14.6793 4.90787C15.107 4.80415 15.107 4.19581 14.6793 4.09209L13.5023 3.8067C13.3496 3.76967 13.2304 3.65043 13.1933 3.49772L12.9079 2.32078C12.8107 1.91978 12.27 1.89471 12.1173 2.24559C12.1071 2.26898 12.0986 2.29404 12.0922 2.32078L11.8068 3.49772C11.7721 3.64089 11.6651 3.75463 11.526 3.7988C11.5168 3.80175 11.5073 3.80438 11.4978 3.8067L10.3209 4.09209C9.91985 4.18933 9.89479 4.73007 10.2457 4.88275C10.2691 4.89293 10.2941 4.90138 10.3209 4.90786L11.4978 5.19326C11.6314 5.22566 11.7394 5.321 11.7891 5.44663C11.7962 5.46458 11.8021 5.48315 11.8068 5.50224L12.0922 6.67918C12.1959 7.10691 12.8042 7.10691 12.9079 6.67918L13.1933 5.50224C13.2304 5.34952 13.3496 5.23029 13.5023 5.19325Z"
            fill="white"
          />
          <path
            d="M7.10139 3.91595L7.80755 3.74472C8.06419 3.68249 8.06419 3.31749 7.80755 3.25525L7.10139 3.08402C7.00976 3.0618 6.93822 2.99026 6.916 2.89863L6.74476 2.19247C6.68642 1.95187 6.36197 1.93683 6.27037 2.14735C6.26426 2.16139 6.25919 2.17643 6.2553 2.19247L6.08406 2.89863C6.06323 2.98453 5.99905 3.05278 5.91561 3.07928C5.91005 3.08105 5.9044 3.08263 5.89868 3.08402L5.19251 3.25525C4.95191 3.3136 4.93687 3.63804 5.1474 3.72965C5.16144 3.73576 5.17647 3.74083 5.19251 3.74472L5.89868 3.91595C5.97885 3.93539 6.04365 3.9926 6.07348 4.06798C6.07774 4.07875 6.08129 4.08989 6.08406 4.10134L6.2553 4.80751C6.31753 5.06415 6.68253 5.06415 6.74476 4.80751L6.916 4.10134C6.93822 4.00971 7.00976 3.93817 7.10139 3.91595Z"
            fill="white"
          />
          <path
            d="M4.96816 17.3244C4.8712 17.0659 4.583 16.9349 4.32444 17.0318C4.06588 17.1288 3.93488 17.417 4.03184 17.6756L4.5 17.5L4.96816 17.3244ZM0.878732 9.01493C0.610835 9.0819 0.447954 9.35337 0.514929 9.62127C0.581903 9.88917 0.85337 10.052 1.12127 9.98507L1 9.5L0.878732 9.01493ZM3 9.99996L2.64646 10.3535L3 9.99996ZM7.5 15C7.77614 15 8 14.7761 8 14.5C8 14.2239 7.77614 14 7.5 14V14.5V15ZM4.5 17.5L4.03184 17.6756C4.1532 17.9992 4.27318 18.3696 4.40943 18.7703C4.54283 19.1627 4.68933 19.5762 4.85504 19.9518C5.01851 20.3224 5.21455 20.6888 5.45911 20.9693C5.70523 21.2515 6.04974 21.5 6.5 21.5V21V20.5C6.45026 20.5 6.35727 20.4777 6.21277 20.312C6.0667 20.1445 5.91899 19.886 5.76996 19.5482C5.62317 19.2155 5.48842 18.8373 5.3562 18.4484C5.22682 18.0679 5.0968 17.6675 4.96816 17.3244L4.5 17.5ZM6.5 21V21.5C6.97175 21.5 7.19296 21.1075 7.28059 20.8899C7.38104 20.6404 7.43123 20.3333 7.45964 20.0499C7.51718 19.4757 7.5 18.8128 7.5 18.5H7H6.5C6.5 18.8539 6.51566 19.441 6.46462 19.9501C6.43875 20.2083 6.39929 20.4013 6.35295 20.5164C6.29381 20.6633 6.31109 20.5 6.5 20.5V21ZM1 9.5L1.12127 9.98507C1.64762 9.85348 2.2911 9.9982 2.64646 10.3535L3 9.99996L3.35354 9.64639C2.7089 9.0018 1.68571 8.81318 0.878732 9.01493L1 9.5ZM3 9.99996L2.64646 10.3535C2.78585 10.4929 2.97342 10.8015 3.25154 11.2856C3.51183 11.7388 3.82675 12.2974 4.19849 12.8319C4.92403 13.8752 5.9824 15 7.5 15V14.5V14C6.5176 14 5.72128 13.2701 5.01947 12.261C4.67754 11.7693 4.38562 11.2523 4.11866 10.7876C3.86954 10.3539 3.60945 9.90228 3.35354 9.64639L3 9.99996Z"
            fill="white"
          />
          <path
            d="M10.4999 18.5C8.8332 18.5 4.83515 18.2459 3.23515 16.6459C1.23515 14.6459 -0.500122 9.646 1.49988 8.646C3.49988 7.646 7.23516 5.64594 10.7352 11.1459C13.505 15.4985 17.1555 12.3814 18.6859 10.2163C18.7148 10.1755 18.7081 10.121 18.6718 10.0866C18.2717 9.70774 16.1473 7.62662 17.2352 7.14593C17.9716 6.82054 18.6811 7.06187 19.2352 7.64593C19.4058 7.8258 19.5439 8.12387 19.6313 8.34789C19.6847 8.48462 19.8635 8.53636 19.9799 8.44695C20.3597 8.15526 21.112 7.64593 21.7352 7.64593C22.3526 7.64592 22.8926 7.63216 23.2352 8.14593C23.7195 8.87251 23.028 9.77999 22.2352 10.1459C21.7033 10.3914 20.8399 9.56959 20.7352 10.1459C20.4018 11.9793 18.9999 16.4 14.9999 18"
            stroke="white"
            stroke-linecap="round"
          />
          <path
            d="M13.5 17C14.1667 17.6667 16 19.5 15 20.5C14.2094 21.2906 11 19 9.5 17.5"
            stroke="white"
            stroke-linecap="round"
          />
          <circle cx="6.8" cy="10.8" r="0.8" fill="white" />
        </svg>
      ),
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
            outputPreview:
              typeof event.output === "string"
                ? event.output.substring(0, 100)
                : event.output,
          });

          if (targetAgentType) {
            // 更新对应 agent 的状态
            setAgentsData((prev) =>
              prev.map((agent) => {
                if (
                  agent.type === targetAgentType ||
                  agent.id === targetAgentType
                ) {
                  console.log(
                    `✅ 标记 ${targetAgentType} agent 为完成，显示结论`
                  );
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
              if (
                message.length > 0 &&
                message[0].side &&
                message[0].price !== undefined
              ) {
                // 这是新格式的交易数据
                tradesDataArray = message as TradeData[];
                console.log("🐋 收到交易数据（新格式）:", {
                  agentType,
                  tradesCount: tradesDataArray.length,
                  markets: [...new Set(tradesDataArray.map((t) => t.title))]
                    .length,
                  totalVolume: tradesDataArray
                    .reduce((sum, t) => sum + t.size, 0)
                    .toFixed(2),
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

              if (
                Array.isArray(parsed) &&
                parsed.length > 0 &&
                parsed[0].side
              ) {
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
              const groupedData: TopHoldersData[] = Object.entries(
                tradesByMarket
              ).map(([title, trades]) => ({
                token: title, // 使用标题作为标识
                trades: trades, // 存储交易记录
              }));

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
        } else if (event.tool_name === "social_citations") {
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
      const response = await historyService.getSessionDetail(
        userId,
        sessionIdToLoad
      );

      if (response.status === "ok" && response.code === 0) {
        setSessionMessages(response.data);

        // 设置第一个用户消息作为问题标题
        const firstUserMessage = response.data.find(
          (msg) => msg.role === "user"
        );
        if (firstUserMessage) {
          setQuestion(firstUserMessage.content);
          setQuery(firstUserMessage.content);
        }

        console.log("✅ 会话详情加载完成:", {
          totalMessages: response.data.length,
          userMessages: response.data.filter((m) => m.role === "user").length,
          assistantMessages: response.data.filter((m) => m.role === "assistant")
            .length,
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
          conclusion: selectedAgent.conclusion,
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
          conclusion: selectedAgent.conclusion,
        };

  if (loading && !question) {
    return <LoadingPage />;
  }

  return (
    <div className="min-h-screen bg-[#0F0F23]">
      {/* Header */}

      <Header
        title="Thinking Process"
        showSearch={true}
        onLoginSuccess={onLoginSuccess}
      />
      {/* 顶部大图标 + 标题 */}
      <div className="flex items-center gap-[12px] px-8 pt-[18px] pb-[24px]">
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M34.5 3C34.5 3.82843 33.8284 4.5 33 4.5C32.1716 4.5 31.5 3.82843 31.5 3C31.5 2.17157 32.1716 1.5 33 1.5C33.8284 1.5 34.5 2.17157 34.5 3Z"
            fill="url(#paint0_linear_2_3261)"
          />
          <path
            d="M18.9054 18.1639L21.7301 17.4789C22.7566 17.23 22.7566 15.77 21.7301 15.5211L18.9054 14.8361C18.5389 14.7473 18.2527 14.4611 18.1639 14.0946L17.4789 11.2699C17.2456 10.3075 15.9478 10.2474 15.5813 11.0895C15.5569 11.1456 15.5366 11.2058 15.5211 11.2699L14.8361 14.0946C14.7528 14.4382 14.4961 14.7112 14.1623 14.8172C14.1401 14.8243 14.1175 14.8306 14.0946 14.8361L11.2699 15.5211C10.3075 15.7544 10.2474 17.0522 11.0895 17.4187C11.1456 17.4431 11.2058 17.4634 11.2699 17.4789L14.0946 18.1639C14.4153 18.2416 14.6745 18.4704 14.7938 18.772C14.8108 18.8151 14.825 18.8596 14.8361 18.9054L15.5211 21.7301C15.77 22.7566 17.23 22.7566 17.4789 21.7301L18.1639 18.9054C18.2527 18.5389 18.5389 18.2527 18.9054 18.1639Z"
            fill="url(#paint1_linear_2_3261)"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M16.5 3C9.04416 3 3 9.04416 3 16.5C3 23.9558 9.04416 30 16.5 30C19.6875 30 22.617 28.8953 24.9265 27.0478L31.9393 34.0607C32.5251 34.6464 33.4749 34.6464 34.0607 34.0607C34.6464 33.4749 34.6464 32.5251 34.0607 31.9393L27.0478 24.9265C28.8953 22.617 30 19.6875 30 16.5C30 9.04416 23.9558 3 16.5 3ZM5.7 16.5C5.7 22.4647 10.5353 27.3 16.5 27.3C22.4647 27.3 27.3 22.4647 27.3 16.5C27.3 10.5353 22.4647 5.7 16.5 5.7C10.5353 5.7 5.7 10.5353 5.7 16.5Z"
            fill="url(#paint2_linear_2_3261)"
          />
          <path
            d="M3 34.5C3.82843 34.5 4.5 33.8284 4.5 33C4.5 32.1716 3.82843 31.5 3 31.5C2.17157 31.5 1.5 32.1716 1.5 33C1.5 33.8284 2.17157 34.5 3 34.5Z"
            fill="url(#paint3_linear_2_3261)"
          />
          <defs>
            <linearGradient
              id="paint0_linear_2_3261"
              x1="26.5"
              y1="7"
              x2="40"
              y2="26"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#D3FB7A" />
              <stop offset="0.851427" stopColor="#7D52F4" />
            </linearGradient>
            <linearGradient
              id="paint1_linear_2_3261"
              x1="26.5"
              y1="7"
              x2="40"
              y2="26"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#D3FB7A" />
              <stop offset="0.851427" stopColor="#7D52F4" />
            </linearGradient>
            <linearGradient
              id="paint2_linear_2_3261"
              x1="26.5"
              y1="7"
              x2="40"
              y2="26"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#D3FB7A" />
              <stop offset="0.851427" stopColor="#7D52F4" />
            </linearGradient>
            <linearGradient
              id="paint3_linear_2_3261"
              x1="26.5"
              y1="7"
              x2="40"
              y2="26"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#D3FB7A" />
              <stop offset="0.851427" stopColor="#7D52F4" />
            </linearGradient>
          </defs>
        </svg>
        <div className="text-[20px] font-medium text-white">
          The AI agent is currently analyzing...
        </div>
      </div>

      {/* 第二行：进度条（左）+ Tab 按钮（右）*/}
      <div className="flex items-center justify-between px-8 pb-4">
        {/* 左边：进度条 */}
        <div className="flex items-center gap-3 flex-1 mr-6">
          <span className="text-[14px] text-white whitespace-nowrap">
            Total Progressing
          </span>
          <div className="flex-1 h-[12px] bg-[rgba(211,251,122,0.2)] rounded-full overflow-hidden max-w-[176px]">
            <div
              className="h-full bg-[rgba(211,251,122,1)] transition-all duration-500"
              style={{
                width: `${
                  (agentsData.filter((a) => a.status === "completed").length /
                    agentsData.length) *
                  100
                }%`,
              }}
            />
          </div>
          <span className="text-[14px] font-medium text-white whitespace-nowrap">
            {Math.round(
              (agentsData.filter((a) => a.status === "completed").length /
                agentsData.length) *
                100
            )}
            %
          </span>
        </div>

        {/* 右边：Tab 按钮 */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("thinking")}
            className={`px-[12px] py-[8px] rounded-lg text-[12px]  transition-colors flex items-center gap-[4px] ${
              activeTab === "thinking"
                ? "bg-transparent border border-[#D3FB7A] text-[#D3FB7A]"
                : "bg-transparent border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
            }`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6.00014 6.9C5.95014 6.9 5.90014 6.9 5.85014 6.85C4.75014 6.45 4.00014 5.4 4.00014 4.25C4.00014 2.75 5.25014 1.5 6.75014 1.5C8.25014 1.5 9.50014 2.75 9.50014 4.25C9.50014 4.55 9.30014 4.75 9.00014 4.75C8.70014 4.75 8.50014 4.55 8.50014 4.25C8.50014 3.3 7.70014 2.5 6.75014 2.5C5.80014 2.5 5.00014 3.3 5.00014 4.25C5.00014 5 5.45014 5.65 6.15014 5.9C6.40014 6 6.55014 6.3 6.45014 6.55C6.40014 6.75 6.20014 6.9 6.00014 6.9ZM9.00014 11.4C8.70014 11.4 8.50014 11.15 8.50014 10.85C8.50014 10.55 8.45014 10.25 8.30014 9.95C8.10014 9.55 7.70014 9.25 7.30014 9.1C6.85014 8.95 6.40014 9 5.95014 9.2C5.70014 9.35 5.40014 9.25 5.25014 9C5.10014 8.75 5.20014 8.45 5.45014 8.3C6.10014 7.95 6.85014 7.9 7.55014 8.1C8.25014 8.3 8.80014 8.8 9.15014 9.45C9.40014 9.9 9.50014 10.4 9.45014 10.9C9.50014 11.2 9.25014 11.4 9.00014 11.4ZM6.75014 18.5C6.05014 18.5 5.35014 18.25 4.80014 17.7C4.00014 16.9 3.75014 15.6 4.25014 14.55C4.35014 14.3 4.65014 14.2 4.90014 14.3C5.15014 14.4 5.25014 14.7 5.15014 14.95C4.85014 15.6 4.95014 16.4 5.50014 16.95C6.20014 17.65 7.30014 17.65 8.00014 16.95C8.70014 16.25 8.70014 15.15 8.00014 14.45C7.80014 14.25 7.80014 13.95 8.00014 13.75C8.20014 13.55 8.50014 13.55 8.70014 13.75C9.75014 14.8 9.75014 16.55 8.70014 17.65C8.15014 18.25 7.45014 18.5 6.75014 18.5Z"
                fill="#D3FB7A"
              />
              <path
                d="M4.25 10.5C2.75 10.5 1.5 9.25 1.5 7.75C1.5 6.25 2.75 5 4.25 5C4.55 5 4.85 5.05 5.1 5.15C5.35 5.25 5.5 5.5 5.4 5.8C5.3 6.05 5.05 6.2 4.75 6.1C4.55 6.05 4.4 6 4.2 6C3.25 6 2.45 6.8 2.45 7.75C2.45 8.7 3.25 9.5 4.2 9.5C4.5 9.5 4.7 9.7 4.7 10C4.7 10.3 4.55 10.5 4.25 10.5ZM9 16.5C8.75 16.5 8.5 16.25 8.5 16V4C8.5 3.75 8.75 3.5 9 3.5C9.3 3.5 9.5 3.75 9.5 4V16C9.5 16.3 9.25 16.5 9 16.5Z"
                fill="#D3FB7A"
              />
              <path
                d="M6.74998 18.5001C5.89998 18.5001 4.99998 18.1001 4.49998 17.3001C3.84998 16.3501 3.84998 15.0501 4.54998 14.1001C4.69998 13.9001 4.99998 13.8501 5.24998 14.0001C5.49998 14.1501 5.49998 14.4501 5.34998 14.7001C4.89998 15.3001 4.89998 16.1001 5.34998 16.7501C5.89998 17.5501 6.99998 17.7501 7.79998 17.2001C8.59998 16.6501 8.79998 15.5501 8.24998 14.7501C8.09998 14.5001 8.14998 14.2001 8.39998 14.0501C8.64998 13.9001 8.94998 13.9501 9.09998 14.2001C9.94998 15.4501 9.64998 17.1501 8.39998 18.0501C7.84998 18.3501 7.29998 18.5001 6.74998 18.5001Z"
                fill="#D3FB7A"
              />
              <path
                d="M4.25 15C2.75 15 1.5 13.75 1.5 12.25C1.5 10.75 2.75 9.5 4.25 9.5C4.55 9.5 4.75 9.7 4.75 10C4.75 10.3 4.55 10.5 4.25 10.5C3.3 10.5 2.5 11.3 2.5 12.25C2.5 13.2 3.3 14 4.25 14C5.2 14 6 13.2 6 12.25C6 11.95 6.2 11.75 6.5 11.75C6.8 11.75 7 11.95 7 12.25C7 13.75 5.75 15 4.25 15ZM14 6.9C13.8 6.9 13.6 6.75 13.55 6.55C13.45 6.3 13.6 6 13.85 5.9C14.55 5.65 15 5 15 4.25C15 3.3 14.2 2.5 13.25 2.5C12.3 2.5 11.5 3.3 11.5 4.25C11.5 4.55 11.3 4.75 11 4.75C10.7 4.75 10.5 4.55 10.5 4.25C10.5 2.75 11.75 1.5 13.25 1.5C14.75 1.5 16 2.75 16 4.25C16 5.4 15.25 6.45 14.15 6.85C14.1 6.85 14.05 6.9 14 6.9ZM11 11.4C10.75 11.4 10.5 11.2 10.5 10.95C10.45 10.45 10.6 9.95 10.8 9.5C11.15 8.85 11.7 8.35 12.4 8.15C13.1 7.95 13.85 8 14.5 8.35C14.75 8.5 14.85 8.8 14.7 9.05C14.55 9.3 14.25 9.4 14 9.25C13.6 9.05 13.1 9 12.65 9.15C12.2 9.3 11.85 9.6 11.65 10C11.5 10.3 11.45 10.6 11.45 10.9C11.5 11.1 11.3 11.35 11 11.4ZM13.25 18.5C12.55 18.5 11.85 18.25 11.3 17.7C10.25 16.65 10.25 14.9 11.3 13.8C11.5 13.6 11.8 13.6 12 13.8C12.2 14 12.2 14.3 12 14.5C11.3 15.2 11.3 16.3 12 17C12.7 17.7 13.8 17.7 14.5 17C15 16.5 15.15 15.65 14.85 15C14.75 14.75 14.85 14.45 15.1 14.35C15.35 14.25 15.65 14.35 15.75 14.6C16.25 15.65 16.05 16.9 15.2 17.75C14.65 18.25 13.95 18.5 13.25 18.5Z"
                fill="#D3FB7A"
              />
              <path
                d="M15.75 10.5C15.45 10.5 15.25 10.3 15.25 10C15.25 9.7 15.45 9.5 15.75 9.5C16.7 9.5 17.5 8.7 17.5 7.75C17.5 6.8 16.7 6 15.75 6C15.55 6 15.35 6.05 15.2 6.1C14.95 6.2 14.65 6.05 14.55 5.8C14.45 5.55 14.6 5.25 14.85 5.15C15.15 5.05 15.4 5 15.7 5C17.2 5 18.45 6.25 18.45 7.75C18.45 9.25 17.25 10.5 15.75 10.5ZM11 16.5C11.25 16.5 11.5 16.25 11.5 16V4C11.5 3.75 11.25 3.5 11 3.5C10.7 3.5 10.5 3.75 10.5 4V16C10.5 16.3 10.75 16.5 11 16.5Z"
                fill="#D3FB7A"
              />
              <path
                d="M13.2499 18.5C12.6999 18.5 12.1499 18.35 11.6999 18C10.4499 17.15 10.1499 15.4 10.9999 14.15C11.1499 13.9 11.4499 13.85 11.6999 14C11.9499 14.15 11.9999 14.45 11.8499 14.7C11.2999 15.5 11.4999 16.6 12.2999 17.15C13.0999 17.7 14.1999 17.5 14.7499 16.7C15.1499 16.1 15.1499 15.3 14.7499 14.65C14.5999 14.45 14.6499 14.1 14.8499 13.95C15.0499 13.8 15.3999 13.85 15.5499 14.05C16.2499 15 16.2499 16.25 15.5999 17.25C14.9499 18.1 14.0999 18.5 13.2499 18.5Z"
                fill="#D3FB7A"
              />
              <path
                d="M15.75 15C14.25 15 13 13.75 13 12.25C13 11.95 13.2 11.75 13.5 11.75C13.8 11.75 14 11.95 14 12.25C14 13.2 14.8 14 15.75 14C16.7 14 17.5 13.2 17.5 12.25C17.5 11.3 16.7 10.5 15.75 10.5C15.45 10.5 15.25 10.3 15.25 10C15.25 9.7 15.45 9.5 15.75 9.5C17.25 9.5 18.5 10.75 18.5 12.25C18.5 13.75 17.25 15 15.75 15Z"
                fill="#D3FB7A"
              />
            </svg>
            Thought Process
          </button>
          <button
            onClick={() => setActiveTab("result")}
            className={`px-[12px] py-[8px] rounded-lg text-[12px] transition-colors flex items-center gap-[4px] ${
              activeTab === "result"
                ? "bg-transparent border border-[#D3FB7A] text-[#D3FB7A]"
                : "bg-transparent border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
            }`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M7.55483 8.72787C7.46311 8.7337 7.37128 8.71887 7.28538 8.68435C7.19947 8.64983 7.12146 8.59641 7.0565 8.52763C6.99153 8.45884 6.94108 8.37624 6.90848 8.28528C6.87588 8.19433 6.86187 8.09709 6.86738 7.99998C6.86187 7.90287 6.87588 7.80563 6.90848 7.71468C6.94108 7.62372 6.99153 7.54113 7.0565 7.47234C7.12146 7.40355 7.19947 7.35013 7.28538 7.31561C7.37128 7.2811 7.46311 7.26626 7.55483 7.27209C10.5766 7.27209 13.0469 4.36055 13.0469 0.729108C13.0469 0.53606 13.1193 0.350919 13.2482 0.214414C13.3771 0.0779086 13.552 0.0012207 13.7343 0.0012207C13.9166 0.0012207 14.0915 0.0779086 14.2204 0.214414C14.3493 0.350919 14.4218 0.53606 14.4218 0.729108C14.4218 5.16042 11.332 8.72787 7.55483 8.72787Z"
                fill="white"
              />
              <path
                d="M7.55463 7.27211C7.64634 7.26628 7.73818 7.28111 7.82408 7.31563C7.90998 7.35015 7.98799 7.40356 8.05296 7.47235C8.11793 7.54114 8.16838 7.62374 8.20098 7.71469C8.23357 7.80565 8.24758 7.90289 8.24208 8C8.24758 8.09711 8.23357 8.19435 8.20098 8.2853C8.16838 8.37625 8.11793 8.45885 8.05296 8.52764C7.98799 8.59643 7.90998 8.64985 7.82408 8.68437C7.73818 8.71888 7.64634 8.73372 7.55463 8.72788C4.53287 8.72788 2.06259 11.6394 2.06259 15.2709C2.0681 15.368 2.05409 15.4652 2.02149 15.5562C1.98889 15.6471 1.93844 15.7297 1.87347 15.7985C1.8085 15.8673 1.73049 15.9207 1.64459 15.9552C1.55869 15.9898 1.46685 16.0046 1.37514 15.9988C1.28343 16.0046 1.19159 15.9898 1.10569 15.9552C1.01979 15.9207 0.941778 15.8673 0.87681 15.7985C0.811842 15.7297 0.761392 15.6471 0.728793 15.5562C0.696193 15.4652 0.682185 15.368 0.687692 15.2709C0.687692 10.8396 3.77744 7.27211 7.55463 7.27211ZM6.86718 3.64067H8.24208C8.33341 3.63365 8.4251 3.64738 8.51101 3.68096C8.59691 3.71454 8.67504 3.76719 8.74015 3.83537C8.80526 3.90355 8.85584 3.98569 8.8885 4.07627C8.92117 4.16685 8.93515 4.26379 8.92953 4.36056C8.93503 4.45767 8.92102 4.55491 8.88842 4.64586C8.85582 4.73682 8.80538 4.81942 8.74041 4.88821C8.67544 4.957 8.59743 5.01041 8.51153 5.04493C8.42563 5.07945 8.33379 5.09428 8.24208 5.08845H6.86718C6.77547 5.09428 6.68363 5.07945 6.59773 5.04493C6.51182 5.01041 6.43382 4.957 6.36885 4.88821C6.30388 4.81942 6.25343 4.73682 6.22083 4.64586C6.18823 4.55491 6.17422 4.45767 6.17973 4.36056C6.17533 4.2641 6.19015 4.16775 6.22325 4.07776C6.25634 3.98777 6.30696 3.90617 6.3718 3.83826C6.43665 3.77035 6.51427 3.71767 6.59962 3.68362C6.68497 3.64958 6.77613 3.63495 6.86718 3.64067ZM6.86718 10.9115H8.24208C8.33789 10.9009 8.43476 10.9116 8.5264 10.9431C8.61803 10.9747 8.70239 11.0262 8.77399 11.0945C8.8456 11.1627 8.90285 11.2462 8.94205 11.3393C8.98124 11.4325 9.00149 11.5334 9.00149 11.6354C9.00149 11.7374 8.98124 11.8383 8.94205 11.9315C8.90285 12.0247 8.8456 12.1081 8.77399 12.1764C8.70239 12.2447 8.61803 12.2962 8.5264 12.3277C8.43476 12.3592 8.33789 12.37 8.24208 12.3593H6.86718C6.77136 12.37 6.67449 12.3592 6.58286 12.3277C6.49122 12.2962 6.40687 12.2447 6.33526 12.1764C6.26366 12.1081 6.2064 12.0247 6.16721 11.9315C6.12802 11.8383 6.10776 11.7374 6.10776 11.6354C6.10776 11.5334 6.12802 11.4325 6.16721 11.3393C6.2064 11.2462 6.26366 11.1627 6.33526 11.0945C6.40687 11.0262 6.49122 10.9747 6.58286 10.9431C6.67449 10.9116 6.77136 10.9009 6.86718 10.9115ZM4.80483 0.729124H10.3044C10.3961 0.723293 10.488 0.738126 10.5739 0.772643C10.6598 0.80716 10.7378 0.860577 10.8028 0.929367C10.8677 0.998156 10.9182 1.08075 10.9508 1.17171C10.9834 1.26266 10.9974 1.3599 10.9919 1.45701C10.9962 1.55381 10.9814 1.65049 10.9483 1.74087C10.9153 1.83125 10.8648 1.91333 10.8001 1.98185C10.7354 2.05037 10.6579 2.10383 10.5725 2.13879C10.4872 2.17376 10.3958 2.18946 10.3044 2.1849H4.80483C4.71373 2.18956 4.62273 2.17386 4.53774 2.13882C4.45275 2.10378 4.37568 2.05019 4.31155 1.98153C4.24741 1.91287 4.19765 1.83068 4.1655 1.74031C4.13335 1.64994 4.11953 1.55341 4.12494 1.45701C4.1183 1.36031 4.13127 1.26322 4.16299 1.17226C4.1947 1.0813 4.24443 0.998577 4.30882 0.929639C4.37321 0.860701 4.45079 0.807142 4.53634 0.772559C4.62189 0.737975 4.71343 0.723165 4.80483 0.729124ZM4.80483 13.8151H10.3044C10.4867 13.8151 10.6616 13.8918 10.7905 14.0283C10.9194 14.1648 10.9919 14.3499 10.9919 14.543C10.9919 14.736 10.9194 14.9212 10.7905 15.0577C10.6616 15.1942 10.4867 15.2709 10.3044 15.2709H4.80483C4.62251 15.2709 4.44765 15.1942 4.31873 15.0577C4.18981 14.9212 4.11738 14.736 4.11738 14.543C4.11738 14.3499 4.18981 14.1648 4.31873 14.0283C4.44765 13.8918 4.62251 13.8151 4.80483 13.8151ZM14.4216 15.2709C14.4216 15.4639 14.3491 15.6491 14.2202 15.7856C14.0913 15.9221 13.9164 15.9988 13.7341 15.9988C13.5518 15.9988 13.3769 15.9221 13.248 15.7856C13.1191 15.6491 13.0467 15.4639 13.0467 15.2709C13.0719 13.5893 12.5096 11.9571 11.4678 10.6876C11.4083 10.6166 11.3628 10.5338 11.3339 10.444C11.3051 10.3542 11.2935 10.2591 11.2998 10.1645C11.3062 10.0699 11.3303 9.97752 11.3708 9.89289C11.4113 9.80827 11.4674 9.73308 11.5358 9.67174C11.6034 9.60851 11.6823 9.56016 11.7677 9.52951C11.8532 9.49886 11.9435 9.48653 12.0335 9.49323C12.1235 9.49993 12.2114 9.52553 12.2919 9.56854C12.3725 9.61154 12.4441 9.6711 12.5027 9.74373C13.7636 11.2729 14.4469 13.2411 14.4216 15.2709ZM0.687692 0.729124C0.682185 0.632016 0.696193 0.534775 0.728793 0.443821C0.761392 0.352867 0.811842 0.270269 0.87681 0.201479C0.941778 0.13269 1.01979 0.0792731 1.10569 0.0447559C1.19159 0.0102386 1.28343 -0.00459411 1.37514 0.0012368C1.46685 -0.00459411 1.55869 0.0102386 1.64459 0.0447559C1.73049 0.0792731 1.8085 0.13269 1.87347 0.201479C1.93844 0.270269 1.98889 0.352867 2.02149 0.443821C2.05409 0.534775 2.0681 0.632016 2.06259 0.729124C2.02942 2.41212 2.5927 4.04726 3.64146 5.31241C3.75967 5.45667 3.81891 5.64474 3.80616 5.83524C3.79341 6.02575 3.70971 6.20309 3.57347 6.32826C3.43723 6.45342 3.25961 6.51615 3.07968 6.50265C2.89976 6.48915 2.73227 6.40052 2.61406 6.25627C1.34797 4.72985 0.661583 2.76046 0.687692 0.729124Z"
                fill="white"
              />
            </svg>
            Analysis Results
          </button>
        </div>
      </div>
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

          {isHistoryView && sessionMessages.length > 0 && (
            <div className="space-y-6">
              {sessionMessages
                .filter(
                  (message) =>
                    message.content &&
                    message.content.trim() !== "" &&
                    message.role !== "user"
                )
                .map((message, index) => (
                  <div
                    key={index}
                    className={`rounded-2xl p-6 animate-fadeInUp ${
                      message.role === "user"
                        ? "bg-blue-600/20 border border-blue-500/30"
                        : "bg-gradient-primary"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      {message.role === "user" ? (
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
                        {new Date(message.create_time).toLocaleString("zh-CN")}
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
              <div className="grid grid-cols-1 lg:grid-cols-[160px_1fr] gap-6">
                {/* Left Column - Agent Cards */}
                <div className="space-y-2">
                  {agentsData.map((agent, index) => {
                    const isSelected = agent.id === selectedAgentId;
                    const isActive = agent.status === "thinking";
                    const isCompleted = agent.status === "completed";
                    const isWaiting = agent.status === "waiting";

                    // 计算进度百分比
                    const getProgress = () => {
                      if (isCompleted) return 100;
                      if (isActive) return 50;
                      return 0;
                    };
                    const progress = getProgress();

                    return (
                      <button
                        key={agent.id}
                        onClick={() => setSelectedAgentId(agent.id)}
                        className={`w-full text-left rounded-[12px] px-4 py-3 transition-all duration-200 border ${
                          isSelected
                            ? "bg-gradient-to-br from-[#7D52F4] to-[#6B45D8] border-transparent"
                            : "bg-[#1C1E2B] border-[#2A2E39] hover:border-[#3A3E49]"
                        }`}
                        style={{
                          animationDelay: `${index * 100}ms`,
                          animationFillMode: "both",
                        }}
                      >
                        {/* 顶部：图标 + 名称 */}
                        <div className="flex items-center gap-2 mb-3">
                          <div
                            className="flex-shrink-0"
                            style={{
                              color: isSelected ? "#D3FB7A" : "white",
                            }}
                          >
                            <div className="[&_svg]:w-6 [&_svg]:h-6 [&_svg_path]:fill-current [&_svg_circle]:fill-current [&_svg_rect]:fill-current">
                              {agent.icon}
                            </div>
                          </div>
                          <span
                            className={`text-[16px] font-medium truncate flex-1 ${
                              isSelected ? "text-[#D3FB7A]" : "text-white"
                            }`}
                          >
                            {agent.name}
                          </span>
                        </div>

                        {/* 进度条 */}
                        <div className="mb-2">
                          <div
                            className={`h-[6px] rounded-full overflow-hidden ${
                              isSelected ? "bg-white/20" : "bg-[#2A2E39]"
                            }`}
                          >
                            <div
                              className={`h-full transition-all duration-500 ${
                                isSelected ? "bg-[#D3FB7A]" : "bg-white"
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* 底部：状态 + 百分比 */}
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="text-white">
                            {isActive
                              ? "Analysing..."
                              : isCompleted
                              ? "Analysis"
                              : "Waiting..."}
                          </span>
                          <span className="font-medium text-white">
                            {progress}%
                          </span>
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
                  {/* 右侧内容区域标题 - 仅非 Social Agent 显示 */}
                  {selectedAgent && selectedAgent.type !== "social" && (
                    <div className="bg-[rgba(28,30,43,1)] rounded-lg p-4 border border-gray-800">
                      <div className="text-sm text-gray-300 mb-3">
                        {isStreaming && selectedAgent.status === "thinking"
                          ? "A few seconds, I'm trying to think..."
                          : selectedAgent.status === "completed"
                          ? "Analysis completed"
                          : "Waiting to start..."}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <div className="w-4 h-4 rounded bg-green-500/20 flex items-center justify-center">
                          <span className="text-green-400 text-[10px]">+</span>
                        </div>
                        <span className="font-medium">
                          {selectedAgent.type === "news"
                            ? "News Analysis"
                            : selectedAgent.type === "tech"
                            ? "Technical Analysis"
                            : "Whales Activity"}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedAgent.status === "completed" &&
                    displayData.conclusion && (
                      <div className="bg-[#1A1A2E] border border-green-800 rounded-2xl p-6 animate-fadeIn">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex items-center justify-center w-8 h-8 bg-green-500/20 rounded-lg">
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
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                          <div className="text-white font-semibold text-lg">
                            分析结论
                          </div>
                        </div>
                        <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => (
                                <p className="mb-3 last:mb-0">{children}</p>
                              ),
                              strong: ({ children }) => (
                                <strong className="text-white font-semibold">
                                  {children}
                                </strong>
                              ),
                              ul: ({ children }) => (
                                <ul className="list-disc list-inside mb-3 space-y-1">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="list-decimal list-inside mb-3 space-y-1">
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li className="text-gray-300">{children}</li>
                              ),
                              code: ({ children }) => (
                                <code className="bg-gray-800 px-1.5 py-0.5 rounded text-cyan-400 text-xs">
                                  {children}
                                </code>
                              ),
                            }}
                          >
                            {displayData.conclusion}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                  {/* News Agent: 只显示两行思考过程 */}
                  {!displayData.conclusion && selectedAgent.type === "news" && (
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
                          maxHeight: "3rem", // 约两行高度 (1.5rem line-height * 2)
                          scrollbarWidth: "thin",
                          scrollbarColor: "rgba(251, 146, 60, 0.5) transparent",
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

                      {displayData.topHolders &&
                        displayData.topHolders.length > 0 && (
                          <div className="space-y-4">
                            {displayData.topHolders.map(
                              (topHoldersData, idx) => {
                                // 🆕 如果有交易数据，使用新的交易列表展示
                                const hasTrades =
                                  topHoldersData.trades &&
                                  topHoldersData.trades.length > 0;

                                if (
                                  hasTrades &&
                                  selectedAgent.type === "whales"
                                ) {
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

                  {/* Twitter Citations - Social Agent */}
                  {selectedAgent.type === "social" && (
                    <div className="relative border border-purple-500/50 rounded-2xl p-6 bg-[#0F0F23]">
                      {/* 左侧箭头 - 作为边框延伸的尖角 */}
                      <div className="absolute left-0 top-[35px]">
                        <svg
                          width="20"
                          height="40"
                          viewBox="0 0 20 40"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="translate-x-[-19px]"
                        >
                          {/* 背景填充 - 与内容区背景一致 */}
                          <path
                            d="M19 0 L0 20 L19 40 Z"
                            fill="#0F0F23"
                          />
                          {/* 上边框线 */}
                          <path
                            d="M19 0 L0 20"
                            stroke="rgba(168, 85, 247, 0.5)"
                            strokeWidth="1"
                          />
                          {/* 下边框线 */}
                          <path
                            d="M0 20 L19 40"
                            stroke="rgba(168, 85, 247, 0.5)"
                            strokeWidth="1"
                          />
                        </svg>
                      </div>
                      
                      {/* 顶部状态 */}
                      <div className="text-sm text-gray-300 mb-4">
                        {isStreaming && selectedAgent.status === "thinking"
                          ? "A few seconds, I'm trying to think..."
                          : selectedAgent.status === "completed"
                          ? "Analysis completed"
                          : "Waiting to start..."}
                      </div>
                      {/* Related News 标签 */}
                      <div className="flex items-center gap-2 text-sm mb-6">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M11.2074 10.2184L14.9736 9.30517C16.3424 8.97326 16.3424 7.02659 14.9736 6.69469L11.2074 5.78144C10.7187 5.66294 10.3372 5.28138 10.2187 4.7927L9.30541 1.02649C8.99425 -0.256716 7.26386 -0.336916 6.77529 0.785889C6.74272 0.860742 6.71567 0.940943 6.69492 1.02649L5.78168 4.7927C5.67059 5.25084 5.32829 5.61482 4.88327 5.75617C4.8536 5.7656 4.82348 5.77403 4.79294 5.78144L1.02673 6.69468C-0.256476 7.00584 -0.336672 8.73624 0.786133 9.2248C0.860987 9.25737 0.941187 9.28442 1.02673 9.30517L4.79294 10.2184C5.22054 10.3221 5.56611 10.6272 5.72521 11.0292C5.74794 11.0867 5.76687 11.1461 5.78168 11.2072L6.69492 14.9734C7.02683 16.3421 8.9735 16.3421 9.30541 14.9734L10.2187 11.2072C10.3372 10.7185 10.7187 10.3369 11.2074 10.2184Z"
                            fill="#D3FB7A"
                          />
                        </svg>

                        <span className="font-medium text-white">
                          Related News
                        </span>
                      </div>
                      {/* Twitter 卡片瀑布流 */}
                      {displayData.citations &&
                        displayData.citations.length > 0 && (
                          <div 
                            className="columns-1 md:columns-2"
                            style={{
                              columnGap: '12px'
                            }}
                          >
                            {displayData.citations.map((citation, idx) => (
                              <div 
                                key={citation.id_str} 
                                className="break-inside-avoid inline-block w-full"
                                style={{ marginBottom: '12px' }}
                              >
                                <TwitterCard {...citation} />
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  )}

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
