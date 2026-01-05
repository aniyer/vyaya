import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { receiptsApi } from '../api/client'

export default function ReceiptCard({ receipt }) {
    const { id, vendor, amount, currency, transaction_date, category, status } = receipt

    const formatAmount = (amt, curr = 'USD') => {
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: curr,
            }).format(amt || 0)
        } catch (e) {
            // Fallback for invalid currency codes (e.g. symbols like '₹')
            return `${curr} ${amt || 0}`
        }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Unknown date'
        try {
            const [year, month, day] = dateStr.split('-')
            return format(new Date(year, month - 1, day), 'MMM d, yyyy')
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
            <div className="w-14 h-14 rounded-xl bg-surface-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {receipt.image_path === 'manual_entry' ? (
                    <svg className="w-6 h-6 text-surface-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <line x1="10" y1="9" x2="8" y2="9" />
                    </svg>
                ) : (
                    <img
                        src={receiptsApi.getImageUrl(id)}
                        alt={vendor || 'Receipt'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.target.style.display = 'none'
                        }}
                    />
                )}
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
