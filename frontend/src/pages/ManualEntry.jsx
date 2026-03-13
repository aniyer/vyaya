import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReceiptForm from '../components/ReceiptForm'
import { useReceiptUpload } from '../hooks/useReceiptUpload'

export default function ManualEntry() {
    const navigate = useNavigate()
    const { uploadManual, uploading, error: uploadError, savedOffline } = useReceiptUpload()

    const handleSubmit = async (data) => {
        const result = await uploadManual(data)

        if (result.success) {
            if (result.offline) {
                navigate('/receipts')
            } else {
                navigate(`/receipts/${result.receipt.id}`)
            }
        }
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-surface-300 hover:text-white transition-colors">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                </button>
                <h1 className="text-2xl font-bold text-white">Manual Entry</h1>
            </header>

            <div className="card p-6">
                {uploadError && (
                    <div className="bg-red-500/10 text-red-400 p-4 rounded-lg mb-6 text-sm border border-red-500/20">{uploadError}</div>
                )}

                {savedOffline && (
                    <div className="bg-primary-400/10 text-primary-400 p-4 rounded-lg mb-6 text-sm flex items-center gap-2 border border-primary-400/20">
                        <span>📥</span> Saved to offline queue
                    </div>
                )}

                <ReceiptForm onSubmit={handleSubmit} loading={uploading} />
            </div>
        </div>
    )
}
