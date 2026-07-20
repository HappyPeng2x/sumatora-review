import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Served from GitHub Pages as a project site (github.io/sumatora-review/),
// not a custom domain -- every asset path and the PWA scope/start_url need
// this prefix or they'll 404 once deployed, even though they resolve fine
// in local dev at the root.
const base = '/sumatora-review/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt' fires a needRefresh event that nothing in this app listens
      // for, so a new deploy would otherwise sit cached behind the old
      // service worker indefinitely; autoUpdate just activates new builds
      // on the next load, which is fine for a single-user review tool with
      // no in-app update UI.
      registerType: 'autoUpdate',
      manifest: {
        name: 'Sumatora Review',
        short_name: 'Review',
        description: 'Review AI-drafted JMdict translations',
        theme_color: '#1e293b',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
      },
      devOptions: { enabled: true },
    }),
  ],
})
