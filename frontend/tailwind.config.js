/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0A192F',
          dark: '#060D17',
          deep: '#0F203C',
          card: '#112240',
          cyan: '#00B4D8',
          teal: '#00F5D4',
          blue: '#0077B6',
          sky: '#E0F2FE',
          accent: '#38BDF8',
          border: 'rgba(255, 255, 255, 0.12)',
          'cyan-border': 'rgba(0, 180, 216, 0.25)',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'cyan-glow': '0 0 25px -5px rgba(0, 180, 216, 0.4)',
        'luxury': '0 20px 40px -15px rgba(10, 25, 47, 0.2)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
