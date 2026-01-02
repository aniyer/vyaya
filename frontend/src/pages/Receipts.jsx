import { Link } from 'react-router-dom'
import { useReceipts } from '../hooks/useReceipts'
import ReceiptCard from '../components/ReceiptCard'

export default function Receipts() {
    const { receipts, loading, error, pagination, refetch } = useReceipts()

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
        <div className="py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Receipts</h2>
                    <p className="text-surface-400">
                        {pagination.total} {pagination.total === 1 ? 'receipt' : 'receipts'}
                    </p>
                </div>
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
                    <h3 className="text-lg font-medium text-white mb-2">No receipts yet</h3>
                    <p className="text-surface-400 mb-4">
                        Start by capturing your first receipt
                    </p>
                    <Link to="/capture" className="btn-primary inline-block">
                        Capture Receipt
                    </Link>
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
