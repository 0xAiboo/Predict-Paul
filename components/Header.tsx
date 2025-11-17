'use client'

import { Search, Wallet } from 'lucide-react'
import { ConnectButton } from '@rainbow-me/rainbowkit'

interface HeaderProps {
  title?: string
  showSearch?: boolean
}

export default function Header({ title = 'News Stream', showSearch = true }: HeaderProps) {
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

