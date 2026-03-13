import { useState, useRef, useEffect } from 'react'

export default function AudioPlayer({ src }) {
    const audioRef = useRef(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const handleLoadedMetadata = () => setDuration(audio.duration)
        const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
        const handleEnded = () => setIsPlaying(false)

        audio.addEventListener('loadedmetadata', handleLoadedMetadata)
        audio.addEventListener('timeupdate', handleTimeUpdate)
        audio.addEventListener('ended', handleEnded)

        return () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
            audio.removeEventListener('timeupdate', handleTimeUpdate)
            audio.removeEventListener('ended', handleEnded)
        }
    }, [])

    const togglePlay = () => {
        const audio = audioRef.current
        if (!audio) return

        if (isPlaying) {
            audio.pause()
        } else {
            audio.play()
        }
        setIsPlaying(!isPlaying)
    }

    const handleSeek = (e) => {
        const audio = audioRef.current
        if (!audio) return

        const rect = e.currentTarget.getBoundingClientRect()
        const percent = (e.clientX - rect.left) / rect.width
        audio.currentTime = percent * duration
    }

    const formatTime = (time) => {
        if (!time || isNaN(time)) return '0:00'
        const mins = Math.floor(time / 60)
        const secs = Math.floor(time % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0

    return (
        <div className="w-full max-w-md">
            <audio ref={audioRef} src={src} preload="metadata" />

            <div className="flex items-center gap-4">
                <button
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-300 to-primary-500 hover:shadow-lg hover:shadow-primary-400/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg"
                >
                    {isPlaying ? (
                        <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6 text-black ml-1" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    )}
                </button>

                <div className="flex-1">
                    <div className="flex justify-between text-xs text-white/50 mb-2">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>

                    <div className="h-2 bg-white/10 rounded-full cursor-pointer overflow-hidden" onClick={handleSeek}>
                        <div className="h-full bg-gradient-to-r from-primary-300 to-primary-500 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            </div>
        </div>
    )
}
