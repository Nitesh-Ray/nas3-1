import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // /api/... ko FastAPI (8000) par bhej do -> dev me CORS ka jhanjhat nahi
    proxy: { '/api': 'http://localhost:8000' },
  },
})
