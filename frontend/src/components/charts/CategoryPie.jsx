import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

export default function CategoryPie({ data, compact = false }) {
    if (!data || data.length === 0) {
        return compact ? null : (
            <div className="card p-6 text-center">
                <p className="text-surface-400">No category data available</p>
            </div>
        )
    }

    // Filter categories with spending
    const chartData = data.filter((cat) => cat.total > 0)


    if (chartData.length === 0) {
        return compact ? null : (
            <div className="card p-6 text-center">
                <p className="text-surface-400">No spending this month</p>
            </div>
        )
    }

    const total = chartData.reduce((sum, cat) => sum + cat.total, 0)

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload
            const percentage = ((data.total / total) * 100).toFixed(1)
            return (
                <div className="bg-surface-800 border border-surface-700 rounded-lg p-3 shadow-xl">
                    <p className="flex items-center gap-2 text-sm font-medium text-white mb-1">
                        <span>{data.icon}</span>
                        {data.category_name}
                    </p>
                    <p className="text-lg font-bold" style={{ color: data.color }}>
                        ${data.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-surface-400">{percentage}% of total</p>
                </div>
            )
        }
        return null
    }

    const content = (
        <>
            {!compact && <h3 className="text-sm font-medium text-surface-400 mb-4">By Category</h3>}

            <div className="flex items-center gap-4">
                {/* Pie Chart */}
                <div className={compact ? "w-24 h-24 flex-shrink-0" : "w-32 h-32 flex-shrink-0"}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={compact ? 20 : 30}
                                outerRadius={compact ? 38 : 50}
                                paddingAngle={2}
                                dataKey="total"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-2 overflow-hidden">
                    {chartData.slice(0, compact ? 4 : 5).map((cat, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                            <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: cat.color }}
                            />
                            <span className={compact ? "truncate text-white/70 text-xs" : "truncate text-surface-300"}>
                                {cat.icon} {cat.category_name}
                            </span>
                            <span className={compact ? "ml-auto font-medium text-white text-xs flex-shrink-0" : "ml-auto font-medium text-white flex-shrink-0"}>
                                ${cat.total.toFixed(0)}
                            </span>
                        </div>
                    ))}
                    {chartData.length > (compact ? 4 : 5) && (
                        <p className="text-xs text-surface-500">
                            +{chartData.length - (compact ? 4 : 5)} more
                        </p>
                    )}
                </div>
            </div>
        </>
    )

    if (compact) {
        return content
    }

    return (
        <div className="card p-4">
            {content}
        </div>
    )
}
