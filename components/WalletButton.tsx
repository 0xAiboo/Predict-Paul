'use client';

import { useWalletAuth } from '@/hooks/useWalletAuth';
import { useState } from 'react';

export default function WalletButton() {
  const [showMenu, setShowMenu] = useState(false);
  const {
    isLoading,
    error,
    isAuthenticated,
    userInfo,
    loginWithEthereum,
    loginWithSolana,
    logout,
  } = useWalletAuth();

  const handleEthereumLogin = async () => {
    try {
      await loginWithEthereum();
      setShowMenu(false);
    } catch (err) {
      console.error('以太坊登录失败:', err);
    }
  };

  const handleSolanaLogin = async () => {
    try {
      await loginWithSolana();
      setShowMenu(false);
    } catch (err) {
      console.error('Solana 登录失败:', err);
    }
  };

  const handleLogout = () => {
    logout();
    setShowMenu(false);
  };

  // 已登录状态
  if (isAuthenticated && userInfo.address) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 
                   hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all"
        >
          <span className="text-lg">
            {userInfo.chain === 'ethereum' ? '🦊' : '👻'}
          </span>
          <span className="font-mono text-sm">
            {userInfo.address.slice(0, 6)}...{userInfo.address.slice(-4)}
          </span>
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-64 bg-[#1A1A2E] border border-gray-700 
                          rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">
                    {userInfo.chain === 'ethereum' ? '🦊' : '👻'}
                  </span>
                  <span className="text-sm font-semibold">
                    {userInfo.chain === 'ethereum' ? '以太坊' : 'Solana'}
                  </span>
                </div>
                <div className="text-xs text-gray-400 break-all">
                  {userInfo.address}
                </div>
                {userInfo.userId && (
                  <div className="text-xs text-gray-500 mt-1">
                    ID: {userInfo.userId.slice(0, 12)}...
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                断开连接
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // 未登录状态
  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isLoading}
        className="px-4 py-2 bg-white text-purple-600 hover:bg-gray-100 
                 disabled:bg-gray-300 disabled:cursor-not-allowed
                 font-semibold rounded-lg transition-all"
      >
        {isLoading ? '连接中...' : '连接钱包'}
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-72 bg-[#1A1A2E] border border-gray-700 
                        rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-bold mb-1">连接钱包</h3>
              <p className="text-xs text-gray-400">
                选择你的钱包进行登录
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border-b border-red-500/30">
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}

            <div className="p-2">
              <button
                onClick={handleEthereumLogin}
                disabled={isLoading}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="text-2xl">🦊</span>
                <div className="text-left">
                  <div className="font-semibold text-sm">MetaMask</div>
                  <div className="text-xs text-gray-400">以太坊钱包</div>
                </div>
              </button>

              <button
                onClick={handleSolanaLogin}
                disabled={isLoading}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="text-2xl">👻</span>
                <div className="text-left">
                  <div className="font-semibold text-sm">Phantom</div>
                  <div className="text-xs text-gray-400">Solana 钱包</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

