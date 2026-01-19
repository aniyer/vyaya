import { useLocation } from 'react-router-dom'
import { useOfflineMode } from '../context/OfflineModeContext'
import { syncQueue, getQueueCount } from '../services/OfflineStorage'
import { useEffect } from 'react'
import BottomNav from './BottomNav'

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

    const isCapturePage = location.pathname === '/capture'

    return (
        <div className="min-h-screen flex flex-col bg-black">
            {/* Header - Hide on Capture page */}
            {!isCapturePage && (
                <header className="sticky top-0 z-40 border-b border-white/10 safe-top bg-black/80 backdrop-blur-md">
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
            )}

            {/* Main content */}
            <main className={`flex-1 max-w-lg mx-auto w-full px-4 ${isCapturePage ? 'pb-0' : 'pb-32'}`}>
                <div className="animate-fade-in" key={location.pathname}>
                    {children}
                </div>
            </main>

            {/* Bottom navigation - Hide on Capture page */}
            {!isCapturePage && <BottomNav />}
        </div>
    )
}
