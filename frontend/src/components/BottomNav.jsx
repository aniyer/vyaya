import { NavLink, useLocation } from 'react-router-dom'
import { useState, useRef } from 'react'
import CaptureTray from './CaptureTray'
import { useReceiptUpload } from '../hooks/useReceiptUpload'

// Icons
function DashboardIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    )
}

function HistoryIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    )
}

function PlusIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    )
}

function MicIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
    )
}

export default function BottomNav() {
    const location = useLocation()
    const [isTrayOpen, setIsTrayOpen] = useState(false)
    const [audioMode, setAudioMode] = useState(false)
    const [isRecording, setIsRecording] = useState(false)

    // Upload hook
    const { uploadFile, uploading } = useReceiptUpload()

    // Recording logic
    const mediaRecorderRef = useRef(null)
    const chunksRef = useRef([])

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            mediaRecorderRef.current = new MediaRecorder(stream)
            chunksRef.current = []

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data)
                }
            }

            mediaRecorderRef.current.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
                await uploadFile(new File([blob], "audio_note.webm", { type: "audio/webm" }))

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop())

                // Reset states
                setAudioMode(false)
                setIsRecording(false)
            }

            mediaRecorderRef.current.start()
            setIsRecording(true)
        } catch (err) {
            console.error("Error accessing microphone:", err)
            alert("Could not access microphone.")
            setAudioMode(false)
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
        }
    }

    const handleActionClick = () => {
        if (audioMode) {
            if (isRecording) {
                stopRecording()
            } else {
                startRecording()
            }
        } else {
            setIsTrayOpen(!isTrayOpen)
        }
    }

    // When "Speak" is selected from Tray
    const handleAudioSelect = () => {
        setIsTrayOpen(false)
        setAudioMode(true)
        // Auto-start recording? User requirement says: "start recording"
        startRecording()
    }

    return (
        <>
            <CaptureTray
                isOpen={isTrayOpen}
                onClose={() => setIsTrayOpen(false)}
                onAudioSelect={handleAudioSelect}
            />

            <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-800 safe-bottom bg-neutral-950/80 backdrop-blur-md">
                <div className="max-w-lg mx-auto px-6 h-20 grid grid-cols-3 items-center relative gap-4">

                    {/* Left: Dashboard */}
                    <div className="flex justify-center">
                        <NavLink
                            to="/"
                            className={({ isActive }) =>
                                `flex flex-col items-center gap-1 transition-colors ${isActive
                                    ? 'text-amber-500'
                                    : 'text-neutral-500 hover:text-neutral-300'
                                }`
                            }
                        >
                            <DashboardIcon className="w-6 h-6" />
                            <span className="text-[10px] font-bold tracking-wide uppercase">Dash</span>
                        </NavLink>
                    </div>

                    {/* Middle: Action Button (Floating) */}
                    <div className="flex justify-center -mt-8 relative z-10">
                        <button
                            onClick={handleActionClick}
                            disabled={uploading}
                            className={`
                                w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300
                                ${audioMode && isRecording
                                    ? 'bg-red-500 animate-pulse ring-4 ring-red-500/30 scale-110'
                                    : 'bg-gradient-to-br from-amber-400 to-amber-600 hover:scale-105 hover:shadow-amber-500/20'
                                }
                                ${isTrayOpen ? 'rotate-45' : 'rotate-0'}
                                ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            {uploading ? (
                                <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : audioMode ? (
                                <MicIcon className="w-8 h-8 text-white" />
                            ) : (
                                <PlusIcon className="w-8 h-8 text-black" />
                            )}
                        </button>
                    </div>

                    {/* Right: History */}
                    <div className="flex justify-center">
                        <NavLink
                            to="/receipts"
                            className={({ isActive }) =>
                                `flex flex-col items-center gap-1 transition-colors ${isActive
                                    ? 'text-amber-500'
                                    : 'text-neutral-500 hover:text-neutral-300'
                                }`
                            }
                        >
                            <HistoryIcon className="w-6 h-6" />
                            <span className="text-[10px] font-bold tracking-wide uppercase">History</span>
                        </NavLink>
                    </div>

                </div>
            </nav>
        </>
    )
}
