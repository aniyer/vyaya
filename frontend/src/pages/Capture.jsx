import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { receiptsApi } from '../api/client'
import { saveReceipt, isOnline, getQueue, syncQueue } from '../services/OfflineStorage'
import { useOfflineMode } from '../context/OfflineModeContext'

export default function Capture() {
    const navigate = useNavigate()
    const { offlineMode } = useOfflineMode()
    const [mode, setMode] = useState('capture') // 'capture' or 'manual'
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState(null)
    const [savedOffline, setSavedOffline] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [isMobile, setIsMobile] = useState(false)

    // Manual entry state
    const [vendor, setVendor] = useState('')
    const [total, setTotal] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [category, setCategory] = useState('other')
    const [manualLoading, setManualLoading] = useState(false)

    // Pending receipts state
    const [pendingReceipts, setPendingReceipts] = useState([])
    const [syncing, setSyncing] = useState(false)

    const fileInputRef = useRef(null)
    const cameraInputRef = useRef(null)

    useEffect(() => {
        const checkMobile = () => {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera
            const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
            setIsMobile(mobileRegex.test(userAgent.toLowerCase()))
        }
        checkMobile()
    }, [])

    // Load pending receipts
    const loadPendingReceipts = useCallback(async () => {
        const queue = await getQueue()
        setPendingReceipts(queue)
    }, [])

    useEffect(() => {
        loadPendingReceipts()
    }, [loadPendingReceipts])

    // Sync pending receipts
    const handleSync = async () => {
        if (syncing || pendingReceipts.length === 0) return
        setSyncing(true)
        try {
            await syncQueue()
            await loadPendingReceipts()
        } catch (err) {
            setError('Sync failed: ' + err.message)
        } finally {
            setSyncing(false)
        }
    }

    const handleFileSelect = async (file) => {
        if (!file) return

        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
        if (!validTypes.includes(file.type)) {
            setError('Please select a valid image (JPEG, PNG, WebP, or HEIC)')
            return
        }

        setUploading(true)
        setError(null)
        setSavedOffline(false)

        if (offlineMode || !isOnline()) {
            try {
                await saveReceipt(file)
                setSavedOffline(true)
                setUploading(false)
                // Refresh pending list to show newly queued receipt
                await loadPendingReceipts()
                // Clear the success message after a few seconds
                setTimeout(() => setSavedOffline(false), 3000)
                return
            } catch (err) {
                setError('Failed to save offline: ' + err.message)
                setUploading(false)
                return
            }
        }

        try {
            console.log('Attempting upload to backend...')
            const result = await receiptsApi.upload(file)
            console.log('Upload successful:', result)
            navigate(`/receipts/${result.receipt.id}`)
        } catch (err) {
            // On ANY upload failure, save locally as fallback
            console.error('Upload failed:', {
                message: err.message,
                code: err.code,
                response: err.response?.status,
                data: err.response?.data,
            })
            console.log('Saving to offline queue...')
            try {
                await saveReceipt(file)
                console.log('Saved to offline queue successfully')
                setSavedOffline(true)
                setUploading(false)
                // Refresh pending list to show newly queued receipt
                await loadPendingReceipts()
                // Clear the success message after a few seconds
                setTimeout(() => setSavedOffline(false), 3000)
                return
            } catch (offlineErr) {
                console.error('Failed to save offline:', offlineErr)
                setError('Failed to save: ' + offlineErr.message)
                setUploading(false)
                return
            }
        }
    }

    const handleInputChange = (e) => {
        const file = e.target.files?.[0]
        handleFileSelect(file)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files?.[0]
        handleFileSelect(file)
    }

    const handleManualSubmit = async (e) => {
        e.preventDefault()
        if (!vendor.trim() || !total) {
            setError('Please fill in vendor and total')
            return
        }

        setManualLoading(true)
        setError(null)

        try {
            const newReceipt = await receiptsApi.create({
                vendor_name: vendor.trim(),
                total: parseFloat(total),
                date: date,
                category: category,
            })
            navigate(`/receipts/${newReceipt.id}`)
        } catch (err) {
            setError('Failed to create receipt')
            setManualLoading(false)
        }
    }

    const categories = [
        { value: 'groceries', label: '🛒 Groceries' },
        { value: 'dining', label: '🍽️ Dining' },
        { value: 'transport', label: '🚗 Transport' },
        { value: 'shopping', label: '🛍️ Shopping' },
        { value: 'utilities', label: '💡 Utilities' },
        { value: 'entertainment', label: '🎬 Entertainment' },
        { value: 'health', label: '💊 Health' },
        { value: 'other', label: '📝 Other' },
    ]

    return (
        <div className="py-6 space-y-6">
            {/* Mode Toggle */}
            <div className="flex rounded-lg bg-neutral-900 p-1">
                <button
                    onClick={() => setMode('capture')}
                    className={`flex-1 py-3 px-4 rounded-md text-sm font-bold transition-all ${mode === 'capture'
                        ? 'bg-amber-700 text-white'
                        : 'text-white/50 hover:text-white'
                        }`}
                >
                    📷 Scan Receipt
                </button>
                <button
                    onClick={() => setMode('manual')}
                    className={`flex-1 py-3 px-4 rounded-md text-sm font-bold transition-all ${mode === 'manual'
                        ? 'bg-amber-700 text-white'
                        : 'text-white/50 hover:text-white'
                        }`}
                >
                    ✏️ Manual Entry
                </button>
            </div>

            {/* Error display */}
            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {/* Capture Mode */}
            {mode === 'capture' && (
                <div
                    className={`card-glow p-8 text-center transition-all ${isDragging ? 'ring-2 ring-amber-600' : ''
                        }`}
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                >
                    {uploading && !savedOffline ? (
                        <div className="py-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-amber-600 border-t-transparent animate-spin" />
                            <p className="text-white font-medium">Processing...</p>
                        </div>
                    ) : savedOffline ? (
                        <div className="py-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                                <span className="text-3xl">📥</span>
                            </div>
                            <p className="text-amber-400 font-medium mb-1">Saved to Queue</p>
                            <p className="text-sm text-white/50">Will upload when online</p>
                        </div>
                    ) : (
                        <>
                            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-amber-900/30 flex items-center justify-center">
                                <span className="text-4xl">📷</span>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
                                {isMobile ? (
                                    <>
                                        <label className="btn-primary cursor-pointer inline-flex items-center justify-center gap-2">
                                            📸 Take Photo
                                            <input
                                                ref={cameraInputRef}
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                className="hidden"
                                                onChange={handleInputChange}
                                            />
                                        </label>
                                        <label className="btn-secondary cursor-pointer inline-flex items-center justify-center gap-2">
                                            🖼️ Gallery
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleInputChange}
                                            />
                                        </label>
                                    </>
                                ) : (
                                    <label className="btn-primary cursor-pointer inline-flex items-center justify-center gap-2 px-8">
                                        Choose Image
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleInputChange}
                                        />
                                    </label>
                                )}
                            </div>

                            <p className="text-xs text-white/40">
                                {isMobile ? 'or choose from gallery' : 'or drag and drop'}
                            </p>
                        </>
                    )}
                </div>
            )}

            {/* Manual Mode */}
            {mode === 'manual' && (
                <form onSubmit={handleManualSubmit} className="card p-6 space-y-4">
                    <div>
                        <input
                            type="text"
                            placeholder="Vendor name"
                            value={vendor}
                            onChange={(e) => setVendor(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-600"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="Total $"
                                value={total}
                                onChange={(e) => setTotal(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-600"
                            />
                        </div>
                        <div>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                            />
                        </div>
                    </div>

                    <div>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                        >
                            {categories.map((cat) => (
                                <option key={cat.value} value={cat.value} className="bg-gray-900">
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={manualLoading}
                        className="w-full btn-primary py-4 disabled:opacity-50"
                    >
                        {manualLoading ? 'Saving...' : 'Save Receipt'}
                    </button>
                </form>
            )}

            {/* Pending Receipts - shown below capture area */}
            {pendingReceipts.length > 0 && (
                <div className="card p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-amber-500 text-lg">📥</span>
                            <div>
                                <p className="text-sm font-semibold text-white">
                                    {pendingReceipts.length} Pending
                                </p>
                                <p className="text-xs text-neutral-500">
                                    {isOnline() ? 'Ready to sync' : 'Offline'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleSync}
                            disabled={syncing || !isOnline()}
                            className="px-4 py-2 rounded-lg bg-amber-600 text-black font-bold text-sm hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {syncing ? 'Syncing...' : 'Sync'}
                        </button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto">
                        {pendingReceipts.slice(0, 5).map((pending) => (
                            <div
                                key={pending.id}
                                className="flex-shrink-0 w-12 h-12 rounded-lg bg-neutral-800 overflow-hidden"
                            >
                                {pending.file && (
                                    <img
                                        src={URL.createObjectURL(pending.file)}
                                        alt="Pending"
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>
                        ))}
                        {pendingReceipts.length > 5 && (
                            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-neutral-800 flex items-center justify-center">
                                <span className="text-xs text-neutral-400">+{pendingReceipts.length - 5}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
