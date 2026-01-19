import { useDashboard } from '../hooks/useReceipts'
import { useOfflineMode } from '../context/OfflineModeContext'
import CategoryPie from '../components/charts/CategoryPie'
import SpendingTrend from '../components/charts/SpendingTrend'

export default function Dashboard() {
    const { offlineMode } = useOfflineMode()
    const { summary, trends, loading, error } = useDashboard()

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
                        Dashboard data is unavailable while offline. Go online to view your spending.
                    </p>
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
                <p className="text-sm font-semibold text-amber-600 uppercase tracking-wide mb-1">
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>

                {/* Total Spent */}
                <div className="flex items-baseline gap-3 mb-6">
                    <h2 className="text-4xl font-bold text-white">
                        {formatCurrency(summary?.current_month_total)}
                    </h2>

                    {/* Change indicator */}
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${isUp
                        ? 'bg-red-900/50 text-red-400'
                        : 'bg-emerald-900/50 text-emerald-400'
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

            {/* Bottom Tile: Historical Trend */}
            <SpendingTrend data={trends?.monthly_data} />
        </div>
    )
}
