import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function CaptureTray({ isOpen, onClose, onAudioSelect }) {
    const navigate = useNavigate()
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setVisible(true)
        } else {
            const timer = setTimeout(() => setVisible(false), 300) // Match transition duration
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    if (!visible && !isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Tray */}
            <div className={`fixed bottom-24 left-4 right-4 z-50 transition-transform duration-300 ease-out transform ${isOpen ? 'translate-y-0' : 'translate-y-[150%]'}`}>
                <div className="bg-neutral-900 border border-white/10 rounded-2xl p-4 shadow-2xl space-y-2">
                    <p className="text-center text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">Add Receipt</p>

                    <div className="grid grid-cols-3 gap-3">
                        {/* Speak (Audio) */}
                        <button
                            onClick={() => {
                                onClose()
                                onAudioSelect()
                            }}
                            className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
                        >
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                    <line x1="12" y1="19" x2="12" y2="23" />
                                    <line x1="8" y1="23" x2="16" y2="23" />
                                </svg>
                            </div>
                            <span className="text-xs font-semibold text-white">Speak</span>
                        </button>

                        {/* Click (Camera) */}
                        <button
                            onClick={() => {
                                onClose()
                                navigate('/capture')
                            }}
                            className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
                        >
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                    <circle cx="12" cy="13" r="4" />
                                </svg>
                            </div>
                            <span className="text-xs font-semibold text-white">Click</span>
                        </button>

                        {/* Type (Manual) */}
                        <button
                            onClick={() => {
                                onClose()
                                navigate('/manual')
                            }}
                            className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
                        >
                            <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                            </div>
                            <span className="text-xs font-semibold text-white">Type</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
