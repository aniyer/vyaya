import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useReceipts } from '../hooks/useReceipts'
import ReceiptCard from '../components/ReceiptCard'
import { getQueue, syncQueue, isOnline } from '../services/OfflineStorage'
import { useOfflineMode } from '../context/OfflineModeContext'

export default function Receipts() {
    const { offlineMode } = useOfflineMode()
    const [search, setSearch] = useState('')
    const [dateRange, setDateRange] = useState('this_week')
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')

    // Offline queue state
    const [pendingReceipts, setPendingReceipts] = useState([])
    const [syncing, setSyncing] = useState(false)
    const [syncResult, setSyncResult] = useState(null)

    // Compute start_date and end_date based on selection
    const filterParams = useMemo(() => {
        const params = { q: search || undefined }
        const today = new Date()

        // Helper to format date as YYYY-MM-DD in local time
        const formatDate = (date) => {
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
        }

        if (dateRange === 'this_week') {
            const monday = new Date(today)
            const day = today.getDay()
            const diff = today.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
            monday.setDate(diff)
            params.start_date = formatDate(monday)
            params.end_date = formatDate(today)
        } else if (dateRange === 'this_month') {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
            params.start_date = formatDate(firstDay)
            params.end_date = formatDate(today)
        } else if (dateRange === 'custom') {
            if (customStart) params.start_date = customStart
            if (customEnd) params.end_date = customEnd
        }

        return params
    }, [search, dateRange, customStart, customEnd])

    const { receipts, loading, error, pagination, refetch } = useReceipts(filterParams)

    // Load pending receipts from IndexedDB
    const loadPendingReceipts = useCallback(async () => {
        const queue = await getQueue()
        setPendingReceipts(queue)
    }, [])

    // Sync pending receipts to the server
    const handleSync = useCallback(async () => {
        if (syncing || pendingReceipts.length === 0) return

        setSyncing(true)
        setSyncResult(null)

        try {
            const result = await syncQueue()
            setSyncResult(result)
            // Reload pending list and receipts
            await loadPendingReceipts()
            refetch()
        } catch (err) {
            setSyncResult({ success: 0, failed: pendingReceipts.length, error: err.message })
        } finally {
            setSyncing(false)
        }
    }, [syncing, pendingReceipts.length, loadPendingReceipts, refetch])

    // Load pending receipts on mount
    useEffect(() => {
        loadPendingReceipts()
    }, [loadPendingReceipts])

    // Auto-sync when coming back online
    useEffect(() => {
        const handleOnline = () => {
            if (pendingReceipts.length > 0) {
                handleSync()
            }
        }

        window.addEventListener('online', handleOnline)
        return () => window.removeEventListener('online', handleOnline)
    }, [pendingReceipts.length, handleSync])

    const handlePageChange = (newPage) => {
        refetch({ page: newPage })
    }

    if (loading && receipts.length === 0) {
        return (
            <div className="py-6 space-y-4">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-1">Receipts</h2>
                    <p className="text-surface-400">Your receipt history</p>
                </div>
                {[1, 2, 3].map((i) => (
                    <div key={i} className="card p-4 animate-pulse">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-surface-700 rounded-xl" />
                            <div className="flex-1">
                                <div className="h-4 bg-surface-700 rounded w-1/2 mb-2" />
                                <div className="h-3 bg-surface-700 rounded w-1/3" />
                            </div>
                            <div className="h-5 bg-surface-700 rounded w-16" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="py-6">
                <div className="card p-6 text-center">
                    <p className="text-red-400 mb-4">Failed to load receipts</p>
                    <p className="text-sm text-surface-400 mb-4">{error}</p>
                    <button onClick={() => refetch()} className="btn-primary">
                        Try Again
                    </button>
                </div>
            </div>
        )
    }

    if (offlineMode) {
        return (
            <div className="py-6">
                <div className="card p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="1" y1="1" x2="23" y2="23" />
                            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                            <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
                            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                            <line x1="12" y1="20" x2="12.01" y2="20" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">Offline Mode</h3>
                    <p className="text-surface-400">
                        Receipt history is unavailable while offline. Go online to view your receipts.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="py-6 pb-20">
            {/* Compact Header + Filters */}
            <div className="mb-6 space-y-4">
                {/* Title row with count */}
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">History</h2>
                    <span className="text-sm text-white/40">
                        {pagination.total} {pagination.total === 1 ? 'receipt' : 'receipts'}
                    </span>
                </div>

                {/* Compact filter row */}
                <div className="flex gap-2">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <svg className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </div>

                    {/* Date filter dropdown */}
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none cursor-pointer min-w-[110px]"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff40'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px' }}
                    >
                        <option value="this_week" className="bg-gray-900">This Week</option>
                        <option value="this_month" className="bg-gray-900">This Month</option>
                        <option value="custom" className="bg-gray-900">Custom</option>
                        <option value="all" className="bg-gray-900">All Time</option>
                    </select>
                </div>

                {/* Custom date range (only when selected) */}
                {dateRange === 'custom' && (
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            placeholder="From"
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <input
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            placeholder="To"
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                )}
            </div>

            {/* Pending Uploads Section */}
            {pendingReceipts.length > 0 && (
                <div className="mb-6 card p-4 bg-amber-500/10 border-amber-500/30">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-amber-400 font-medium text-sm">
                                    {pendingReceipts.length} Pending Upload{pendingReceipts.length !== 1 ? 's' : ''}
                                </p>
                                <p className="text-xs text-surface-400">
                                    {isOnline() ? 'Ready to sync' : 'Waiting for connection'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleSync}
                            disabled={syncing || !isOnline()}
                            className="px-4 py-2 rounded-lg bg-amber-500 text-black font-medium text-sm hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {syncing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    Syncing...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="23 4 23 10 17 10" />
                                        <polyline points="1 20 1 14 7 14" />
                                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                                    </svg>
                                    Sync Now
                                </>
                            )}
                        </button>
                    </div>

                    {/* Pending receipt thumbnails */}
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {pendingReceipts.map((pending) => (
                            <div
                                key={pending.id}
                                className="flex-shrink-0 w-16 h-16 rounded-lg bg-surface-700 flex items-center justify-center overflow-hidden"
                            >
                                {pending.file && (
                                    pending.type?.startsWith('audio/') ? (
                                        <div className="flex flex-col items-center justify-center text-amber-500">
                                            <svg className="w-8 h-8 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                                <line x1="12" y1="19" x2="12" y2="23" />
                                                <line x1="8" y1="23" x2="16" y2="23" />
                                            </svg>
                                        </div>
                                    ) : (
                                        <img
                                            src={URL.createObjectURL(pending.file)}
                                            alt="Pending receipt"
                                            className="w-full h-full object-cover"
                                        />
                                    )
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Sync result message */}
                    {syncResult && (
                        <div className={`mt-3 text-sm ${syncResult.failed > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {syncResult.success > 0 && `${syncResult.success} uploaded successfully. `}
                            {syncResult.failed > 0 && `${syncResult.failed} failed.`}
                        </div>
                    )}
                </div>
            )}

            {/* Receipt list */}
            {receipts.length === 0 ? (
                <div className="card p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-700 flex items-center justify-center">
                        <svg className="w-8 h-8 text-surface-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No receipts found</h3>
                    <p className="text-surface-400 mb-4">
                        Try adjusting your filters or search terms
                    </p>
                    {!offlineMode && (search || dateRange !== 'this_week') && (
                        <button
                            onClick={() => {
                                setSearch('')
                                setDateRange('this_week')
                            }}
                            className="btn-secondary"
                        >
                            Reset Filters
                        </button>
                    )}
                    {!offlineMode && !search && dateRange === 'this_week' && (
                        <Link to="/capture" className="btn-primary inline-block">
                            Capture Receipt
                        </Link>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {receipts.map((receipt) => (
                        <ReceiptCard key={receipt.id} receipt={receipt} />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                        className="btn-secondary py-2 px-3 disabled:opacity-50"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <span className="text-sm text-surface-400 px-3">
                        Page {pagination.page} of {pagination.pages}
                    </span>
                    <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.pages}
                        className="btn-secondary py-2 px-3 disabled:opacity-50"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    )
}
