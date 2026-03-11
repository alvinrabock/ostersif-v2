'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const debugRoutes = [
  { path: '/admin/debug/cron', label: 'Cron / Sync', description: 'Sync endpoints & testing' },
  { path: '/admin/debug/smc', label: 'SMC API', description: 'Match data, leagues, teams' },
  { path: '/admin/debug/sportomedia', label: 'Sportomedia', description: 'Lineups, standings' },
  { path: '/admin/debug/ebiljett', label: 'eBiljett', description: 'Ticket events' },
  { path: '/admin/debug/svff', label: 'SvFF API', description: 'Club, games, standings' },
]

export default function DebugLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isLocalhost, setIsLocalhost] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if running on localhost
    const hostname = window.location.hostname
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')
    setIsLocalhost(isLocal)
  }, [])

  // Loading state
  if (isLocalhost === null) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-gray-400">Checking access...</div>
      </div>
    )
  }

  // Block non-localhost access
  if (!isLocalhost) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h1>
          <p className="text-gray-400">Debug pages are only available on localhost.</p>
          <Link href="/" className="mt-4 inline-block text-blue-400 hover:text-blue-300">
            ← Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 min-h-screen bg-gray-800 border-r border-gray-700 p-4">
          <div className="mb-6">
            <Link href="/admin/matcher" className="text-gray-400 hover:text-white text-sm">
              ← Back to Admin
            </Link>
            <h1 className="text-xl font-bold mt-2">API Debug</h1>
            <p className="text-gray-500 text-xs mt-1">Localhost only</p>
          </div>

          <nav className="space-y-2">
            {debugRoutes.map((route) => (
              <Link
                key={route.path}
                href={route.path}
                className={`block p-3 rounded-lg transition-colors ${
                  pathname === route.path
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700/50 hover:bg-gray-700 text-gray-300'
                }`}
              >
                <div className="font-medium">{route.label}</div>
                <div className="text-xs text-gray-400 mt-1">{route.description}</div>
              </Link>
            ))}
          </nav>

          <div className="mt-8 pt-4 border-t border-gray-700">
            <Link
              href="/admin/matcher"
              className="block p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-300"
            >
              <div className="font-medium">League Cache</div>
              <div className="text-xs text-gray-400 mt-1">Manage team leagues</div>
            </Link>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
