/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC',
        surface: '#FFFFFF',
        'soft-green': '#D1FAE5',
        'primary-green': '#059669',
        'soft-yellow': '#FEF3C7',
        'soft-pink': '#FEE2E2',
        'peach': '#FFEDD5',
        'soft-blue': '#DBEAFE',
        'lavender': '#EDE9FE',
        border: '#CBD5E1',
        primary: '#0F172A',
        secondary: '#334155',
      },
      fontFamily: {
        sans: ['Inter', 'Arial', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        'premium': '0 4px 20px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
        'elevated': '0 12px 32px -4px rgba(15, 23, 42, 0.12), 0 4px 12px -2px rgba(15, 23, 42, 0.06)',
      }
    },
  },
  plugins: [],
}
