import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/forecast':  'http://localhost:8000',
      '/summary':   'http://localhost:8000',
      '/categories':'http://localhost:8000',
      '/refresh':   'http://localhost:8000',
    }
  }
})
