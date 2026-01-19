import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useReceipt } from '../hooks/useReceipts'
import ReceiptForm from '../components/ReceiptForm'
import { receiptsApi } from '../api/client'

export default function ReceiptDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { receipt, loading, error, refetch } = useReceipt(id)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)


    // Poll for updates while processing

    // Poll for updates while processing
    useEffect(() => {
        // Pausing polling when delete confirmation is shown to prevent modal from closing
        if (receipt?.status === 'processing' && !showDeleteConfirm) {
            const timer = setInterval(() => {
                refetch({ background: true })
            }, 5000)
            return () => clearInterval(timer)
        }
    }, [receipt?.status, refetch, showDeleteConfirm])



    const handleSave = async (data) => {
        setSaving(true)
        try {
            await receiptsApi.update(id, data)
            await refetch()
            setEditing(false)
        } catch (err) {
            console.error('Failed to save:', err)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await receiptsApi.delete(id)
            navigate('/receipts')
        } catch (err) {
            console.error('Failed to delete:', err)
        } finally {
            setDeleting(false)
        }
    }

    const formatAmount = (amt, curr = 'USD') => {
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: curr,
            }).format(amt || 0)
        } catch (e) {
            // Fallback for invalid currency codes (e.g. symbols like '₹')
            return `${curr} ${amt || 0}`
        }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Unknown'
        // Create date object treating yyyy-mm-dd as local date
        const [year, month, day] = dateStr.split('-')
        return format(new Date(year, month - 1, day), 'MMMM d, yyyy')
    }

    if (loading) {
        return (
            <div className="py-6 space-y-4">
                <div className="h-64 bg-surface-800 rounded-2xl animate-pulse" />
                <div className="card p-4 animate-pulse">
                    <div className="h-6 bg-surface-700 rounded w-1/2 mb-4" />
                    <div className="h-4 bg-surface-700 rounded w-1/3 mb-2" />
                    <div className="h-4 bg-surface-700 rounded w-1/4" />
                </div>
            </div>
        )
    }

    if (error || !receipt) {
        return (
            <div className="py-6">
                <div className="card p-6 text-center">
                    <p className="text-red-400 mb-4">Receipt not found</p>
                    <Link to="/receipts" className="btn-primary">
                        Back to Receipts
                    </Link>
                </div>
            </div>
        )
    }


    const deleteModal = showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="card p-6 max-w-sm w-full animate-fade-in">
                <h3 className="text-lg font-bold text-white mb-2">Delete Receipt?</h3>
                <p className="text-surface-400 mb-6">
                    This action cannot be undone. The receipt and its image will be permanently deleted.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="btn-secondary flex-1"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
                    >
                        {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    )

    if (receipt.status === 'processing') {
        return (
            <div className="py-6 space-y-6">
                <Link
                    to="/receipts"
                    className="inline-flex items-center gap-2 text-surface-400 hover:text-white transition-colors"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Back to receipts
                </Link>

                <div className="card p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full border-4 border-amber-600 border-t-transparent animate-spin" />
                    <h2 className="text-2xl font-bold text-white mb-2">Processing Receipt</h2>
                    <p className="text-surface-400 mb-6">
                        AI is analyzing the image and extracting details...
                    </p>
                    <div className="card bg-surface-800 p-4 max-w-sm mx-auto mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-lg bg-surface-700 overflow-hidden">
                                <img
                                    src={receiptsApi.getImageUrl(id)}
                                    alt="Receipt"
                                    className="w-full h-full object-cover opacity-50"
                                />
                            </div>
                            <div className="text-left">
                                <div className="h-4 bg-surface-700 rounded w-24 mb-2 animate-pulse" />
                                <div className="h-3 bg-surface-700 rounded w-16 animate-pulse" />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                    >
                        Delete Receipt
                    </button>
                </div>

                {deleteModal}
            </div>
        )
    }


    return (
        <div className="py-6 space-y-4">
            {/* Back button */}
            <Link
                to="/receipts"
                className="inline-flex items-center gap-2 text-surface-400 hover:text-white transition-colors"
            >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                Back to receipts
            </Link>

            {/* Receipt Media - Image or Audio */}
            {receipt.image_path && receipt.image_path !== 'manual_entry' && (
                <div className="card overflow-hidden bg-black/40 backdrop-blur-sm flex items-center justify-center min-h-[200px]">
                    {['webm', 'wav', 'mp3', 'm4a', 'ogg'].includes(receipt.image_path.split('.').pop().toLowerCase()) ? (
                        <div className="w-full p-8 flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center animate-pulse">
                                <svg className="w-8 h-8 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                    <line x1="12" y1="19" x2="12" y2="23" />
                                    <line x1="8" y1="23" x2="16" y2="23" />
                                </svg>
                            </div>
                            <audio
                                controls
                                className="w-full max-w-md"
                                src={receiptsApi.getImageUrl(id)}
                            />
                            <p className="text-sm text-white/50">Audio Note</p>
                        </div>
                    ) : (
                        <img
                            src={receiptsApi.getImageUrl(id)}
                            alt="Receipt"
                            className="w-full max-h-96 object-contain"
                        />
                    )}
                </div>
            )}

            {/* Receipt details or edit form */}
            {editing ? (
                <div className="card p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-white">Edit Receipt</h3>
                        <button
                            onClick={() => setEditing(false)}
                            className="text-surface-400 hover:text-white"
                        >
                            Cancel
                        </button>
                    </div>
                    <ReceiptForm receipt={receipt} onSubmit={handleSave} loading={saving} />
                </div>
            ) : (
                <div className="card p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {receipt.category && (
                                <span className="text-2xl">{receipt.category.icon}</span>
                            )}
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    {receipt.vendor || 'Unknown Vendor'}
                                </h2>
                                {receipt.category && (
                                    <span
                                        className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full"
                                        style={{ backgroundColor: receipt.category.color + '20', color: receipt.category.color }}
                                    >
                                        {receipt.category.name}
                                    </span>
                                )}
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-white">
                            {formatAmount(receipt.amount, receipt.currency)}
                        </p>
                    </div>

                    {/* Details */}
                    <div className="space-y-3 py-4 border-t border-surface-700">
                        <div className="flex justify-between text-sm">
                            <span className="text-surface-400">Date</span>
                            <span className="text-white">
                                {formatDate(receipt.transaction_date)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-surface-400">Currency</span>
                            <span className="text-white">{receipt.currency}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-surface-400">Added</span>
                            <span className="text-white">
                                {format(new Date(receipt.created_at), 'MMM d, yyyy h:mm a')}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-surface-700">
                        <button onClick={() => setEditing(true)} className="btn-primary flex-1">
                            Edit
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="btn-secondary text-red-400 hover:text-red-300 hover:border-red-500/50"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            )}

            {/* Raw OCR text (collapsible) - Conditional */}
            {(!receipt.image_path || receipt.image_path === 'manual_entry') && receipt.raw_ocr_text && (
                <details className="card">
                    <summary className="p-4 cursor-pointer text-surface-400 hover:text-white transition-colors">
                        View Raw AI Result
                    </summary>
                    <div className="px-4 pb-4">
                        <pre className="text-xs text-surface-300 whitespace-pre-wrap bg-surface-900 p-3 rounded-lg overflow-auto max-h-48">
                            {receipt.raw_ocr_text}
                        </pre>
                    </div>
                </details>
            )}

            {/* Delete confirmation modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="card p-6 max-w-sm w-full animate-fade-in">
                        <h3 className="text-lg font-bold text-white mb-2">Delete Receipt?</h3>
                        <p className="text-surface-400 mb-6">
                            This action cannot be undone. The receipt and its image will be permanently deleted.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
