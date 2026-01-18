import { NavLink, useLocation } from 'react-router-dom'
import { useOfflineMode } from '../context/OfflineModeContext'
import { syncQueue, getQueueCount } from '../services/OfflineStorage'
import { useEffect } from 'react'

const navItems = [
    { path: '/', label: 'Dashboard', icon: DashboardIcon },
    { path: '/capture', label: 'Capture', icon: CameraIcon },
    { path: '/receipts', label: 'History', icon: ReceiptIcon },
]

function DashboardIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    )
}

function CameraIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
        </svg>
    )
}

function ReceiptIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
        </svg>
    )
}

export default function Layout({ children }) {
    const location = useLocation()
    const { offlineMode } = useOfflineMode()

    // Auto-sync when coming online
    useEffect(() => {
        if (!offlineMode) {
            const attemptSync = async () => {
                const count = await getQueueCount()
                if (count > 0) {
                    console.log('Online detected, auto-syncing queue...')
                    await syncQueue()
                }
            }
            attemptSync()
        }
    }, [offlineMode])

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0a0a0a' }}>
            {/* Header */}
            <header className="sticky top-0 z-40 border-b border-neutral-800 safe-top" style={{ backgroundColor: '#0a0a0a' }}>
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/pwa-192x192.png?v=2" alt="Vyaya" className="w-8 h-8 rounded-lg" />
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-black tracking-tight text-amber-500">
                                VYAYA
                            </h1>
                            {/* Subtle Status Indicator */}
                            <div
                                className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${offlineMode ? 'bg-amber-500 animate-pulse' : 'bg-green-500/30'
                                    }`}
                                title={offlineMode ? 'Offline' : 'Online'}
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-24">
                <div className="animate-fade-in" key={location.pathname}>
                    {children}
                </div>
            </main>

            {/* Bottom navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-800 safe-bottom" style={{ backgroundColor: '#0a0a0a' }}>
                <div className="max-w-lg mx-auto px-4">
                    <div className="flex items-center justify-around py-2">
                        {navItems.map(({ path, label, icon: Icon }) => (
                            <NavLink
                                key={path}
                                to={path}
                                className={({ isActive }) =>
                                    `flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${isActive
                                        ? 'text-amber-500'
                                        : 'text-neutral-500 hover:text-neutral-300'
                                    }`
                                }
                            >
                                <Icon className="w-6 h-6" />
                                <span className="text-xs font-semibold">{label}</span>
                            </NavLink>
                        ))}
                    </div>
                </div>
            </nav>
        </div>
    )
}
