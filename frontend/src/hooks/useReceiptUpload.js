import { useState, useCallback } from 'react'
import { receiptsApi } from '../api/client'
import { saveReceipt, saveManualReceipt, isOnline, getQueue } from '../services/OfflineStorage'
import { useOfflineMode } from '../context/OfflineModeContext'
import { useNavigate } from 'react-router-dom'

export function useReceiptUpload() {
    const navigate = useNavigate()
    const { offlineMode } = useOfflineMode()
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState(null)
    const [savedOffline, setSavedOffline] = useState(false)

    const uploadFile = useCallback(async (file) => {
        if (!file) return

        setUploading(true)
        setError(null)
        setSavedOffline(false)

        const isAudio = file.type.startsWith('audio/')

        // Offline or forced offline mode checks
        if (offlineMode || !isOnline()) {
            try {
                await saveReceipt(file)
                setSavedOffline(true)
                setUploading(false)
                setTimeout(() => setSavedOffline(false), 3000)
                return { success: true, offline: true }
            } catch (err) {
                const msg = 'Failed to save offline: ' + err.message
                setError(msg)
                setUploading(false)
                return { success: false, error: msg }
            }
        }

        try {
            console.log('Attempting upload to backend...')
            let result
            if (isAudio) {
                result = await receiptsApi.uploadAudio(file)
            } else {
                result = await receiptsApi.upload(file)
            }
            console.log('Upload successful:', result)
            setUploading(false)
            return { success: true, receipt: result.receipt }
        } catch (err) {
            console.error('Upload failed, falling back to offline:', err)
            try {
                await saveReceipt(file)
                setSavedOffline(true)
                setUploading(false)
                setTimeout(() => setSavedOffline(false), 3000)
                return { success: true, offline: true, error: err.message } // upload failed but saved offline
            } catch (offlineErr) {
                const msg = 'Failed to save: ' + offlineErr.message
                setError(msg)
                setUploading(false)
                return { success: false, error: msg }
            }
        }
    }, [offlineMode])

    const uploadManual = useCallback(async (receiptData) => {
        setUploading(true)
        setError(null)
        setSavedOffline(false)

        if (offlineMode || !isOnline()) {
            try {
                await saveManualReceipt(receiptData)
                setSavedOffline(true)
                setUploading(false)
                setTimeout(() => setSavedOffline(false), 3000)
                return { success: true, offline: true }
            } catch (err) {
                const msg = 'Failed to save offline: ' + err.message
                setError(msg)
                setUploading(false)
                return { success: false, error: msg }
            }
        }

        try {
            const result = await receiptsApi.create(receiptData)
            setUploading(false)
            return { success: true, receipt: result }
        } catch (err) {
            console.error('Manual creation failed, falling back to offline:', err)
            try {
                await saveManualReceipt(receiptData)
                setSavedOffline(true)
                setUploading(false)
                setTimeout(() => setSavedOffline(false), 3000)
                return { success: true, offline: true }
            } catch (offlineErr) {
                const msg = 'Failed to save: ' + offlineErr.message
                setError(msg)
                setUploading(false)
                return { success: false, error: msg }
            }
        }
    }, [offlineMode])

    return {
        uploadFile,
        uploadManual,
        uploading,
        error,
        savedOffline
    }
}
