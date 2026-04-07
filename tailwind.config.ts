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
        epicRed: '#D85A30',
        epicGreen: '#1D9E75',
        epicGold: '#BA7517',
        epicPurple: '#534AB7',
        inkBlack: '#1D1D1D',
        cream: '#FDF6E3',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        brutal: '6px 6px 0px #1D1D1D',
        'brutal-sm': '3px 3px 0px #1D1D1D',
        'brutal-md': '4px 4px 0px #1D1D1D',
      },
    },
  },
  plugins: [],
}

export default config
