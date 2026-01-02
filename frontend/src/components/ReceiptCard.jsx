import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { receiptsApi } from '../api/client'

export default function ReceiptCard({ receipt }) {
    const { id, vendor, amount, currency, transaction_date, category, status } = receipt

    const formatAmount = (amt, curr = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: curr,
        }).format(amt || 0)
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Unknown date'
        try {
            return format(new Date(dateStr), 'MMM d, yyyy')
        } catch {
            return dateStr
        }
    }

    return (
        <Link
            to={`/receipts/${id}`}
            className="card p-4 flex items-center gap-4 hover:bg-surface-700/50 transition-colors group"
        >
            {/* Thumbnail */}
            <div className="w-14 h-14 rounded-xl bg-surface-700 overflow-hidden flex-shrink-0">
                <img
                    src={receiptsApi.getImageUrl(id)}
                    alt={vendor || 'Receipt'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.target.style.display = 'none'
                    }}
                />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    {category && (
                        <span className="text-sm" title={category.name}>
                            {category.icon}
                        </span>
                    )}
                    <h3 className="font-medium text-white truncate">
                        {vendor || 'Unknown Vendor'}
                    </h3>
                    {status === 'processing' && (
                        <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium">
                            Processing
                        </span>
                    )}
                    {status === 'failed' && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                            Failed
                        </span>
                    )}
                </div>
                <p className="text-sm text-surface-400">
                    {formatDate(transaction_date)}
                </p>
            </div>

            {/* Amount */}
            <div className="text-right flex-shrink-0">
                <p className="font-semibold text-white">
                    {formatAmount(amount, currency)}
                </p>
                <div className="flex items-center justify-end gap-1 text-surface-500 group-hover:text-primary-400 transition-colors">
                    <span className="text-xs">View</span>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </div>
            </div>
        </Link>
    )
}
