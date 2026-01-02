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
                <p className="text-surface-400">No spending data available</p>
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
                <div className="bg-surface-800 border border-surface-700 rounded-lg p-3 shadow-xl">
                    <p className="text-sm font-medium text-white mb-1">{data.fullName}</p>
                    <p className="text-lg font-bold text-primary-400">
                        ${data.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-surface-400">{data.count} receipts</p>
                </div>
            )
        }
        return null
    }

    return (
        <div className="card p-4">
            <h3 className="text-sm font-medium text-surface-400 mb-4">Spending Trend</h3>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }} />
                        <Bar
                            dataKey="total"
                            fill="url(#colorGradient)"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                        />
                        <defs>
                            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#818cf8" />
                                <stop offset="100%" stopColor="#6366f1" />
                            </linearGradient>
                        </defs>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
