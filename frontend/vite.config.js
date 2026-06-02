import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // Vite 5 bloqueia hosts desconhecidos; o ponto inicial cobre base + subdomínios.
    allowedHosts: ['.quilombo.localhost'],
    hmr: {
      // O websocket de HMR chega via nginx na porta 8090; clientPort = porta externa.
      // host omitido de propósito → usa location.hostname (por subdomínio).
      clientPort: 8090,
      protocol: 'ws',
    },
  },
})
