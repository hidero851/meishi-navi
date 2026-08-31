/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', '"Hiragino Sans"', 'sans-serif'],
      },
      colors: {
        accent: { DEFAULT: '#0071E3', hover: '#0077ED', soft: '#EBF2FF' },
      },
    },
  },
  plugins: [],
}
