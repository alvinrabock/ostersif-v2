'use client'

import { useState } from 'react'

interface CronEndpoint {
  name: string
  description: string
  path: string
  method: 'POST' | 'GET'
  params?: { key: string; label: string; type: 'text' | 'checkbox'; default?: string }[]
}

const CRON_ENDPOINTS: CronEndpoint[] = [
  {
    name: 'Sync SMC Matches',
    description: 'Sync match data from SMC API to Frontspace CMS. Covers herrar matches.',
    path: '/api/cron/sync-matches',
    method: 'POST',
    params: [
      { key: 'dryRun', label: 'Dry Run (preview only)', type: 'checkbox' },
      { key: 'limit', label: 'Limit matches', type: 'text' },
      { key: 'season', label: 'Season (YYYY or "all")', type: 'text', default: new Date().getFullYear().toString() },
    ],
  },
  {
    name: 'Sync SvFF Games',
    description: 'Sync match data from SvFF API to CMS. Covers ALL club teams (herrar, damer, youth).',
    path: '/api/cron/sync-svff-games',
    method: 'POST',
    params: [
      { key: 'dryRun', label: 'Dry Run (preview only)', type: 'checkbox' },
      { key: 'limit', label: 'Limit games', type: 'text' },
      { key: 'from', label: 'From date (YYYY-MM-DD)', type: 'text' },
      { key: 'to', label: 'To date (YYYY-MM-DD)', type: 'text' },
    ],
  },
  {
    name: 'Sync SvFF Turneringar',
    description: 'Sync competition/league data from SvFF API to CMS turneringar post type.',
    path: '/api/cron/sync-svff-turneringar',
    method: 'POST',
    params: [
      { key: 'dryRun', label: 'Dry Run (preview only)', type: 'checkbox' },
      { key: 'limit', label: 'Limit competitions', type: 'text' },
    ],
  },
  {
    name: 'Sync SMC Turneringar',
    description: 'Sync league data from SMC API cache to CMS turneringar. Localhost only.',
    path: '/api/sync-turneringar',
    method: 'POST',
    params: [
      { key: 'dryRun', label: 'Dry Run (preview only)', type: 'checkbox' },
      { key: 'limit', label: 'Limit leagues', type: 'text' },
      { key: 'season', label: 'Season (YYYY or "all")', type: 'text' },
      { key: 'source', label: 'Source (smc or svff)', type: 'text', default: 'smc' },
    ],
  },
]

interface EndpointResult {
  loading: boolean
  data: any
  error: string | null
  duration: number | null
}

function CronCard({ endpoint }: { endpoint: CronEndpoint }) {
  const [result, setResult] = useState<EndpointResult>({ loading: false, data: null, error: null, duration: null })
  const [params, setParams] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {}
    endpoint.params?.forEach(p => {
      if (p.default) defaults[p.key] = p.default
    })
    return defaults
  })

  const runEndpoint = async () => {
    setResult({ loading: true, data: null, error: null, duration: null })
    const start = Date.now()

    try {
      // Build query string from params
      const queryParts: string[] = []
      for (const [key, value] of Object.entries(params)) {
        if (value && value !== 'false') {
          queryParts.push(`${key}=${encodeURIComponent(value)}`)
        }
      }
      const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : ''
      const url = `${endpoint.path}${queryString}`

      const res = await fetch(url, { method: endpoint.method })
      const data = await res.json()
      const duration = Date.now() - start

      setResult({ loading: false, data, error: res.ok ? null : `HTTP ${res.status}`, duration })
    } catch (err) {
      const duration = Date.now() - start
      setResult({ loading: false, data: null, error: err instanceof Error ? err.message : 'Unknown error', duration })
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-4">
      <div>
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">{endpoint.name}</h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-600/30 text-blue-300">
            {endpoint.method}
          </span>
        </div>
        <p className="text-gray-400 text-sm mt-1">{endpoint.description}</p>
        <code className="text-xs text-gray-500 mt-1 block">{endpoint.path}</code>
      </div>

      {/* Parameters */}
      {endpoint.params && endpoint.params.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {endpoint.params.map(p => (
            <div key={p.key}>
              {p.type === 'checkbox' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params[p.key] === 'true'}
                    onChange={e => setParams(prev => ({ ...prev, [p.key]: e.target.checked ? 'true' : 'false' }))}
                    className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                  />
                  <span className="text-sm text-gray-300">{p.label}</span>
                </label>
              ) : (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">{p.label}</label>
                  <input
                    type="text"
                    value={params[p.key] || ''}
                    onChange={e => setParams(prev => ({ ...prev, [p.key]: e.target.value }))}
                    placeholder={p.default || p.key}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Run button */}
      <button
        onClick={runEndpoint}
        disabled={result.loading}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
      >
        {result.loading ? 'Running...' : 'Run Sync'}
      </button>

      {/* Result */}
      {(result.data || result.error) && (
        <div className="space-y-2">
          <div className="flex items-center gap-4 text-xs">
            {result.duration !== null && (
              <span className="text-gray-400">{(result.duration / 1000).toFixed(1)}s</span>
            )}
            {result.data?.success === true && (
              <span className="text-green-400 font-medium">Success</span>
            )}
            {(result.data?.success === false || result.error) && (
              <span className="text-red-400 font-medium">Error</span>
            )}
          </div>

          {/* Summary message */}
          {result.data?.message && (
            <div className={`text-sm px-3 py-2 rounded ${result.data.success ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
              {result.data.message}
            </div>
          )}

          {/* Errors list */}
          {result.data?.errors?.length > 0 && (
            <div className="bg-red-900/20 rounded p-3">
              <h4 className="text-red-400 text-xs font-medium mb-2">Errors ({result.data.errors.length})</h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {result.data.errors.slice(0, 20).map((err: any, i: number) => (
                  <div key={i} className="text-xs text-red-300/80 font-mono">
                    {typeof err === 'string' ? err : JSON.stringify(err)}
                  </div>
                ))}
                {result.data.errors.length > 20 && (
                  <div className="text-xs text-red-400">... and {result.data.errors.length - 20} more</div>
                )}
              </div>
            </div>
          )}

          {/* Details */}
          {result.data?.details && (
            <details className="text-xs">
              <summary className="text-gray-400 cursor-pointer hover:text-gray-300">Full response</summary>
              <pre className="mt-2 bg-gray-900 rounded p-3 overflow-x-auto max-h-80 overflow-y-auto text-gray-300">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </details>
          )}

          {/* Raw error */}
          {result.error && !result.data && (
            <div className="text-sm text-red-400 bg-red-900/20 rounded p-3">
              {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CronDebugPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Cron / Sync Endpoints</h1>
      <p className="text-gray-400 mb-8">
        Test and trigger sync endpoints. Use &quot;Dry Run&quot; to preview without making changes.
      </p>

      <div className="space-y-6">
        {CRON_ENDPOINTS.map(endpoint => (
          <CronCard key={endpoint.path} endpoint={endpoint} />
        ))}
      </div>

      {/* Production setup info */}
      <div className="mt-12 bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-3">Production Setup</h2>
        <p className="text-gray-400 text-sm mb-4">
          In production, cron endpoints require the <code className="text-yellow-300">CRON_SECRET</code> environment variable.
        </p>
        <div className="bg-gray-900 rounded p-4 text-sm font-mono text-gray-300 space-y-2">
          <div className="text-gray-500"># POST with header auth (recommended)</div>
          <div>curl -s -X POST \</div>
          <div className="pl-4">-H &quot;x-cron-secret: $CRON_SECRET&quot; \</div>
          <div className="pl-4">&quot;https://your-domain.com/api/cron/sync-svff-games&quot;</div>
          <div className="mt-3 text-gray-500"># GET with query param (for manual testing)</div>
          <div>curl -s &quot;https://your-domain.com/api/cron/sync-svff-games?secret=$CRON_SECRET&quot;</div>
        </div>
      </div>
    </div>
  )
}
