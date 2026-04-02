import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// Force reload trigger
// Trigger 2
// Trigger 3
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  }
})
