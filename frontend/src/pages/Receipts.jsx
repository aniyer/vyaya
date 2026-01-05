import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useReceipts } from '../hooks/useReceipts'
import ReceiptCard from '../components/ReceiptCard'

const DATE_RANGE_OPTIONS = [
    { label: 'This Week', value: 'this_week' },
    { label: 'This Month', value: 'this_month' },
    { label: 'Custom', value: 'custom' },
    { label: 'All Time', value: 'all' },
]

export default function Receipts() {
    const [search, setSearch] = useState('')
    const [dateRange, setDateRange] = useState('this_week')
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')

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

    return (
        <div className="py-6 pb-20">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">Receipts</h2>
                <p className="text-surface-400">
                    {pagination.total} {pagination.total === 1 ? 'receipt' : 'receipts'}
                </p>
            </div>

            {/* Toolbar */}
            <div className="space-y-4 mb-6">
                {/* Search */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search vendor or items..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-surface-800 border border-surface-700 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    />
                    <svg className="w-5 h-5 text-surface-400 absolute left-4 top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                    {DATE_RANGE_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => setDateRange(opt.value)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${dateRange === opt.value
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                                : 'bg-surface-800 text-surface-400 border border-surface-700 hover:border-surface-600'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* Custom Date Picker */}
                {dateRange === 'custom' && (
                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                        <div>
                            <label className="block text-xs text-surface-400 mb-1 ml-1">From</label>
                            <input
                                type="date"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="w-full bg-surface-800 border border-surface-700 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-surface-400 mb-1 ml-1">To</label>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="w-full bg-surface-800 border border-surface-700 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>
                )}
            </div>

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
                    {search || dateRange !== 'this_week' ? (
                        <button
                            onClick={() => {
                                setSearch('')
                                setDateRange('this_week')
                            }}
                            className="btn-secondary"
                        >
                            Reset Filters
                        </button>
                    ) : (
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
