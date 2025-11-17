# Tool Name Agent 提取功能

## 🎯 问题分析

从用户提供的控制台日志中发现：

### 1. **没有 `social_content` 事件**
日志中只有：
- `tool_called` 事件（工具调用）
- `log` 事件（日志信息）

### 2. **Agent 识别错误**
所有事件都被错误识别为 `social` agent，因为：
- `extractAgentType` 只检查 `event.type`
- 没有检查 `event.tool_name` 字段

### 示例日志：
```javascript
tool_called {
  type: 'tool_called',
  tool_name: 'social_agent',  // ← 应该从这里提取 agent 类型
  call_id: 'call_...',
  arguments: '{...}'
}
```

## ✅ 解决方案

### 1. **增强 `extractAgentType` 函数**

现在函数接受两个参数，并优先从 `tool_name` 提取：

```typescript
const extractAgentType = (eventType: string, toolName?: string): string => {
  // 优先从 tool_name 中提取 agent 类型
  if (toolName) {
    if (toolName.includes('social')) return 'social'
    if (toolName.includes('news')) return 'news'
    if (toolName.includes('tech')) return 'tech'
    if (toolName.includes('whale')) return 'whales'  // 注意: whale_agent
  }
  
  // 从事件类型中提取 agent 类型
  if (eventType.includes('social')) return 'social'
  if (eventType.includes('news')) return 'news'
  if (eventType.includes('tech')) return 'tech'
  if (eventType.includes('whales') || eventType.includes('whale')) return 'whales'
  
  return 'social'  // 默认值
}
```

### 支持的 tool_name 格式：
- `social_agent` → `social`
- `news_agents` → `news`
- `tech_agent` → `tech`
- `whale_agent` → `whales`

### 2. **更新所有事件处理器**

#### A. 传入 `tool_name` 参数
```javascript
const agentType = extractAgentType(event.type, event.tool_name) || event.agent_type || 'social'
console.log('🎯 Extracted Agent Type:', agentType, 'from event:', event.type, 'tool_name:', event.tool_name)
```

#### B. 改进 `tool_called` 事件处理
```typescript
case 'tool_called':
  const newToolCall = {
    id: event.call_id || event.tool_call_id || Date.now().toString(),
    tool_name: event.tool_name || 'unknown',
    tool_input: event.arguments || event.tool_input,  // ← 支持 arguments 字段
    timestamp: new Date().toISOString(),
  }
  
  // 新增调试日志
  console.log('🔧 Tool Called:', {
    agentType,
    toolName: newToolCall.tool_name,
    callId: newToolCall.id
  })
  
  // 自动更新 agent 状态
  setAgentsData(prev => prev.map(agent => {
    if (agent.type === agentType || agent.id === agentType) {
      const isFirstTool = agent.toolCalls.length === 0
      return {
        ...agent,
        toolCalls: [...agent.toolCalls, newToolCall],
        status: isFirstTool ? 'thinking' : agent.status,
        message: isFirstTool ? `Calling ${newToolCall.tool_name}...` : agent.message
      }
    }
    return agent
  }))
  
  // 自动切换到正在执行的 agent
  if (targetAgent.toolCalls.length === 0) {
    setSelectedAgentId(agentType)
  }
  break
```

#### C. 改进 `log` 事件处理
```typescript
case 'log':
  console.log('📝 Log:', {
    agentType,
    level: newLog.level,
    toolName: event.tool_name,
    messagePreview: newLog.message.substring(0, 50)
  })
  
  setAgentsData(prev => prev.map(agent => {
    if (agent.type === agentType || agent.id === agentType) {
      return { ...agent, logs: [...agent.logs, newLog] }
    }
    return agent
  }))
  break
```

#### D. 智能 `default` 处理器
```typescript
default:
  // 如果事件包含 message/content，尝试作为 thinking content
  const hasContent = event.message || event.content || event.data || event.text
  if (hasContent) {
    const contentText = event.message || event.content || event.data || event.text || ''
    console.log('🔄 Unhandled event with content, treating as thinking:', {
      type: event.type,
      agentType,
      toolName: event.tool_name,
      hasMessage: !!event.message,
      hasContent: !!event.content,
      contentLength: contentText.length,
      rawEvent: event
    })
    
    if (contentText) {
      setAgentsData(prev => prev.map(agent => {
        if (agent.type === agentType || agent.id === agentType) {
          const newContent = agent.thinkingContent + contentText
          return { ...agent, thinkingContent: newContent }
        }
        return agent
      }))
    }
  }
  break
```

## 🔍 新的调试日志

### 1. Agent 提取日志
```
🎯 Extracted Agent Type: social from event: tool_called tool_name: social_agent
```

### 2. Tool 调用日志
```
🔧 Tool Called: {
  agentType: "social",
  toolName: "social_agent",
  callId: "call_cUH6B8Hnasw0P8qjHhzRxBtO"
}
```

### 3. Log 事件日志
```
📝 Log: {
  agentType: "tech",
  level: "info",
  toolName: "fetch_current_orderbook",
  messagePreview: "{'market': '0x6903b766f5fda3d5b02f4472a6b4154419e7..."
}
```

### 4. 未处理事件的智能处理
```
🔄 Unhandled event with content, treating as thinking: {
  type: "social_content",
  agentType: "social",
  toolName: "social_content",
  hasMessage: true,
  hasContent: false,
  contentLength: 123,
  rawEvent: {...}
}

✅ Updated social thinkingContent from unhandled event: {
  eventType: "social_content",
  addedLength: 123,
  newTotalLength: 123
}
```

## 📊 预期日志输出（基于你的实际数据）

刷新页面并触发分析后，你应该看到：

```javascript
🚀 Starting Analysis with params: {event_id: '35090'}

📥 SSE Event: tool_called {type: 'tool_called', tool_name: 'social_agent', ...}
🎯 Extracted Agent Type: social from event: tool_called tool_name: social_agent
🔧 Tool Called: {
  agentType: "social",
  toolName: "social_agent",
  callId: "call_cUH6B8Hnasw0P8qjHhzRxBtO"
}

📥 SSE Event: tool_called {type: 'tool_called', tool_name: 'news_agents', ...}
🎯 Extracted Agent Type: news from event: tool_called tool_name: news_agents
🔧 Tool Called: {
  agentType: "news",
  toolName: "news_agents",
  callId: "call_tdQRMFGcWK8gMvZQieWyuY27"
}

📥 SSE Event: tool_called {type: 'tool_called', tool_name: 'tech_agent', ...}
🎯 Extracted Agent Type: tech from event: tool_called tool_name: tech_agent
🔧 Tool Called: {
  agentType: "tech",
  toolName: "tech_agent",
  callId: "call_G3fvXifUBEjr4aEg0UUZpQvO"
}

📥 SSE Event: tool_called {type: 'tool_called', tool_name: 'whale_agent', ...}
🎯 Extracted Agent Type: whales from event: tool_called tool_name: whale_agent
🔧 Tool Called: {
  agentType: "whales",
  toolName: "whale_agent",
  callId: "call_bJZiNNp9uMbRTpXdvwmHNuze"
}

📥 SSE Event: log {type: 'log', tool_name: 'fetch_current_orderbook', ...}
🎯 Extracted Agent Type: tech from event: log tool_name: fetch_current_orderbook
📝 Log: {
  agentType: "tech",
  level: "info",
  toolName: "fetch_current_orderbook",
  messagePreview: "{'market': '0x6903b766f5fda3d5b02f4472a6b4154419e7..."
}
```

## 🎨 UI 变化

### 左侧 Agent 卡片
现在会根据 `tool_name` 正确更新：

1. **Social Agent**
   - 状态: 🟣 THINKING
   - Message: "Calling social_agent..."
   - Tool Calls: 1

2. **News Agent**
   - 状态: 🟣 THINKING
   - Message: "Calling news_agents..."
   - Tool Calls: 1

3. **Tech Agent**
   - 状态: 🟣 THINKING
   - Message: "Calling tech_agent..."
   - Tool Calls: 1
   - Logs: 8（来自 fetch_current_orderbook 和 fetch_price_history）

4. **Whales Agent**
   - 状态: 🟣 THINKING
   - Message: "Calling whale_agent..."
   - Tool Calls: 1

### 调试面板
会显示当前选中 agent 的详细数据。

## ⚠️ 关于 `social_content` 事件

从你的日志中**没有看到 `social_content` 类型的事件**。

### 可能的情况：

1. **后端尚未发送 `content` 事件**
   - 当前只发送了 `tool_called` 和 `log` 事件
   - `content` 事件可能在工具执行完成后发送

2. **事件类型不同**
   - 可能是 `tool_output` 或其他类型
   - 可能在 `message` 字段中

3. **智能处理器会捕获它**
   - 即使事件类型不匹配
   - 只要包含 `message`/`content` 字段
   - 就会自动作为 thinking content 处理

## 🔍 下一步调试

### 1. 刷新页面
确保加载最新代码

### 2. 触发分析
点击事件卡片

### 3. 观察日志
查找：
- ✅ `🎯 Extracted Agent Type` - 应该显示正确的 agent（social/news/tech/whales）
- ✅ `🔧 Tool Called` - 应该显示每个 agent 的工具调用
- ✅ `📝 Log` - 应该显示正确的 agentType

### 4. 查看 UI
- ✅ 左侧 agent 卡片应该分别显示各自的状态
- ✅ 点击不同的 agent 应该看到各自的 Tool Calls 和 Logs
- ✅ 调试面板应该显示每个 agent 的数据统计

### 5. 寻找 `social_content`
如果后端发送了 `social_content` 事件，你会看到：
```
📥 SSE Event: social_content {...}
或
🔄 Unhandled event with content, treating as thinking: {type: "social_content", ...}
✅ Updated social thinkingContent from unhandled event: {...}
```

## 📝 总结

### 核心改进
1. ✅ 从 `tool_name` 字段提取 agent 类型
2. ✅ 支持 `social_agent`、`news_agents`、`tech_agent`、`whale_agent`
3. ✅ 改进 `tool_called` 事件处理，自动更新 agent 状态
4. ✅ 改进 `log` 事件处理，正确分配到对应 agent
5. ✅ 添加智能 `default` 处理器，自动捕获包含 content 的未知事件
6. ✅ 增强调试日志，显示 agent 提取过程

### 待观察
- 🔍 `social_content` 事件是否会在后续出现
- 🔍 各个 agent 的 thinking content 是否会被正确显示

---

**请刷新页面测试，并告诉我新的日志输出！** 🚀

