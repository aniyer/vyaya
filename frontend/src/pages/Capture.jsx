import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Camera from '../components/Camera'
import { receiptsApi } from '../api/client'
import { saveReceipt, isOnline } from '../services/OfflineStorage'

export default function Capture() {
    const navigate = useNavigate()
    const [uploading, setUploading] = useState(false)
    const [uploadResult, setUploadResult] = useState(null)
    const [error, setError] = useState(null)
    const [saving, setSaving] = useState(false)
    const [savedOffline, setSavedOffline] = useState(false)

    const handleCapture = async (file) => {
        setUploading(true)
        setError(null)
        setSavedOffline(false)

        // If offline, save locally immediately
        if (!isOnline()) {
            try {
                await saveReceipt(file)
                setSavedOffline(true)
                setUploading(false)
                // Navigate to receipts after a brief delay to show success
                setTimeout(() => navigate('/receipts'), 1500)
                return
            } catch (err) {
                setError('Failed to save offline: ' + err.message)
                setUploading(false)
                return
            }
        }

        // Online: try to upload
        try {
            const result = await receiptsApi.upload(file)
            // Redirect immediately to detail page which handles polling
            navigate(`/receipts/${result.receipt.id}`)
        } catch (err) {
            // Check if it's a network error - save offline as fallback
            if (!navigator.onLine || err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
                try {
                    await saveReceipt(file)
                    setSavedOffline(true)
                    setUploading(false)
                    setTimeout(() => navigate('/receipts'), 1500)
                    return
                } catch (offlineErr) {
                    setError('Failed to save offline: ' + offlineErr.message)
                    setUploading(false)
                    return
                }
            }
            setError(err.response?.data?.detail || err.message || 'Upload failed')
            setUploading(false)
        }
    }


    const handleSkip = () => {
        if (uploadResult?.receipt?.id) {
            navigate(`/receipts/${uploadResult.receipt.id}`)
        }
    }

    const startNew = () => {
        setUploadResult(null)
        setError(null)
    }

    return (
        <div className="py-6 space-y-6">
            {/* Header */}
            <div className="flex justify-end p-2">
                <button
                    onClick={() => navigate('/manual')}
                    className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-medium hover:bg-white/20 transition-colors"
                >
                    Enter Manually
                </button>
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white mb-1">Capture Receipt</h2>
                <p className="text-surface-400">
                    {uploadResult ? 'Review extracted data' : 'Take a photo or upload an image'}
                </p>
            </div>

            {/* Error display */}
            {error && (
                <div className="card p-4 bg-red-500/10 border-red-500/50">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {/* Main content */}
            <Camera onCapture={handleCapture} disabled={uploading} />

            {/* Processing indicator */}
            {uploading && !savedOffline && (
                <div className="card p-6 text-center mt-6">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                    <p className="text-white font-medium mb-1">Uploading Receipt</p>
                    <p className="text-sm text-surface-400">Please wait...</p>
                </div>
            )}

            {/* Offline save success */}
            {savedOffline && (
                <div className="card p-6 text-center mt-6 bg-amber-500/10 border-amber-500/50">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <p className="text-amber-400 font-medium mb-1">Saved to Queue (Offline)</p>
                    <p className="text-sm text-surface-400">Will be uploaded when back online</p>
                </div>
            )}
        </div>
    )
}
