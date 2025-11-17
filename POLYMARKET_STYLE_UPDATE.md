# Polymarket 风格首页更新

## 概述

将 NewsStream 页面升级为类似 Polymarket 首页的展示风格，包含丰富的事件卡片、多种过滤和排序选项、以及更好的视觉效果。

## 主要更新

### 1. 新组件：EventCard.tsx

创建了全新的事件卡片组件，支持以下特性：

#### 视觉特性
- **大图展示**：每个事件卡片顶部显示高质量图片
- **渐变遮罩**：图片上方有渐变效果，使标签和时间更易读
- **悬停效果**：鼠标悬停时有边框颜色变化和轻微缩放动画
- **响应式设计**：适配不同屏幕尺寸

#### 标签系统
- ⭐ **Featured**：黄色标签，突出显示精选事件
- ✨ **New**：紫色标签，显示新上架的事件
- 🔥 **Hot**：橙色/红色标签，基于24小时交易量自动显示热度
  - FIRE：交易量 > $1M
  - HOT：交易量 > $100K

#### 市场选项展示
- 显示前3个子市场及其概率
- 概率条形图可视化
- 颜色编码：
  - 绿色：概率 ≥ 70%
  - 黄色：概率 40-70%
  - 红色：概率 < 40%
- 显示剩余选项数量

#### 统计信息
- **24小时交易量**：绿色高亮
- **流动性**：蓝色高亮
- **评论数**：带图标显示
- **竞争度**：渐变进度条显示市场竞争程度

#### 时间信息
- 动态倒计时显示（月/天/小时）
- CLOSED 状态标签
- 自动格式化结束时间

#### 操作按钮
- **Trade**：紫色主按钮，用于交易
- **Analysis**：次要按钮，用于查看AI分析

### 2. 更新：NewsStream.tsx

升级了主页面组件，包含以下功能：

#### 过滤系统
- **All**：显示所有事件
- **Featured**：仅显示精选事件
- **New**：仅显示新事件
- **Hot**：仅显示高交易量事件（24h > $100K）

#### 排序系统
- **Volume**：按24小时交易量排序（默认）
- **Liquidity**：按流动性排序
- **Ending Soon**：按结束时间排序，最快结束的在前

#### 网格布局
- 响应式网格：
  - 移动端：1列
  - 平板：2列
  - 桌面：3列
  - 大屏：4列

#### 状态管理
- 加载状态：显示骨架屏
- 空状态：提示调整过滤器
- 错误状态：显示错误信息和重试按钮
- 统计信息：显示已过滤/总事件数

### 3. 新组件：EventCardSkeleton.tsx

专门为 EventCard 设计的加载骨架屏：
- 模拟真实卡片结构
- 动画脉冲效果
- 包含所有主要元素的占位符：
  - 图片区域
  - 标题和描述
  - 市场选项（3个）
  - 统计信息
  - 竞争度条
  - 操作按钮

### 4. 类型更新：types/index.ts

扩展了事件和市场的类型定义：

#### SubMarket 接口
```typescript
interface SubMarket {
  id: string
  question: string
  groupItemTitle: string
  outcomePrices: string  // JSON 价格数组
  volume24hr?: number
  // ... 更多字段
}
```

#### Event 接口（新增字段）
```typescript
interface Event {
  // 基础字段
  id, title, description, image, icon
  
  // 状态字段
  active, closed, archived, new, featured
  
  // 交易数据
  volume, volume24hr, liquidity
  volume1wk, volume1mo, volume1yr
  
  // 市场信息
  competitive, commentCount
  markets: SubMarket[]
  
  // ... 更多字段
}
```

## 数据流

### API 响应格式

从 `/api/events` 接口获取的数据包含：

```json
{
  "status": "ok",
  "data": [
    {
      "id": "35754",
      "title": "Top Spotify Artist 2025",
      "image": "https://...",
      "volume24hr": 7477934.826668005,
      "liquidity": 1853426.48847,
      "commentCount": 307,
      "competitive": 0.8234729312095417,
      "featured": false,
      "new": false,
      "active": true,
      "closed": false,
      "endDate": "2025-12-31T00:00:00Z",
      "markets": [
        {
          "id": "572178",
          "groupItemTitle": "Ariana Grande",
          "outcomePrices": "[\"0.0015\", \"0.9985\"]",
          "volume24hr": 107399.617701
        }
        // ... 更多市场
      ]
    }
    // ... 更多事件
  ]
}
```

## 视觉设计

### 颜色方案
- **背景**：深色主题 `#0F0F23` / `#1A1A2E`
- **边框**：`#374151` (gray-800)
- **主色调**：紫色 `#9333EA` (purple-600)
- **强调色**：
  - 黄色（Featured）
  - 绿色（高概率/交易量）
  - 红色（低概率/警告）
  - 蓝色（流动性）

### 动画效果
- 悬停缩放：`scale-[1.02]`
- 边框渐变：`border-purple-500`
- 阴影效果：`shadow-lg shadow-purple-500/20`
- 图片缩放：`group-hover:scale-110`
- 骨架屏脉冲：`animate-pulse`

## 用户交互

### 点击事件
1. **卡片点击**：可扩展为导航到详情页
2. **Trade 按钮**：跳转到交易界面
3. **Analysis 按钮**：打开 AI 分析面板
4. **过滤按钮**：切换显示的事件类型
5. **排序按钮**：改变事件排序方式
6. **刷新按钮**：重新获取最新数据

### 状态反馈
- 加载中显示骨架屏
- 刷新时图标旋转
- 按钮悬停效果
- 禁用状态视觉反馈

## 性能优化

1. **按需渲染**：仅渲染前3个市场选项
2. **懒加载**：图片使用原生 lazy loading
3. **条件渲染**：根据数据可用性显示组件
4. **记忆化**：使用 React hooks 管理状态

## 响应式适配

### 断点
- **移动端**：< 768px - 1列
- **平板**：768px - 1024px - 2列
- **桌面**：1024px - 1280px - 3列
- **大屏**：≥ 1280px - 4列

### 适配策略
- 过滤栏自动换行
- 卡片宽度自适应
- 图片保持纵横比
- 文字截断防止溢出

## 下一步改进建议

1. **详情页面**：点击卡片跳转到事件详情
2. **实时更新**：WebSocket 或 SSE 实时推送价格变化
3. **个性化**：用户收藏和关注功能
4. **搜索功能**：全文搜索事件
5. **分页加载**：虚拟滚动或无限滚动
6. **图表集成**：嵌入迷你价格图表
7. **通知系统**：价格变动提醒
8. **社交功能**：显示朋友的预测

## 文件清单

### 新增文件
- `components/EventCard.tsx` - 主要事件卡片组件
- `components/EventCardSkeleton.tsx` - 加载骨架屏组件
- `POLYMARKET_STYLE_UPDATE.md` - 本文档

### 修改文件
- `components/NewsStream.tsx` - 主页面组件
- `types/index.ts` - 类型定义

### 未修改但相关的文件
- `hooks/useEvents.ts` - 事件数据获取 Hook
- `lib/api-services.ts` - API 服务
- `components/Header.tsx` - 页面头部
- `components/ErrorMessage.tsx` - 错误提示

## 测试建议

1. **功能测试**
   - 测试所有过滤器组合
   - 测试所有排序选项
   - 测试按钮点击事件
   - 测试加载和错误状态

2. **视觉测试**
   - 检查不同屏幕尺寸
   - 验证悬停效果
   - 确认颜色对比度
   - 测试图片加载失败情况

3. **性能测试**
   - 大数据集渲染性能
   - 过滤和排序响应速度
   - 内存使用情况
   - 动画流畅度

4. **可访问性测试**
   - 键盘导航
   - 屏幕阅读器支持
   - 颜色对比度
   - 焦点管理

## 技术栈

- **React 18+**
- **TypeScript**
- **Tailwind CSS**
- **Lucide Icons**
- **Next.js**（如果使用）

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 总结

这次更新将简单的列表展示升级为类似 Polymarket 首页的丰富卡片展示，提供了：
- 更好的视觉呈现
- 更丰富的信息展示
- 更强的交互功能
- 更好的用户体验

所有改动都保持了代码的可维护性和扩展性，为后续功能添加打下了良好基础。

