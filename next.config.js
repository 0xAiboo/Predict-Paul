/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // 开发环境反向代理配置
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://51.79.173.45:8000/:path*',
      },
    ]
  },

  // 图片域名配置
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'polymarket-upload.s3.us-east-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
  },

  // 环境变量配置
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://51.79.173.45:8000',
  },
}

module.exports = nextConfig

