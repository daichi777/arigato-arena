import type { Config } from 'tailwindcss';

/**
 * ArigatoArena Tailwind 設定。
 * - ダーク基調 + 赤/青アクセント（red/blue チームカラー）
 * - 廃墟・ノイズ世界観に合わせ「ink」ダーク階調と「rust」アクセント色を用意
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './game/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0a0b0e',
          900: '#11141a',
          800: '#1a1f28',
          700: '#252c38',
          600: '#3a4452',
          500: '#5b6577',
          400: '#8a93a3',
          300: '#b3bac6',
          200: '#d6dae2',
          100: '#eef0f4',
        },
        accent: {
          red: '#e34a4a',
          redDark: '#7a1818',
          blue: '#4a8de3',
          blueDark: '#16386b',
        },
        rust: {
          500: '#b65a2d',
          600: '#8a3f1c',
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', '"Noto Sans JP"', 'system-ui', 'sans-serif'],
        display: ['"Bebas Neue"', '"Inter Variable"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px 0 rgba(227, 74, 74, 0.35)',
        glowBlue: '0 0 24px 0 rgba(74, 141, 227, 0.35)',
      },
      keyframes: {
        pulseSlow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
      animation: {
        pulseSlow: 'pulseSlow 2.4s ease-in-out infinite',
        scanline: 'scanline 6s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
