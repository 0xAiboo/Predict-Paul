'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useSignMessage, useDisconnect } from 'wagmi'
import { useEffect, useState } from 'react'
import { authService } from '@/lib/api-services'
import { generateLoginMessage } from '@/lib/wallet-utils'
import { Wallet } from 'lucide-react'

interface WalletConnectButtonProps {
  onLoginSuccess?: () => void
}

export default function WalletConnectButton({ onLoginSuccess }: WalletConnectButtonProps) {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { disconnect } = useDisconnect()
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  // 自动登录逻辑
  useEffect(() => {
    const autoLogin = async () => {
      if (!isConnected || !address || isLoggingIn) return

      // 检查是否已登录
      const isAuthenticated = authService.isAuthenticated()
      const { address: savedAddress } = authService.getUserInfo()

      // 如果已登录且地址匹配，不需要重新登录
      if (isAuthenticated && savedAddress?.toLowerCase() === address.toLowerCase()) {
        return
      }

      // 如果地址不匹配，清除旧的登录信息
      if (isAuthenticated && savedAddress && savedAddress.toLowerCase() !== address.toLowerCase()) {
        authService.clearToken()
      }

      try {
        setIsLoggingIn(true)
        setLoginError(null)
        console.log('🔄 开始自动登录...', address)

        // 生成登录消息
        const message = generateLoginMessage()

        // 请求签名
        const signature = await signMessageAsync({ message })

        // 发送登录请求
        const response = await authService.login({
          address,
          signature,
          message,
          chain: 'ethereum',
        })

        if (response.code === 200) {
          // 保存认证信息
          authService.saveToken(response.data.access_token)
          authService.saveUserInfo(
            response.data.id,
            response.data.address,
            response.data.chain
          )

          console.log('✅ 自动登录成功:', response.data.id)
          onLoginSuccess?.()
        } else {
          setLoginError(response.message || '登录失败')
        }
      } catch (error: any) {
        console.error('❌ 自动登录失败:', error)
        setLoginError(error.message || '登录失败')
        // 如果用户拒绝签名，断开钱包连接
        if (error.message?.includes('User rejected') || error.code === 4001) {
          disconnect()
        }
      } finally {
        setIsLoggingIn(false)
      }
    }

    autoLogin()
  }, [isConnected, address, signMessageAsync, onLoginSuccess, disconnect, isLoggingIn])

  return (
    <div className="flex items-center gap-3">
      {/* 登录状态指示 */}
      {isLoggingIn && (
        <span className="text-sm text-blue-400 animate-pulse">登录中...</span>
      )}
      
      {/* 错误提示 */}
      {loginError && !isLoggingIn && (
        <span className="text-xs text-red-400">{loginError}</span>
      )}

      {/* RainbowKit 连接按钮 */}
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          authenticationStatus,
          mounted,
        }) => {
          const ready = mounted && authenticationStatus !== 'loading'
          const connected =
            ready &&
            account &&
            chain &&
            (!authenticationStatus || authenticationStatus === 'authenticated')

          return (
            <div
              {...(!ready && {
                'aria-hidden': true,
                style: {
                  opacity: 0,
                  pointerEvents: 'none',
                  userSelect: 'none',
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button
                      onClick={openConnectModal}
                      type="button"
                      disabled={isLoggingIn}
                      className="flex items-center gap-2 bg-white hover:bg-gray-100 
                               disabled:bg-gray-300 disabled:cursor-not-allowed
                               text-purple-600 px-6 py-2 rounded-lg font-semibold transition-all"
                    >
                      <Wallet className="w-5 h-5" />
                      <span>连接钱包</span>
                    </button>
                  )
                }

                if (chain.unsupported) {
                  return (
                    <button
                      onClick={openChainModal}
                      type="button"
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 
                               text-white px-6 py-2 rounded-lg font-semibold transition-all"
                    >
                      错误网络
                    </button>
                  )
                }

                return (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={openChainModal}
                      type="button"
                      className="flex items-center gap-2 bg-[#1A1A2E] hover:bg-[#252539] 
                               border border-gray-700 text-white px-3 py-2 rounded-lg transition-all"
                    >
                      {chain.hasIcon && (
                        <div
                          style={{
                            background: chain.iconBackground,
                            width: 20,
                            height: 20,
                            borderRadius: 999,
                            overflow: 'hidden',
                          }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? 'Chain icon'}
                              src={chain.iconUrl}
                              style={{ width: 20, height: 20 }}
                            />
                          )}
                        </div>
                      )}
                      <span className="text-sm">{chain.name}</span>
                    </button>

                    <button
                      onClick={openAccountModal}
                      type="button"
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 
                               hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg 
                               font-semibold transition-all"
                    >
                      <Wallet className="w-5 h-5" />
                      <span className="font-mono text-sm">
                        {account.displayName}
                      </span>
                    </button>
                  </div>
                )
              })()}
            </div>
          )
        }}
      </ConnectButton.Custom>
    </div>
  )
}

