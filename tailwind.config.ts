import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7C3AED',
          dark: '#6D28D9',
          light: '#8B5CF6',
        },
        dark: {
          DEFAULT: '#0F0F23',
          lighter: '#1A1A2E',
          card: '#16213E',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
export default config

