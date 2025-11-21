'use client'

import { Search, Wallet } from 'lucide-react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useSignMessage } from 'wagmi'
import { useEffect, useState } from 'react'
import { authService } from '@/lib/api-services'
import { generateLoginMessage } from '@/lib/wallet-utils'

interface HeaderProps {
  title?: string
  showSearch?: boolean
  onLoginSuccess?: () => void
}

export default function Header({ title = 'News Stream', showSearch = true, onLoginSuccess }: HeaderProps) {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [needsReauth, setNeedsReauth] = useState(false)
  const [userRejected, setUserRejected] = useState(false) // 记录用户是否拒绝签名
  const [hasAttemptedLogin, setHasAttemptedLogin] = useState(false) // 记录是否已尝试登录
  const [wasConnected, setWasConnected] = useState(false) // 🆕 跟踪钱包是否曾经连接过

  // 🔍 调试：组件挂载时检查 localStorage
  useEffect(() => {
    console.group('📦 localStorage 初始状态')
    console.log('access_token:', localStorage.getItem('access_token') ? '存在 ✓' : '不存在 ✗')
    console.log('user_id:', localStorage.getItem('user_id'))
    console.log('wallet_address:', localStorage.getItem('wallet_address'))
    console.log('wallet_chain:', localStorage.getItem('wallet_chain'))
    console.groupEnd()
  }, [])

  // 监听 401 未授权事件
  useEffect(() => {
    const handleUnauthorized = () => {
      console.log('🔐 收到 401 事件，需要重新登录')
      setNeedsReauth(true)
      setUserRejected(false) // 重置拒绝状态，允许重新弹出签名
      onLoginSuccess?.() // 触发刷新，清空历史记录
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
    }
  }, [onLoginSuccess])

  // 监听钱包连接状态变化
  useEffect(() => {
    if (isConnected) {
      // 钱包已连接，标记为已连接过
      setWasConnected(true)
    } else if (wasConnected) {
      // ✅ 只有在「曾经连接过」且「现在断开」时，才清除 token
      // 这样刷新页面时不会清除 token（因为 wasConnected 初始值是 false）
      const wasAuthenticated = authService.isAuthenticated()
      if (wasAuthenticated) {
        console.log('👋 钱包已断开，清除登录状态')
        authService.clearToken()
        onLoginSuccess?.() // 触发刷新，清空历史记录
      }
      // 重置所有状态
      setNeedsReauth(false)
      setUserRejected(false)
      setHasAttemptedLogin(false)
      setWasConnected(false) // 重置连接状态
    }
  }, [isConnected, wasConnected, onLoginSuccess])

  // 自动登录逻辑
  useEffect(() => {
    const autoLogin = async () => {
      // 🔍 调试日志组
      console.group('🔍 登录状态检查')
      console.log('1. 基本状态:')
      console.log('  - isConnected:', isConnected)
      console.log('  - address:', address)
      console.log('  - isLoggingIn:', isLoggingIn)
      console.log('  - userRejected:', userRejected)
      console.log('  - needsReauth:', needsReauth)
      console.log('  - hasAttemptedLogin:', hasAttemptedLogin)
      
      // 基本条件检查
      if (!isConnected || !address || isLoggingIn) {
        console.log('2. 结果: ⏭️ 跳过（基本条件不满足）')
        console.groupEnd()
        return
      }

      // 如果用户已拒绝签名且不是 401 触发的重新认证，不再尝试
      if (userRejected && !needsReauth) {
        console.log('2. 结果: ⏸️ 用户已拒绝签名，跳过自动登录')
        console.groupEnd()
        return
      }

      // 检查是否已有 token
      const token = authService.getToken()
      const { address: savedAddress } = authService.getUserInfo()
      
      console.log('2. localStorage 状态:')
      console.log('  - token 存在:', !!token)
      console.log('  - token 值:', token ? `${token.substring(0, 20)}...` : 'null')
      console.log('  - savedAddress:', savedAddress)
      console.log('  - 当前 address:', address)
      console.log('  - 地址匹配:', savedAddress?.toLowerCase() === address?.toLowerCase())

      // 如果有 token 且地址匹配，并且不需要重新认证，不需要重新登录
      if (token && savedAddress?.toLowerCase() === address.toLowerCase() && !needsReauth) {
        console.log('3. 结果: ✅ 已有有效 token，无需重新登录')
        console.groupEnd()
        setHasAttemptedLogin(true) // 标记已完成登录检查
        return
      }

      // 如果已经尝试过登录（本次会话），不再重复尝试
      if (hasAttemptedLogin && !needsReauth) {
        console.log('3. 结果: ⏭️ 已尝试过登录，跳过')
        console.groupEnd()
        return
      }

      // 如果地址不匹配，清除旧的登录信息并重置状态
      if (token && savedAddress && savedAddress.toLowerCase() !== address.toLowerCase()) {
        console.log('3. 检测: 🔄 钱包地址变更，清除旧登录状态')
        authService.clearToken()
        setUserRejected(false) // 重置拒绝状态
        setHasAttemptedLogin(false) // 重置尝试状态
      }

      // 没有 token、地址变更或需要重新认证，执行登录
      console.log('4. 决策: 需要执行登录流程')
      console.log('  - 原因:', !token ? '无 token' : needsReauth ? '401 重新认证' : '首次登录')
      console.groupEnd()
      
      try {
        setIsLoggingIn(true)
        setHasAttemptedLogin(true) // 标记已尝试登录
        
        const reason = needsReauth ? '(401 重新认证)' : ''
        console.log(`🔄 开始自动登录${reason}...`, address)

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
          console.log('📥 收到登录响应:', {
            code: response.code,
            hasToken: !!response.data.access_token,
            userId: response.data.id,
            address: response.data.address,
            chain: response.data.chain
          })
          
          // 保存认证信息
          authService.saveToken(response.data.access_token)
          authService.saveUserInfo(
            response.data.id,
            response.data.address,
            response.data.chain
          )

          // 🔍 验证保存结果
          console.log('💾 保存后验证:')
          console.log('  - token 已保存:', !!localStorage.getItem('access_token'))
          console.log('  - user_id 已保存:', localStorage.getItem('user_id'))
          console.log('  - wallet_address 已保存:', localStorage.getItem('wallet_address'))

          console.log('✅ 自动登录成功')
          setNeedsReauth(false) // 重置重新认证标志
          setUserRejected(false) // 重置拒绝状态
          onLoginSuccess?.()
        }
      } catch (error: any) {
        console.error('❌ 自动登录失败:', error)
        
        // 判断是否是用户拒绝签名
        if (error.message?.includes('User rejected') || 
            error.message?.includes('User denied') ||
            error.code === 4001 || // MetaMask 拒绝错误码
            error.code === 'ACTION_REJECTED') {
          console.log('🚫 用户拒绝签名')
          setUserRejected(true) // 标记用户拒绝
          setNeedsReauth(false) // 如果是 401 触发的，也重置
        }
      } finally {
        setIsLoggingIn(false)
      }
    }

    autoLogin()
  }, [isConnected, address, signMessageAsync, onLoginSuccess, needsReauth])

  return (
    <header className="border-b border-gray-800 bg-[#0F0F23] sticky top-0 z-10">
      <div className="px-8 py-4 flex items-center justify-between">
        <span className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{title}</h1>
          {showSearch && (
            <div className="relative">
              <input
                type="text"
                placeholder="Search"
                className="bg-[#1A1A2E] border border-gray-700 rounded-lg pl-10 pr-4 py-2 w-80 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-1 rounded-md text-sm transition-colors">
                Search
              </button>
            </div>
          )}
        </span>
        
        <div className="flex items-center gap-4">
          {/* 登录状态指示 */}
          {isLoggingIn && (
            <span className="text-sm text-gray-400">登录中...</span>
          )}
          
          {/* RainbowKit Connect Button */}
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
                (!authenticationStatus ||
                  authenticationStatus === 'authenticated')

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
                          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                          <Wallet className="w-5 h-5" />
                          Connect Wallet
                        </button>
                      )
                    }

                    if (chain.unsupported) {
                      return (
                        <button
                          onClick={openChainModal}
                          type="button"
                          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                          Wrong network
                        </button>
                      )
                    }

                    return (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={openChainModal}
                          type="button"
                          className="flex items-center gap-2 bg-[#1A1A2E] hover:bg-[#252539] border border-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
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
                          {chain.name}
                        </button>

                        <button
                          onClick={openAccountModal}
                          type="button"
                          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                          <Wallet className="w-5 h-5" />
                          {account.displayName}
                          {account.displayBalance
                            ? ` (${account.displayBalance})`
                            : ''}
                        </button>
                      </div>
                    )
                  })()}
                </div>
              )
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </header>
  )
}

