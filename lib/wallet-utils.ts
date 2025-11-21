/**
 * 钱包登录工具函数
 * 提供钱包签名消息生成和验证功能
 */

/**
 * 生成登录消息
 * @returns 格式化的登录消息: "Login request@{时间戳}"
 */
export function generateLoginMessage(): string {
  const timestamp = Date.now();
  return `Login request@${timestamp}`;
}

/**
 * 验证消息时间戳是否在有效期内 (5分钟)
 * @param message 登录消息
 * @returns 是否有效
 */
export function isMessageValid(message: string): boolean {
  try {
    const parts = message.split('@');
    if (parts.length !== 2 || parts[0] !== 'Login request') {
      return false;
    }
    
    const timestamp = parseInt(parts[1], 10);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000; // 5分钟
    
    return Math.abs(now - timestamp) <= fiveMinutes;
  } catch {
    return false;
  }
}

/**
 * 使用以太坊钱包签名消息
 * @param message 要签名的消息
 * @param account 钱包地址（可选，如果不提供则自动获取）
 * @returns 签名字符串
 */
export async function signMessageEthereum(
  message: string,
  account?: string
): Promise<string> {
  if (!window.ethereum) {
    throw new Error('请安装 MetaMask 或其他以太坊钱包');
  }

  try {
    // 如果没有提供 account，则自动获取
    let signingAccount = account;
    if (!signingAccount) {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      if (!accounts || accounts.length === 0) {
        throw new Error('无法获取钱包地址');
      }
      signingAccount = accounts[0];
    }
    
    // 使用 personal_sign 方法签名
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, signingAccount],
    });
    
    return signature;
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('用户拒绝了签名请求');
    }
    throw new Error(`签名失败: ${error.message}`);
  }
}

/**
 * 使用 Solana 钱包签名消息
 * @param message 要签名的消息
 * @returns 签名字符串 (Base58 编码)
 */
export async function signMessageSolana(message: string): Promise<string> {
  // 检查 Phantom 钱包
  const provider = (window as any).solana;
  
  if (!provider || !provider.isPhantom) {
    throw new Error('请安装 Phantom 钱包');
  }

  try {
    // 连接钱包（如果尚未连接）
    const resp = await provider.connect({ onlyIfTrusted: false });
    
    // 将消息转换为 Uint8Array
    const encodedMessage = new TextEncoder().encode(message);
    
    // 签名消息
    const signedMessage = await provider.signMessage(encodedMessage, 'utf8');
    
    // 将签名转换为 Base58 字符串
    const signature = btoa(
      String.fromCharCode(...new Uint8Array(signedMessage.signature))
    );
    
    return signature;
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('用户拒绝了签名请求');
    }
    throw new Error(`签名失败: ${error.message}`);
  }
}

/**
 * 获取以太坊钱包地址
 * @returns 钱包地址
 */
export async function getEthereumAddress(): Promise<string> {
  if (!window.ethereum) {
    throw new Error('请安装 MetaMask 或其他以太坊钱包');
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
    
    if (!accounts || accounts.length === 0) {
      throw new Error('无法获取钱包地址');
    }
    
    return accounts[0];
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('用户拒绝了连接请求');
    }
    throw new Error(`获取钱包地址失败: ${error.message}`);
  }
}

/**
 * 获取 Solana 钱包地址
 * @returns 钱包地址
 */
export async function getSolanaAddress(): Promise<string> {
  const provider = (window as any).solana;
  
  if (!provider || !provider.isPhantom) {
    throw new Error('请安装 Phantom 钱包');
  }

  try {
    const resp = await provider.connect({ onlyIfTrusted: false });
    return resp.publicKey.toString();
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('用户拒绝了连接请求');
    }
    throw new Error(`获取钱包地址失败: ${error.message}`);
  }
}

/**
 * 扩展 Window 接口以支持钱包
 */
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (event: string, callback: (...args: any[]) => void) => void;
      removeListener?: (event: string, callback: (...args: any[]) => void) => void;
    };
    solana?: {
      isPhantom?: boolean;
      connect: (config?: { onlyIfTrusted: boolean }) => Promise<{ publicKey: any }>;
      disconnect: () => Promise<void>;
      signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
      on?: (event: string, callback: (...args: any[]) => void) => void;
      removeListener?: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

