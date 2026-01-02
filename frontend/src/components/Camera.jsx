import { useState, useRef, useEffect } from 'react'

export default function Camera({ onCapture, disabled }) {
    const [isDragging, setIsDragging] = useState(false)
    const [preview, setPreview] = useState(null)
    const [isMobile, setIsMobile] = useState(false)
    const fileInputRef = useRef(null)
    const cameraInputRef = useRef(null)

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera
            const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
            setIsMobile(mobileRegex.test(userAgent.toLowerCase()))
        }
        checkMobile()
    }, [])

    const handleFileSelect = (file) => {
        if (!file) return

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
        if (!validTypes.includes(file.type)) {
            alert('Please select a valid image file (JPEG, PNG, WebP, or HEIC)')
            return
        }

        // Create preview
        const reader = new FileReader()
        reader.onload = (e) => setPreview(e.target.result)
        reader.readAsDataURL(file)

        // Pass to parent
        onCapture(file)
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

    const handleDragOver = (e) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const clearPreview = () => {
        setPreview(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
        if (cameraInputRef.current) {
            cameraInputRef.current.value = ''
        }
    }

    return (
        <div className="space-y-4">
            {/* Drop zone / Camera trigger */}
            <div
                className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 ${isDragging
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-surface-700 hover:border-surface-600'
                    } ${preview ? 'p-2' : 'p-8'}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                {preview ? (
                    <div className="relative">
                        <img
                            src={preview}
                            alt="Receipt preview"
                            className="w-full h-64 object-contain rounded-xl bg-surface-800"
                        />
                        <button
                            onClick={clearPreview}
                            className="absolute top-2 right-2 w-8 h-8 bg-surface-900/80 rounded-full flex items-center justify-center hover:bg-surface-800 transition-colors"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center">
                            <svg className="w-8 h-8 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                        </div>
                        <p className="text-lg font-medium text-white mb-2">
                            Capture Receipt
                        </p>
                        <p className="text-sm text-surface-400 mb-4">
                            {isMobile
                                ? 'Take a photo or upload from gallery'
                                : 'Upload an image or drag and drop'}
                        </p>

                        {/* Buttons - different layout for mobile vs desktop */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            {isMobile ? (
                                <>
                                    {/* Camera button - mobile only */}
                                    <label className="btn-primary cursor-pointer inline-flex items-center justify-center gap-2">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                            <circle cx="12" cy="13" r="4" />
                                        </svg>
                                        Take Photo
                                        <input
                                            ref={cameraInputRef}
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            onChange={handleInputChange}
                                            disabled={disabled}
                                        />
                                    </label>

                                    {/* Gallery button - mobile */}
                                    <label className="btn-secondary cursor-pointer inline-flex items-center justify-center gap-2">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                            <circle cx="8.5" cy="8.5" r="1.5" />
                                            <polyline points="21 15 16 10 5 21" />
                                        </svg>
                                        Gallery
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleInputChange}
                                            disabled={disabled}
                                        />
                                    </label>
                                </>
                            ) : (
                                /* Desktop - single upload button */
                                <label className="btn-primary cursor-pointer inline-flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    Choose Image
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleInputChange}
                                        disabled={disabled}
                                    />
                                </label>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Tips */}
            <div className="text-xs text-surface-500 space-y-1">
                <p className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary-500" />
                    Ensure good lighting for best AI results
                </p>
                <p className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-primary-500" />
                    Keep the receipt flat and in frame
                </p>
            </div>
        </div>
    )
}
