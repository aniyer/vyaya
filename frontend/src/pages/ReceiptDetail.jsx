import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useReceipt } from '../hooks/useReceipts'
import ReceiptForm from '../components/ReceiptForm'
import AudioPlayer from '../components/AudioPlayer'
import { receiptsApi } from '../api/client'
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

export default function ReceiptDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { receipt, loading, error, refetch } = useReceipt(id)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isZoomed, setIsZoomed] = useState(false)

    useEffect(() => {
        if (receipt?.status === 'processing' && !showDeleteConfirm) {
            const timer = setInterval(() => refetch({ background: true }), 5000)
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
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(amt || 0)
        } catch (e) {
            return `${curr} ${amt || 0}`
        }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Unknown'
        const [year, month, day] = dateStr.split('-')
        return format(new Date(year, month - 1, day), 'MMMM d, yyyy')
    }

    if (loading) {
        return (
            <div className="py-6 space-y-4">
                <div className="h-64 bg-surface-700/50 rounded-2xl animate-pulse" />
                <div className="card p-4 animate-pulse">
                    <div className="h-6 bg-surface-700/50 rounded w-1/2 mb-4" />
                    <div className="h-4 bg-surface-700/50 rounded w-1/3 mb-2" />
                    <div className="h-4 bg-surface-700/50 rounded w-1/4" />
                </div>
            </div>
        )
    }

    if (error || !receipt) {
        return (
            <div className="py-6">
                <div className="card p-6 text-center">
                    <p className="text-red-400 mb-4">Receipt not found</p>
                    <Link to="/receipts" className="btn-primary">Back to Receipts</Link>
                </div>
            </div>
        )
    }

    const deleteModal = showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="card p-6 max-w-sm w-full animate-fade-in">
                <h3 className="text-lg font-bold text-white mb-2">Delete Receipt?</h3>
                <p className="text-surface-300 mb-6">This action cannot be undone.</p>
                <div className="flex gap-3">
                    <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1">Cancel</button>
                    <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium px-6 py-3 rounded-xl transition-colors disabled:opacity-50">
                        {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    )

    if (receipt.status === 'processing') {
        return (
            <div className="py-6 space-y-6">
                <Link to="/receipts" className="inline-flex items-center gap-2 text-surface-300 hover:text-white transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                    Back to receipts
                </Link>

                <div className="card p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full border-4 border-primary-400 border-t-transparent animate-spin" />
                    <h2 className="text-2xl font-bold text-white mb-2">Processing Receipt</h2>
                    <p className="text-surface-300 mb-6">AI is analyzing the image...</p>
                    <button onClick={() => setShowDeleteConfirm(true)} className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors">Delete Receipt</button>
                </div>
                {deleteModal}
            </div>
        )
    }

    return (
        <div className="py-6 space-y-4">
            <Link to="/receipts" className="inline-flex items-center gap-2 text-surface-300 hover:text-white transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                Back to receipts
            </Link>

            {receipt.image_path && receipt.image_path !== 'manual_entry' && (
                <>
                    <div
                        className="card overflow-hidden bg-surface-800/40 backdrop-blur-sm flex items-center justify-center min-h-[200px] relative group cursor-zoom-in"
                        onClick={() => {
                            if (!['webm', 'wav', 'mp3', 'm4a', 'ogg'].includes(receipt.image_path.split('.').pop().toLowerCase())) {
                                setIsZoomed(true)
                            }
                        }}
                    >
                        {['webm', 'wav', 'mp3', 'm4a', 'ogg'].includes(receipt.image_path.split('.').pop().toLowerCase()) ? (
                            <div className="w-full p-8 flex flex-col items-center gap-6 cursor-default" onClick={(e) => e.stopPropagation()}>
                                <div className="w-20 h-20 rounded-full bg-primary-400/20 flex items-center justify-center">
                                    <svg className="w-10 h-10 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                        <line x1="12" y1="19" x2="12" y2="23" />
                                        <line x1="8" y1="23" x2="16" y2="23" />
                                    </svg>
                                </div>
                                <AudioPlayer src={receiptsApi.getImageUrl(id)} />
                                <p className="text-sm text-white/50">Audio Note</p>
                            </div>
                        ) : (
                            <>
                                <img src={receiptsApi.getImageUrl(id)} alt="Receipt" className="w-full max-h-96 object-contain" />
                                <div className="absolute bottom-4 right-4 p-2 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <polyline points="9 21 3 21 3 15"></polyline>
                                        <line x1="21" y1="3" x2="14" y2="10"></line>
                                        <line x1="3" y1="21" x2="10" y2="14"></line>
                                    </svg>
                                </div>
                            </>
                        )}
                    </div>

                    {isZoomed && createPortal(
                        <div
                            className="fixed inset-0 z-[9999] bg-black animate-fade-in flex items-center justify-center"
                        >
                            <TransformWrapper
                                defaultScale={1}
                                defaultPositionX={0}
                                defaultPositionY={0}
                            >
                                {({ zoomIn, zoomOut, resetTransform, ...rest }) => (
                                    <>
                                        <div className="w-full h-full flex items-center justify-center overflow-hidden">
                                            <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center cursor-grab active:cursor-grabbing">
                                                <img
                                                    src={receiptsApi.getImageUrl(id)}
                                                    alt="Receipt Zoomed"
                                                    className="max-h-screen object-contain max-w-none"
                                                />
                                            </TransformComponent>
                                        </div>
                                        {/* Close Button */}
                                        <button
                                            className="fixed top-6 right-6 p-3 bg-black/50 text-white rounded-full backdrop-blur-md border border-white/10 shadow-xl z-50 transition-colors hover:bg-black/70"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsZoomed(false);
                                            }}
                                        >
                                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>

                                        {/* Zoom Controls */}
                                        <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
                                            <button
                                                className="p-3 bg-black/50 text-white rounded-full backdrop-blur-md border border-white/10 shadow-xl transition-colors hover:bg-black/70"
                                                onClick={() => zoomIn()}
                                            >
                                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <line x1="12" y1="5" x2="12" y2="19" />
                                                    <line x1="5" y1="12" x2="19" y2="12" />
                                                </svg>
                                            </button>
                                            <button
                                                className="p-3 bg-black/50 text-white rounded-full backdrop-blur-md border border-white/10 shadow-xl transition-colors hover:bg-black/70"
                                                onClick={() => zoomOut()}
                                            >
                                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <line x1="5" y1="12" x2="19" y2="12" />
                                                </svg>
                                            </button>
                                            <button
                                                className="p-3 bg-black/50 text-white rounded-full backdrop-blur-md border border-white/10 shadow-xl transition-colors hover:bg-black/70"
                                                onClick={() => resetTransform()}
                                            >
                                                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="23 4 23 10 17 10" />
                                                    <polyline points="1 20 1 14 7 14" />
                                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                                                </svg>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </TransformWrapper>
                        </div>,
                        document.body
                    )}
                </>
            )}

            {editing ? (
                <div className="card p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-white">Edit Receipt</h3>
                        <button onClick={() => setEditing(false)} className="text-surface-300 hover:text-white">Cancel</button>
                    </div>
                    <ReceiptForm receipt={receipt} onSubmit={handleSave} loading={saving} />
                </div>
            ) : (
                <div className="card p-4">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {receipt.category && <span className="text-2xl">{receipt.category.icon}</span>}
                            <div>
                                <h2 className="text-xl font-bold text-white">{receipt.vendor || 'Unknown Vendor'}</h2>
                                {receipt.category && (
                                    <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full" style={{ backgroundColor: receipt.category.color + '20', color: receipt.category.color }}>
                                        {receipt.category.name}
                                    </span>
                                )}
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-white">{formatAmount(receipt.amount, receipt.currency)}</p>
                    </div>

                    <div className="space-y-3 py-4 border-t border-surface-700">
                        <div className="flex justify-between text-sm">
                            <span className="text-surface-300">Date</span>
                            <span className="text-white">{formatDate(receipt.transaction_date)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-surface-300">Currency</span>
                            <span className="text-white">{receipt.currency}</span>
                        </div>
                        {receipt.currency && receipt.currency !== 'USD' && receipt.amount_usd && (
                            <div className="flex justify-between text-sm">
                                <span className="text-surface-300">USD Equivalent</span>
                                <span className="text-emerald-400 font-medium">{formatAmount(receipt.amount_usd, 'USD')}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm">
                            <span className="text-surface-300">Added</span>
                            <span className="text-white">{format(new Date(receipt.created_at), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-surface-700">
                        <button onClick={() => setEditing(true)} className="btn-primary flex-1">Edit</button>
                        <button onClick={() => setShowDeleteConfirm(true)} className="btn-secondary text-red-400 hover:text-red-300 hover:border-red-500/50">Delete</button>
                    </div>
                </div>
            )}

            {showDeleteConfirm && deleteModal}
        </div>
    )
}
