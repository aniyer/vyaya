import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReceiptUpload } from '../hooks/useReceiptUpload'
import { useOfflineMode } from '../context/OfflineModeContext'

export default function Capture() {
    const navigate = useNavigate()
    const { uploadFile, uploading, error: uploadError, savedOffline } = useReceiptUpload()
    const { offlineMode } = useOfflineMode()

    const [mode, setMode] = useState('camera')
    const [isDragging, setIsDragging] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [cameraError, setCameraError] = useState(null)
    const [stream, setStream] = useState(null)

    const fileInputRef = useRef(null)
    const videoRef = useRef(null)
    const canvasRef = useRef(null)

    useEffect(() => {
        const checkMobile = () => {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera
            const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
            setIsMobile(mobileRegex.test(userAgent.toLowerCase()))
        }
        checkMobile()
    }, [])

    const startCamera = useCallback(async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCameraError("Camera not supported or requires HTTPS.")
            setMode('file')
            return
        }

        try {
            if (stream) {
                stream.getTracks().forEach(track => track.stop())
            }

            let newStream
            try {
                newStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
                    audio: false
                })
            } catch (err) {
                newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            }

            setStream(newStream)
            setCameraError(null)
        } catch (err) {
            setCameraError(err.name === 'NotAllowedError' ? "Permission denied." : "Could not access camera.")
            setMode('file')
        }
    }, [stream])

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
        }
    }, [stream])

    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.play().catch(e => console.error("Play failed", e))
        }
    }, [stream])

    useEffect(() => {
        if (mode === 'camera' && !uploading && !savedOffline) {
            startCamera()
        } else {
            stopCamera()
        }
        return () => stopCamera()
    }, [mode, uploading, savedOffline])

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return

        const video = videoRef.current
        const canvas = canvasRef.current

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const context = canvas.getContext('2d')
        context.drawImage(video, 0, 0, canvas.width, canvas.height)

        canvas.toBlob(async (blob) => {
            if (blob) {
                stopCamera()
                const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' })
                await handleFileSelect(file)
            }
        }, 'image/jpeg', 0.9)
    }

    const handleFileSelect = async (file) => {
        if (!file) return

        const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
        if (!validImageTypes.includes(file.type)) {
            alert('Please select a valid image (JPEG, PNG, WebP, or HEIC)')
            return
        }

        const result = await uploadFile(file)

        if (result && result.success) {
            if (result.offline) {
                navigate('/receipts')
            } else if (result.receipt) {
                navigate(`/receipts/${result.receipt.id}`)
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

    return (
        <>
            <div className="fixed top-0 left-0 right-0 z-30 p-4 safe-top bg-gradient-to-b from-black/80 to-transparent">
                <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-surface-300 hover:text-white transition-colors bg-surface-800/50 rounded-full backdrop-blur-sm">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    </button>

                    {!uploading && !savedOffline && (
                        <div className="bg-surface-900/90 rounded-full p-1 flex items-center border border-primary-400/20 backdrop-blur-md">
                            <button onClick={() => setMode('camera')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${mode === 'camera' ? 'bg-gradient-to-r from-primary-400 to-primary-500 text-black shadow-lg' : 'text-white/50 hover:text-white'}`}>Camera</button>
                            <button onClick={() => setMode('file')} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${mode === 'file' ? 'bg-gradient-to-r from-primary-400 to-primary-500 text-black shadow-lg' : 'text-white/50 hover:text-white'}`}>Upload</button>
                        </div>
                    )}

                    <div className="w-6" />
                </div>
            </div>

            {(uploadError || cameraError) && (
                <div className="fixed top-24 left-4 right-4 z-40 p-4 rounded-xl bg-red-500/90 text-white border border-red-400 shadow-xl backdrop-blur-md max-w-lg mx-auto">
                    <p className="text-sm font-medium">{uploadError || cameraError}</p>
                </div>
            )}

            <canvas ref={canvasRef} className="hidden" />

            {mode === 'camera' ? (
                <div className="fixed inset-0 z-0 bg-surface-950">
                    {stream ? (
                        <>
                            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                            <div className="fixed bottom-0 left-0 right-0 safe-bottom z-20 pointer-events-none">
                                <div className="max-w-lg mx-auto px-6 h-20 grid grid-cols-3 items-center relative gap-4">
                                    <div />
                                    <div className="flex justify-center -mt-8 relative z-10 pointer-events-auto">
                                        <button onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/20 active:bg-white/50 transition-all hover:scale-105 active:scale-95 shadow-2xl" aria-label="Take Photo">
                                            <div className="w-16 h-16 rounded-full bg-white transition-transform active:scale-90" />
                                        </button>
                                    </div>
                                    <div />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center h-full">
                            <div className="w-8 h-8 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
                        </div>
                    )}
                </div>
            ) : (
                <div className="fixed inset-0 z-0 bg-surface-950 flex flex-col pt-24 px-4 pb-4 overflow-y-auto">
                    {uploading && !savedOffline ? (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 mb-4 rounded-full border-4 border-primary-400 border-t-transparent animate-spin" />
                            <p className="text-white font-medium">Processing Receipt...</p>
                        </div>
                    ) : savedOffline ? (
                        <div className="flex-1 flex flex-col items-center justify-center animate-fade-in text-center">
                            <div className="w-20 h-20 mb-6 rounded-full bg-primary-400/20 flex items-center justify-center">
                                <span className="text-4xl">📥</span>
                            </div>
                            <h3 className="xl font-bold text-white mb-2">Saved to Queue</h3>
                            <p className="text-white/60 mb-8">Receipt saved offline. Syncing when online.</p>
                            <button onClick={() => navigate('/receipts')} className="w-full btn-secondary py-4">View Queue</button>
                        </div>
                    ) : (
                        <div className={`flex-1 card-glow relative flex flex-col justify-center transition-all ${isDragging ? 'ring-2 ring-primary-400' : ''}`} onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }} onDragLeave={() => setIsDragging(false)}>
                            <div className="flex flex-col items-center animate-fade-in py-12">
                                <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-primary-400/20 flex items-center justify-center">
                                    <span className="text-5xl">🖼️</span>
                                </div>
                                <div className="max-w-xs w-full space-y-4">
                                    <label className="btn-primary cursor-pointer w-full flex items-center justify-center gap-3 py-4 text-lg shadow-xl">
                                        Choose from Gallery
                                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleInputChange} />
                                    </label>
                                </div>
                                <p className="text-sm text-white/40 mt-6">or drag and drop here</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    )
}
