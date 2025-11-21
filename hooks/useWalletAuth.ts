import { useState, useCallback } from 'react';
import { authService } from '@/lib/api-services';
import {
  generateLoginMessage,
  signMessageEthereum,
  signMessageSolana,
  getEthereumAddress,
  getSolanaAddress,
} from '@/lib/wallet-utils';
import type { WalletLoginRequest } from '@/types';

export type ChainType = 'ethereum' | 'solana';

export interface UseWalletAuthReturn {
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  userInfo: {
    userId: string | null;
    address: string | null;
    chain: string | null;
  };
  loginWithEthereum: () => Promise<void>;
  loginWithSolana: () => Promise<void>;
  logout: () => void;
}

/**
 * 钱包认证 Hook
 * 提供以太坊和 Solana 钱包登录功能
 */
export function useWalletAuth(): UseWalletAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(
    authService.isAuthenticated()
  );
  const [userInfo, setUserInfo] = useState(authService.getUserInfo());

  /**
   * 通用登录函数
   */
  const login = useCallback(
    async (
      chain: ChainType,
      getAddress: () => Promise<string>,
      signMessage: (message: string, address?: string) => Promise<string>
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        // 1. 获取钱包地址
        const address = await getAddress();

        // 2. 生成登录消息
        const message = generateLoginMessage();

        // 3. 签名消息
        const signature = await signMessage(message, address);

        // 4. 构建登录请求
        const loginData: WalletLoginRequest = {
          address,
          signature,
          message,
          chain,
        };

        // 5. 发送登录请求
        const response = await authService.login(loginData);

        // 6. 检查响应
        if (response.code !== 200) {
          throw new Error(response.message || '登录失败');
        }

        // 7. 保存认证信息
        const { access_token, id, chain: userChain } = response.data;
        authService.saveToken(access_token);
        authService.saveUserInfo(id, address, userChain);

        // 8. 更新状态
        setIsAuthenticated(true);
        setUserInfo({
          userId: id,
          address,
          chain: userChain,
        });

        console.log('✅ 登录成功:', {
          userId: id,
          address,
          chain: userChain,
        });
      } catch (err: any) {
        console.error('❌ 登录失败:', err);
        setError(err.message || '登录失败，请重试');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * 以太坊钱包登录
   */
  const loginWithEthereum = useCallback(async () => {
    await login('ethereum', getEthereumAddress, signMessageEthereum);
  }, [login]);

  /**
   * Solana 钱包登录
   */
  const loginWithSolana = useCallback(async () => {
    await login(
      'solana',
      getSolanaAddress,
      async (message: string) => signMessageSolana(message)
    );
  }, [login]);

  /**
   * 退出登录
   */
  const logout = useCallback(() => {
    authService.clearToken();
    setIsAuthenticated(false);
    setUserInfo({
      userId: null,
      address: null,
      chain: null,
    });
    console.log('👋 已退出登录');
  }, []);

  return {
    isLoading,
    error,
    isAuthenticated,
    userInfo,
    loginWithEthereum,
    loginWithSolana,
    logout,
  };
}

