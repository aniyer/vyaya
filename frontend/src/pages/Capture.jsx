import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Camera from '../components/Camera'
import { receiptsApi } from '../api/client'

export default function Capture() {
    const navigate = useNavigate()
    const [uploading, setUploading] = useState(false)
    const [uploadResult, setUploadResult] = useState(null)
    const [error, setError] = useState(null)
    const [saving, setSaving] = useState(false)

    const handleCapture = async (file) => {
        setUploading(true)
        setError(null)

        try {
            const result = await receiptsApi.upload(file)
            // Redirect immediately to detail page which handles polling
            navigate(`/receipts/${result.receipt.id}`)
        } catch (err) {
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
            {uploading && (
                <div className="card p-6 text-center mt-6">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                    <p className="text-white font-medium mb-1">Uploading Receipt</p>
                    <p className="text-sm text-surface-400">Please wait...</p>
                </div>
            )}
        </div>
    )
}
