/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--bg-main) / <alpha-value>)',
        foreground: 'rgb(var(--text-main) / <alpha-value>)',
        surface: 'rgb(var(--bg-surface) / <alpha-value>)',
        'surface-hover': 'rgb(var(--bg-surface-hover) / <alpha-value>)',
        muted: 'rgb(var(--text-muted) / <alpha-value>)',
        border: 'rgb(var(--border-main) / <alpha-value>)',
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
  plugins: [
    require("tailwindcss-animate"),
  ],
}
