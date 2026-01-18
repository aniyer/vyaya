import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const OfflineModeContext = createContext()

export function OfflineModeProvider({ children }) {
    // 1. User manual override (persisted)
    const [forcedOffline, setForcedOffline] = useState(() => {
        return localStorage.getItem('vyaya_forced_offline') === 'true'
    })

    // 2. Automated health state (starts as false = offline, conservatively)
    const [isBackendReachable, setIsBackendReachable] = useState(false)

    // 3. Effective state used by the app
    // We are offline if: User forced it OR Backend is unreachable
    const offlineMode = forcedOffline || !isBackendReachable

    // Health check function
    const checkHealth = useCallback(async () => {
        // Even if forced offline, we might want to know if backend is reachable? 
        // But for efficiency/battery, maybe skip if browser is offline.
        if (!navigator.onLine) {
            setIsBackendReachable(false)
            return
        }

        try {
            // Use a short timeout to fail fast
            await axios.get('/api/health', { timeout: 3000 })
            setIsBackendReachable(true)
        } catch (err) {
            // Only log if we were previously reachable to avoid spamming
            setIsBackendReachable((prev) => {
                if (prev) console.log('Backend connection lost:', err.message)
                return false
            })
        }
    }, [])

    useEffect(() => {
        // Checks on mount
        checkHealth()

        // Check periodically
        const interval = setInterval(checkHealth, 10000)

        // Check on network status change
        const handleOnline = () => checkHealth()
        const handleOffline = () => setIsBackendReachable(false)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') checkHealth()
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            clearInterval(interval)
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [checkHealth])

    const toggleOfflineMode = () => {
        setForcedOffline(prev => {
            const newValue = !prev
            localStorage.setItem('vyaya_forced_offline', newValue.toString())
            // If un-forcing, check health immediately
            if (!newValue) {
                checkHealth()
            }
            return newValue
        })
    }

    return (
        <OfflineModeContext.Provider value={{
            offlineMode,
            toggleOfflineMode,
            forcedOffline,
            isBackendReachable
        }}>
            {children}
        </OfflineModeContext.Provider>
    )
}

export function useOfflineMode() {
    const context = useContext(OfflineModeContext)
    if (!context) {
        throw new Error('useOfflineMode must be used within OfflineModeProvider')
    }
    return context
}
