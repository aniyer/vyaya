import { createContext, useContext, useState, useEffect } from 'react'

const OfflineModeContext = createContext()

export function OfflineModeProvider({ children }) {
    const [offlineMode, setOfflineMode] = useState(() => {
        // Load from localStorage on init
        const stored = localStorage.getItem('vyaya_offline_mode')
        return stored === 'true'
    })

    useEffect(() => {
        // Persist to localStorage
        localStorage.setItem('vyaya_offline_mode', offlineMode.toString())
    }, [offlineMode])

    const toggleOfflineMode = () => {
        setOfflineMode(prev => !prev)
    }

    return (
        <OfflineModeContext.Provider value={{ offlineMode, setOfflineMode, toggleOfflineMode }}>
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
