import type { ApiResponse, PaginatedResponse } from '@/types'

// API 错误类
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// 请求配置接口
interface RequestConfig extends RequestInit {
  params?: Record<string, any>
}

// 构建 URL 查询参数
function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  })
  return searchParams.toString()
}

// 通用请求函数
async function request<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { params, headers, ...restConfig } = config

  // 构建完整 URL
  let url = `${endpoint}`
  if (params) {
    const queryString = buildQueryString(params)
    if (queryString) {
      url += `?${queryString}`
    }
  }

  try {
    const response = await fetch(url, {
      ...restConfig,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    })

    // 处理非 2xx 响应
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        response.status,
        errorData.message || `请求失败: ${response.statusText}`,
        errorData
      )
    }

    // 解析响应
    const data = await response.json()
    return data
  } catch (error) {
    // 网络错误或其他错误
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(0, '网络请求失败，请检查连接', error)
  }
}

// GET 请求
export async function get<T>(
  endpoint: string,
  params?: Record<string, any>
): Promise<T> {
  return request<T>(endpoint, { method: 'GET', params })
}

// POST 请求
export async function post<T>(
  endpoint: string,
  data?: any,
  params?: Record<string, any>
): Promise<T> {
  return request<T>(endpoint, {
    method: 'POST',
    params,
    body: data ? JSON.stringify(data) : undefined,
  })
}

// PUT 请求
export async function put<T>(
  endpoint: string,
  data?: any,
  params?: Record<string, any>
): Promise<T> {
  return request<T>(endpoint, {
    method: 'PUT',
    params,
    body: data ? JSON.stringify(data) : undefined,
  })
}

// DELETE 请求
export async function del<T>(
  endpoint: string,
  params?: Record<string, any>
): Promise<T> {
  return request<T>(endpoint, { method: 'DELETE', params })
}

// 导出默认对象
export const api = {
  get,
  post,
  put,
  delete: del,
}

export default api

