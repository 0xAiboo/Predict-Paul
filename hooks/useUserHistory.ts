import { useState, useEffect, useCallback } from 'react';
import { historyService, authService } from '@/lib/api-services';
import type { UserSession } from '@/types';

interface UseUserHistoryResult {
  sessions: UserSession[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 用户会话历史 Hook
 * 获取当前登录用户的会话历史记录
 */
export function useUserHistory(): UseUserHistoryResult {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 检查用户是否已登录
      const { userId } = authService.getUserInfo();
      if (!userId) {
        setError('请先登录');
        setSessions([]);
        return;
      }

      // 获取用户历史记录
      const response = await historyService.getUserHistory(userId);

      if (response.status === 'ok' && response.code === 0) {
        // 按创建时间降序排序（最新的在前）
        const sortedSessions = [...response.data].sort(
          (a, b) => b.create_time - a.create_time
        );
        setSessions(sortedSessions);
      } else {
        setError('获取历史记录失败');
        setSessions([]);
      }
    } catch (err: any) {
      console.error('获取用户历史记录失败:', err);
      setError(err.message || '获取历史记录失败');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserHistory();
  }, [fetchUserHistory]);

  return {
    sessions,
    loading,
    error,
    refetch: fetchUserHistory,
  };
}

