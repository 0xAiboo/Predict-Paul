# Whale Agent 持有者数据支持

## 概述

为 `whale_agent` 添加了完整的持有者数据（Top Holders）支持，包括数据结构定义、SSE 事件处理和可视化组件。

## 更新日期
2025-11-17

## 更新内容

### 1. 新增数据结构

在 `ThinkingProcess.tsx` 中定义了以下接口：

```typescript
// 持有者数据结构（Whales Agent）
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
```

### 2. AgentData 接口扩展

在 `AgentData` 接口中添加了 `topHolders` 字段：

```typescript
interface AgentData {
  // ... 其他字段 ...
  // 持有者数据（主要用于 whales agent）
  topHolders: TopHoldersData[];
}
```

### 3. extractAgentType 函数更新

添加了对 `fetch_top_holders` 工具的识别，自动将其归类到 `whales` agent：

```typescript
// 🐋 持有者数据工具映射到 whales agent
if (
  toolName.includes("fetch_top_holders") ||
  toolName.includes("holders") ||
  toolName.includes("whale")
) {
  return "whales";
}
```

### 4. SSE 事件处理

在 `handleSSEMessage` 函数中添加了对 `fetch_top_holders` 事件的处理：

```typescript
// 🐋 检查是否是持有者数据
else if (event.tool_name === "fetch_top_holders") {
  try {
    // 解析持有者数据（可能是数组格式）
    const message = event.message;
    let holdersDataArray: TopHoldersData[] = [];

    if (Array.isArray(message)) {
      // 如果直接是数组
      holdersDataArray = message;
    } else if (typeof message === 'string') {
      // 如果是字符串，尝试解析
      const jsonStr = message.replace(/'/g, '"')
        .replace(/True/g, 'true')
        .replace(/False/g, 'false');
      const parsed = JSON.parse(jsonStr);
      holdersDataArray = Array.isArray(parsed) ? parsed : [parsed];
    }

    console.log("🐋 收到持有者数据:", {
      agentType,
      tokensCount: holdersDataArray.length,
      totalHolders: holdersDataArray.reduce((sum, token) => sum + (token.holders?.length || 0), 0)
    });

    setAgentsData((prev) =>
      prev.map((agent) => {
        if (agent.type === agentType || agent.id === agentType) {
          return {
            ...agent,
            topHolders: [...agent.topHolders, ...holdersDataArray]
          };
        }
        return agent;
      })
    );
  } catch (e) {
    console.error("⚠️ 解析持有者数据失败:", e, event.message);
  }
}
```

### 5. 新增 TopHoldersTable 组件

创建了新的 `TopHoldersTable.tsx` 组件，提供了专业的持有者数据可视化：

#### 主要特性：

1. **统计信息面板**
   - 持有人数
   - 总持有量
   - 平均持有量
   - 认证用户数量
   - 最大持仓量

2. **持有者列表**
   - 排名展示（前3名特殊标记）
   - 持有人信息（名称、头像、认证状态）
   - 钱包地址（可点击跳转到 Polygonscan）
   - 持有量和占比
   - 可视化进度条
   - 结果标记（YES/NO）

3. **数据格式化**
   - 智能数量格式化（K/M 单位）
   - 钱包地址缩短显示
   - 百分比计算和展示

4. **UI/UX 优化**
   - Binance 风格的深色主题
   - 悬停效果和过渡动画
   - 响应式网格布局
   - 渐变色进度条

### 6. 组件集成

在 `ThinkingProcess.tsx` 中集成了 `TopHoldersTable` 组件：

```typescript
import TopHoldersTable from "./TopHoldersTable";

// ... 在渲染部分 ...

{/* 持有者数据（Whales Agent） */}
{displayData.topHolders && displayData.topHolders.length > 0 && (
  <div className="space-y-4">
    {displayData.topHolders.map((topHoldersData, idx) => (
      <TopHoldersTable key={idx} topHoldersData={topHoldersData} index={idx} />
    ))}
  </div>
)}
```

## 数据示例

后端发送的 SSE 事件格式：

```json
{
  "type": "log",
  "message": [
    {
      "token": "32529863558788470022431759869254132455003412332939346616344514335248802832428",
      "holders": [
        {
          "proxyWallet": "0xa5ef39c3d3e10d0b270233af41cac69796b12966",
          "bio": "",
          "asset": "32529863558788470022431759869254132455003412332939346616344514335248802832428",
          "pseudonym": "",
          "amount": 824398.001387,
          "displayUsernamePublic": false,
          "outcomeIndex": 1,
          "name": "",
          "profileImage": "",
          "profileImageOptimized": "",
          "verified": false
        }
      ]
    }
  ],
  "tool_name": "fetch_top_holders"
}
```

## 文件修改清单

### 新增文件
- `components/TopHoldersTable.tsx` - 持有者数据表格组件

### 修改文件
- `components/ThinkingProcess.tsx`
  - 添加 `HolderData` 和 `TopHoldersData` 接口
  - 扩展 `AgentData` 接口
  - 更新 `extractAgentType` 函数
  - 添加 `fetch_top_holders` 事件处理逻辑
  - 集成 `TopHoldersTable` 组件
  - 更新 `displayData` 对象

## 样式设计

TopHoldersTable 组件采用了与 OrderbookTable 和 PriceHistoryChart 一致的设计语言：

- **背景色**: `#1A1A2E` (主容器), `#0D0D1A` (统计卡片)
- **边框**: 灰色 `border-gray-800`
- **文字**: 白色标题，灰色说明文字
- **强调色**: 
  - 蓝色 (`text-blue-400`) - 持有人数、认证标记
  - 紫色 (`text-purple-400`) - 总持有量、进度条
  - 青色 (`text-cyan-400`) - 平均持有、钱包地址
  - 绿色 (`text-green-400`) - 认证用户、YES 结果
  - 黄色 (`text-yellow-400`) - 最大持仓、第一名
  - 红色 (`text-red-400`) - NO 结果

## 使用说明

1. 当后端发送 `fetch_top_holders` 事件时，数据会自动解析并存储到对应的 `whales` agent
2. 在 UI 中切换到 `whales` agent 标签时，会自动显示持有者数据
3. 支持显示多个 token 的持有者数据（多个 `TopHoldersTable` 组件）
4. 每个持有者的钱包地址可点击查看详情

## 技术要点

1. **数据解析**: 支持数组和字符串格式的数据，自动处理 Python 风格的布尔值
2. **错误处理**: 包含 try-catch 块和详细的错误日志
3. **类型安全**: 使用 TypeScript 接口确保类型正确
4. **性能优化**: 使用 `useMemo` 缓存统计计算结果
5. **可扩展性**: 组件设计支持自定义样式和额外功能

## 未来改进

可考虑的功能增强：
- 持有者排序和筛选
- 持有量变化趋势图表
- 持有者之间的关系网络图
- 导出持有者数据功能
- 实时持仓更新

