import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      // Service workers exigem HTTPS. Como o app roda em http:// (na mesa),
      // desativamos o SW mas mantemos o manifest para "Adicionar à tela inicial".
      registerType: 'autoUpdate',
      injectRegister: null,
      selfDestroying: true,
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Monitor Pessoal A3',
        short_name: 'Monitor A3',
        description: 'Monitor pessoal de palco - Soundcraft Ui24R',
        theme_color: '#050505',
        background_color: '#000000',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
