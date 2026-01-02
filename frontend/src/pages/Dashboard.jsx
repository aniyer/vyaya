import { useDashboard } from '../hooks/useReceipts'
import SpendingTrend from '../components/charts/SpendingTrend'
import CategoryPie from '../components/charts/CategoryPie'

export default function Dashboard() {
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
            <div className="py-8 space-y-4">
                <div className="card p-6 animate-pulse">
                    <div className="h-8 bg-surface-700 rounded w-1/2 mb-4" />
                    <div className="h-12 bg-surface-700 rounded w-3/4" />
                </div>
                <div className="card p-6 h-48 animate-pulse">
                    <div className="h-4 bg-surface-700 rounded w-1/3 mb-4" />
                    <div className="h-32 bg-surface-700 rounded" />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="py-8">
                <div className="card p-6 text-center">
                    <p className="text-red-400 mb-4">Failed to load dashboard</p>
                    <p className="text-sm text-surface-400">{error}</p>
                </div>
            </div>
        )
    }

    const momChange = summary?.month_over_month_change || 0
    const isPositive = momChange >= 0

    return (
        <div className="py-6 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white mb-1">Dashboard</h2>
            </div>

            {/* Main Content */}
            <div className="space-y-8">
                {/* This Month Section */}
                <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-white px-1">This Month</h3>

                    {/* Summary Card */}
                    <div className="card p-6 bg-gradient-to-br from-primary-500/10 to-primary-600/5">
                        <p className="text-sm font-medium text-surface-400 mb-2">Total Spent</p>
                        <p className="text-4xl font-bold text-white mb-4">
                            {formatCurrency(summary?.current_month_total)}
                        </p>

                        <div className="flex items-center gap-4">
                            <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-red-400' : 'text-green-400'}`}>
                                <svg
                                    className={`w-4 h-4 ${isPositive ? '' : 'rotate-180'}`}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <polyline points="18 15 12 9 6 15" />
                                </svg>
                                <span className="font-medium">
                                    {Math.abs(momChange).toFixed(1)}%
                                </span>
                            </div>
                            <span className="text-sm text-surface-500">
                                vs last month ({formatCurrency(summary?.previous_month_total)})
                            </span>
                        </div>

                        <div className="mt-4 pt-4 border-t border-surface-700/50">
                            <p className="text-sm text-surface-400">
                                <span className="text-white font-medium">{summary?.current_month_count || 0}</span> receipts this month
                            </p>
                        </div>
                    </div>

                    <CategoryPie data={summary?.category_breakdown} />
                </section>

                {/* Divider */}
                <div className="border-t border-surface-800 my-8"></div>

                {/* Trends Section */}
                <section className="space-y-4">
                    <h3 className="text-lg font-semibold text-white px-1">Trends</h3>
                    <SpendingTrend data={trends?.monthly_data} />
                </section>
            </div>


        </div>
    )
}
