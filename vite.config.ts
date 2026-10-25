
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

let flow2DossierCreated = false

function flow2MockMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const path = req.url?.split('?')[0] ?? ''
  const json = (status: number, body: unknown) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(body))
  }

  if (req.method === 'GET' && path === '/api/v1/bookings/1023/compliance-dossier') {
    if (!flow2DossierCreated) return json(404, { message: 'Compliance dossier not found' })
    return json(200, { data: { complianceDossierId: 502, dossierCode: 'CD-20261004-7001', status: 'IN_PREPARATION' } })
  }

  if (req.method === 'POST' && path === '/api/v1/bookings/1023/compliance-dossier') {
    flow2DossierCreated = true
    return json(201, { data: { complianceDossierId: 502, dossierCode: 'CD-20261004-7001', status: 'IN_PREPARATION', generatedRequirementCount: 0, failedCustomCount: 0 } })
  }

  if (path === '/api/v1/compliance-dossiers/502/requirements') {
    if (req.method === 'POST') return json(201, { data: { dossierRequirementId: 8102, status: 'PENDING' } })
  }

  if (path === '/api/v1/compliance-dossiers/502/requirements/8102') {
    if (req.method === 'PUT') return json(200, { data: null })
    if (req.method === 'DELETE') return json(204, null)
  }

  if (req.method === 'PATCH' && path === '/api/v1/compliance-dossiers/502/requirements/8102/waive') {
    return json(200, { data: null })
  }

  next()
}

const flow2MockPlugin = {
  name: 'flow2-http-mocks',
  configureServer(server: { middlewares: { use: (handler: typeof flow2MockMiddleware) => void } }) {
    server.middlewares.use(flow2MockMiddleware)
  },
}

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {}
  const content = fs.readFileSync(filePath, 'utf-8')
  const res: Record<string, string> = {}
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eqIdx = line.indexOf('=')
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim()
      let val = line.slice(eqIdx + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      res[key] = val
    }
  }
  return res
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const envDir = process.cwd()
  const localEnv = parseEnvFile(path.resolve(envDir, '.env'))
  const loadedEnv = loadEnv(mode, envDir, '')
  const merged = { ...loadedEnv, ...localEnv }

  const defines: Record<string, string> = {}
  for (const [k, v] of Object.entries(merged)) {
    if (k.startsWith('VITE_') && v && !v.startsWith('$')) {
      defines[`import.meta.env.${k}`] = JSON.stringify(v)
      process.env[k] = v
    }
  }

  return {
    plugins: [react(), tailwindcss(), flow2MockPlugin],
    server: {
      host: true,
      port: 5173,
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    define: defines,
  }
})


