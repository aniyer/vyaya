import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReceiptForm from '../components/ReceiptForm'
import { useReceiptUpload } from '../hooks/useReceiptUpload'

export default function ManualEntry() {
    const navigate = useNavigate()
    const { uploadManual, uploading, error: uploadError, savedOffline } = useReceiptUpload()

    // Local error state if hook error doesn't cover it or we want to show it differently
    // But hook handles error state mostly.

    const handleSubmit = async (data) => {
        const result = await uploadManual(data)

        if (result.success) {
            if (result.offline) {
                // Stay on page and show success message, or navigate back?
                // Probably navigate to receipts list or show a toast.
                // For now, let's navigate to receipts so they can see the pending item?
                // Or maybe the hook handles navigation? No, hook returns result.
                navigate('/receipts')
            } else {
                navigate(`/receipts/${result.receipt.id}`)
            }
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
                {uploadError && (
                    <div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-6 text-sm">
                        {uploadError}
                    </div>
                )}

                {savedOffline && (
                    <div className="bg-amber-500/10 text-amber-500 p-4 rounded-lg mb-6 text-sm flex items-center gap-2">
                        <span>📥</span> Saved to offline queue
                    </div>
                )}

                <ReceiptForm onSubmit={handleSubmit} loading={uploading} />
            </div>
        </div>
    )
}
