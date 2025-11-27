import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        forte: {
          primary: '#4A0221',
          secondary: '#A51652',
          accent: '#B8335F',
          light: '#F99184',
          50: '#FFF5F7',
          100: '#FFE5EA',
          200: '#FFD1DC',
          300: '#F99184',
          400: '#E5617A',
          500: '#B8335F',
          600: '#A51652',
          700: '#8A1144',
          800: '#6F0E37',
          900: '#4A0221',
        },
      },
      backgroundImage: {
        'forte-gradient': 'linear-gradient(135deg, #F99184 0%, #B8335F 80.5%, #A51652 100%)',
        'forte-gradient-reverse': 'linear-gradient(315deg, #F99184 0%, #B8335F 80.5%, #A51652 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'forte': '0 4px 14px 0 rgba(165, 22, 82, 0.15)',
        'forte-lg': '0 10px 30px 0 rgba(165, 22, 82, 0.2)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'loading-bar': {
          '0%': { width: '0%', marginLeft: '0%' },
          '50%': { width: '100%', marginLeft: '0%' },
          '100%': { width: '0%', marginLeft: '100%' },
        },
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        'loading-bar': 'loading-bar 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
