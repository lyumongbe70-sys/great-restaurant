import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function serverSyncPlugin(): Plugin {
  return {
    name: 'server-sync-plugin',
    configureServer(server) {
      server.middlewares.use('/api/sync-restaurants', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method Not Allowed' }))
          return
        }

        try {
          const { syncRestaurants } = require('./scripts/syncRestaurants.cjs')
          const result = await syncRestaurants()
          res.setHeader('Content-Type', 'application/json')
          if (result && result.success) {
            res.statusCode = 200
            res.end(JSON.stringify(result))
          } else {
            res.statusCode = 400
            res.end(JSON.stringify(result || { error: '동기화 실패' }))
          }
        } catch (err: any) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err?.message || 'Server error' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serverSyncPlugin()],
})
