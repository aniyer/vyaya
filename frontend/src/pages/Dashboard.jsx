import { useDashboard, useReceipts } from '../hooks/useReceipts'
import CategoryPie from '../components/charts/CategoryPie'
import { Link } from 'react-router-dom'

export default function Dashboard() {
    const { summary, loading, error } = useDashboard()
    const { receipts: recentReceipts, loading: receiptsLoading } = useReceipts({ per_page: 5 })

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount || 0)
    }

    if (loading) {
        return (
            <div className="py-6 space-y-6">
                {/* Loading skeleton for top tile */}
                <div className="card-glow p-6 animate-pulse">
                    <div className="h-6 bg-white/10 rounded w-1/3 mb-4" />
                    <div className="h-12 bg-white/10 rounded w-1/2 mb-6" />
                    <div className="flex gap-4">
                        <div className="w-32 h-32 bg-white/10 rounded-full" />
                        <div className="flex-1 space-y-3">
                            <div className="h-4 bg-white/10 rounded w-3/4" />
                            <div className="h-4 bg-white/10 rounded w-1/2" />
                            <div className="h-4 bg-white/10 rounded w-2/3" />
                        </div>
                    </div>
                </div>
                {/* Loading skeleton for bottom tile */}
                <div className="card p-6 animate-pulse">
                    <div className="h-5 bg-white/10 rounded w-1/4 mb-4" />
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/10 rounded-lg" />
                                <div className="flex-1">
                                    <div className="h-4 bg-white/10 rounded w-1/2 mb-1" />
                                    <div className="h-3 bg-white/10 rounded w-1/3" />
                                </div>
                                <div className="h-4 bg-white/10 rounded w-16" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="py-6">
                <div className="card p-6 text-center">
                    <p className="text-red-400 mb-4">Failed to load dashboard</p>
                    <p className="text-sm text-surface-400">{error}</p>
                </div>
            </div>
        )
    }

    const momChange = summary?.month_over_month_change || 0
    const isUp = momChange >= 0

    return (
        <div className="py-6 space-y-6">
            {/* Top Tile: Total Spend + Pie Chart + Comparison */}
            <div className="card-glow p-6">
                {/* Month Label */}
                <p className="text-sm font-medium text-purple-300/80 mb-1">
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>

                {/* Total Spent */}
                <div className="flex items-baseline gap-3 mb-6">
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                        {formatCurrency(summary?.current_month_total)}
                    </h2>

                    {/* Change indicator */}
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isUp
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                        <svg
                            className={`w-3 h-3 ${isUp ? '' : 'rotate-180'}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                        >
                            <polyline points="18 15 12 9 6 15" />
                        </svg>
                        <span>{Math.abs(momChange).toFixed(0)}%</span>
                    </div>
                </div>

                {/* Comparison Text */}
                <p className="text-sm text-white/50 mb-6">
                    <span className="text-white/70">{summary?.current_month_count || 0}</span> receipts
                    <span className="mx-2">•</span>
                    Last month: {formatCurrency(summary?.previous_month_total)}
                </p>

                {/* Category Pie Chart - inline */}
                <CategoryPie data={summary?.category_breakdown} compact />
            </div>

            {/* Bottom Tile: Recent Receipts Stream */}
            <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Recent</h3>
                    <Link
                        to="/receipts"
                        className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    >
                        View all →
                    </Link>
                </div>

                {receiptsLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <div className="w-10 h-10 bg-white/10 rounded-lg" />
                                <div className="flex-1">
                                    <div className="h-4 bg-white/10 rounded w-1/2 mb-1" />
                                    <div className="h-3 bg-white/10 rounded w-1/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : recentReceipts.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-white/40 text-sm">No receipts yet</p>
                        <Link to="/capture" className="btn-primary mt-4 inline-block text-sm px-4 py-2">
                            Capture Receipt
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recentReceipts.map((receipt) => (
                            <Link
                                key={receipt.id}
                                to={`/receipts/${receipt.id}`}
                                className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-white/5 transition-colors group"
                            >
                                {/* Category Icon */}
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/10 flex items-center justify-center text-lg">
                                    {receipt.category_icon || '🧾'}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                                        {receipt.vendor_name || 'Unknown'}
                                    </p>
                                    <p className="text-xs text-white/40">
                                        {new Date(receipt.date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>

                                {/* Amount */}
                                <p className="text-sm font-semibold text-white">
                                    {formatCurrency(receipt.total)}
                                </p>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
