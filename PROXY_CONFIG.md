# 反向代理配置说明

## 概述

本项目配置了反向代理，将前端的 `/api` 请求转发到后端服务器，避免 CORS 跨域问题。

## 架构

```
前端请求: /api/event
    ↓
反向代理（Next.js rewrites）
    ↓
后端服务器: http://51.79.173.45:8000/event
```

## 配置文件

### 1. next.config.js（开发环境）

用于本地开发环境（`npm run dev`）：

```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://51.79.173.45:8000/:path*',
    },
  ]
}
```

**工作原理：**
- 当你访问 `http://localhost:3000/api/event` 时
- Next.js 会自动将请求转发到 `http://51.79.173.45:8000/event`
- 响应会原样返回给前端

### 2. vercel.json（生产环境）

用于 Vercel 部署环境：

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "http://51.79.173.45:8000/:path*"
    }
  ],
  "headers": [
    {
      "source": "/api/:path*",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
```

**功能：**
- `rewrites`: 路由重写规则
- `headers`: CORS 头配置（允许跨域请求）

### 3. lib/api-config.ts

API 端点配置文件：

```typescript
export const API_ENDPOINTS = {
  events: '/api/event',        // ✅ 使用相对路径
  markets: '/api/markets',     // ✅ 通过反向代理
  analyze: '/api/analyze',     // ✅ 自动转发
}
```

**注意：**
- ✅ 使用 `/api/...` 相对路径
- ❌ 不要使用 `http://51.79.173.45:8000/...` 完整 URL
- ✅ 让反向代理自动处理

## 使用方法

### 开发环境

1. **启动开发服务器：**
```bash
npm run dev
```

2. **访问 API：**
```javascript
// 在代码中使用相对路径
fetch('/api/event')
  .then(res => res.json())
  .then(data => console.log(data))
```

3. **调试：**
- 打开浏览器开发者工具 → Network
- 看到的请求是 `localhost:3000/api/event`
- 实际转发到 `51.79.173.45:8000/event`

### 生产环境（Vercel）

1. **部署：**
```bash
vercel deploy
```

2. **访问：**
```
https://your-app.vercel.app/api/event
```

3. **自动转发到：**
```
http://51.79.173.45:8000/event
```

## API 端点列表

| 前端路径 | 后端实际路径 | 说明 |
|---------|------------|------|
| `/api/event` | `http://51.79.173.45:8000/event` | 获取事件列表 |
| `/api/markets` | `http://51.79.173.45:8000/markets` | 获取市场数据 |
| `/api/analyze` | `http://51.79.173.45:8000/analyze` | 开始分析（SSE） |
| `/api/history` | `http://51.79.173.45:8000/history` | 历史记录 |

## 优势

### 1. 避免 CORS 问题
- 前端和 API 在同一域名下
- 无需后端配置 CORS

### 2. 安全性
- API 服务器地址对用户隐藏
- 可以在代理层添加认证

### 3. 灵活性
- 可以轻松切换后端服务器
- 只需修改配置文件，不需要改代码

### 4. 性能
- 可以添加缓存层
- 可以实现请求合并

## 故障排查

### 问题 1：API 请求失败

**症状：**
```
GET http://localhost:3000/api/event 500
```

**排查：**
1. 检查后端服务是否运行：
```bash
curl http://51.79.173.45:8000/event
```

2. 检查 Next.js 是否正确运行：
```bash
npm run dev
```

3. 查看终端日志

### 问题 2：CORS 错误

**症状：**
```
Access to fetch at '...' has been blocked by CORS policy
```

**解决：**
1. 确认使用了相对路径 `/api/...`
2. 不要使用完整 URL `http://51.79.173.45:8000/...`
3. 重启开发服务器

### 问题 3：Vercel 部署后不工作

**排查：**
1. 检查 `vercel.json` 是否正确上传
2. 查看 Vercel 部署日志
3. 测试 API 端点：
```bash
curl https://your-app.vercel.app/api/event
```

### 问题 4：SSE 连接断开

**症状：**
EventSource 频繁断开重连

**解决：**
1. 确认后端支持 SSE
2. 检查超时设置
3. Vercel 免费版有 10 秒超时限制，考虑升级

## 高级配置

### 添加请求头

修改 `next.config.js`：

```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://51.79.173.45:8000/:path*',
      // 可以在这里添加其他配置
    },
  ]
}
```

### 添加认证

在 API 请求中添加 token：

```typescript
fetch('/api/event', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

### 多个后端服务

如果有多个后端服务：

```javascript
async rewrites() {
  return [
    {
      source: '/api/v1/:path*',
      destination: 'http://backend1.com/:path*',
    },
    {
      source: '/api/v2/:path*',
      destination: 'http://backend2.com/:path*',
    },
  ]
}
```

### 环境变量

创建 `.env.local`：

```bash
# 后端 API 地址
NEXT_PUBLIC_API_URL=http://51.79.173.45:8000
```

在 `next.config.js` 中使用：

```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
    },
  ]
}
```

## 测试

### 测试反向代理

1. **启动开发服务器：**
```bash
npm run dev
```

2. **测试 API：**
```bash
# 测试事件列表
curl http://localhost:3000/api/event

# 测试市场数据
curl http://localhost:3000/api/markets
```

3. **测试 SSE：**
```bash
curl -N http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
```

### 测试生产环境

```bash
# 部署到 Vercel
vercel deploy --prod

# 测试
curl https://your-app.vercel.app/api/event
```

## 性能优化

### 1. 启用缓存

在 `vercel.json` 中：

```json
{
  "headers": [
    {
      "source": "/api/event",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=60, stale-while-revalidate"
        }
      ]
    }
  ]
}
```

### 2. 压缩响应

Next.js 自动启用 gzip 压缩

### 3. 连接池

Next.js 自动管理 HTTP 连接

## 安全建议

1. **使用 HTTPS**
   - 生产环境使用 HTTPS
   - Vercel 自动提供 SSL 证书

2. **限制速率**
   - 在反向代理层添加速率限制
   - 防止 API 滥用

3. **认证**
   - 使用 JWT 或 API Key
   - 在请求头中传递

4. **日志记录**
   - 记录所有 API 请求
   - 用于审计和调试

## 相关文件

- `next.config.js` - Next.js 配置（开发环境）
- `vercel.json` - Vercel 配置（生产环境）
- `lib/api-config.ts` - API 端点配置
- `lib/api-services.ts` - API 服务封装
- `lib/api.ts` - API 请求工具

## 更新日志

### 2025-11-17
- ✅ 配置 Next.js rewrites
- ✅ 配置 Vercel rewrites
- ✅ 添加 CORS 头
- ✅ 更新 API 配置文件
- ✅ 添加图片域名白名单

## 参考资料

- [Next.js Rewrites](https://nextjs.org/docs/api-reference/next.config.js/rewrites)
- [Vercel Rewrites](https://vercel.com/docs/edge-network/rewrites)
- [CORS 配置](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

