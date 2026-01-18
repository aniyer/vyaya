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
                <p className="text-neutral-500">No spending data available</p>
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
                <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3">
                    <p className="text-sm font-semibold text-white mb-1">{data.fullName}</p>
                    <p className="text-lg font-bold text-amber-500">
                        ${data.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-neutral-500">{data.count} receipts</p>
                </div>
            )
        }
        return null
    }

    return (
        <div className="card p-4">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-4">Spending Trend</h3>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#737373', fontSize: 12, fontWeight: 500 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#737373', fontSize: 12 }}
                            tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(212, 165, 116, 0.1)' }} />
                        <Bar
                            dataKey="total"
                            fill="#D4A574"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

