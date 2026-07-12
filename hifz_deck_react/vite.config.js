import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Apex custom domain (hifzer.app) serves from site root — not /hifz_deck/.
// Do not merge/deploy until GitHub Pages custom domain DNS is live, or the
// old https://elreynol.github.io/hifz_deck/ URL will break.
export default defineConfig({
  plugins: [react()],
  base: '/',
}) 