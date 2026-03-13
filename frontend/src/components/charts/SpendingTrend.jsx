import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'

export default function SpendingTrend({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="card p-6 text-center">
                <p className="text-surface-300">No spending data available</p>
            </div>
        )
    }

    // Transform data for chart
    const chartData = data.map((item) => ({
        name: format(new Date(item.year, item.month - 1), 'MMM'),
        fullName: format(new Date(item.year, item.month - 1), 'MMMM yyyy'),
        total: item.total,
        count: item.count,
    }))

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload
            return (
                <div className="bg-surface-800 border border-primary-400/20 rounded-lg p-3 backdrop-blur-xl">
                    <p className="text-sm font-semibold text-white mb-1">{data.fullName}</p>
                    <p className="text-lg font-bold text-primary-400">
                        ${data.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-surface-300">{data.count} receipts</p>
                </div>
            )
        }
        return null
    }

    return (
        <div className="card p-4">
            <h3 className="text-sm font-semibold text-surface-300 uppercase tracking-wide mb-4">Spending Trend</h3>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        {/* Gradient definition for glass effect */}
                        <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#D4A574" stopOpacity={0.9} />
                                <stop offset="50%" stopColor="#C9A961" stopOpacity={0.6} />
                                <stop offset="100%" stopColor="#8B7355" stopOpacity={0.3} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" vertical={false} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#D4A574', fontSize: 12, fontWeight: 500 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#D4A574', fontSize: 12 }}
                            tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(212, 165, 116, 0.05)' }} />
                        <Bar
                            dataKey="total"
                            fill="url(#barGradient)"
                            radius={[8, 8, 0, 0]}
                            maxBarSize={40}
                            stroke="rgba(212, 165, 116, 0.3)"
                            strokeWidth={1}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
