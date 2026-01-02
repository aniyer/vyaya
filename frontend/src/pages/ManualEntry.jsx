import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReceiptForm from '../components/ReceiptForm'
import { receiptsApi } from '../api/client'

export default function ManualEntry() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleSubmit = async (data) => {
        setLoading(true)
        setError(null)
        try {
            const newReceipt = await receiptsApi.create(data)
            navigate(`/receipts/${newReceipt.id}`)
        } catch (err) {
            console.error('Failed to create receipt:', err)
            setError('Failed to create receipt. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 text-surface-400 hover:text-white transition-colors"
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 className="text-2xl font-bold text-white">Manual Entry</h1>
            </header>

            <div className="card p-6">
                {error && (
                    <div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-6 text-sm">
                        {error}
                    </div>
                )}

                <ReceiptForm onSubmit={handleSubmit} loading={loading} />
            </div>
        </div>
    )
}
