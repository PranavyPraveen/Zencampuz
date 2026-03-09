/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        zen: {
          dark: '#0B1026',
          darker: '#1B2A4A',
          primary: '#2563EB',
          cyan: '#22D3EE',
          teal: '#2DD4BF',
          purple: '#8B5CF6',
          light: '#F8FAFC',
          slate: '#64748B',
          slateLight: '#CBD5E1',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444'
        }
      }
    },
  },
  plugins: [],
}
