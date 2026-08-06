import { copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages has no server-side rewrites, so a deep link like /acme_a7b4zu
// 404s. Shipping 404.html as a copy of index.html makes Pages serve the app for
// any path, and the router then reads location.pathname.
function spaFallback(): Plugin {
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    writeBundle(options) {
      const dir = options.dir ?? 'dist'
      copyFileSync(join(dir, 'index.html'), join(dir, '404.html'))
    },
  }
}

// Served from the root of clientsurvey.kaimakki.com, so no repo subpath.
export default defineConfig({
  base: '/',
  plugins: [react(), spaFallback()],
})
