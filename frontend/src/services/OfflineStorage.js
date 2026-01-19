import { get, set, del, keys } from 'idb-keyval'
import { receiptsApi } from '../api/client'

const QUEUE_PREFIX = 'pending_receipt_'

/**
 * Generate a unique temporary ID for offline receipts
 */
function generateTempId() {
    return `${QUEUE_PREFIX}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Convert a File/Blob to ArrayBuffer for storage
 */
async function fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
        reader.readAsArrayBuffer(file)
    })
}

/**
 * Save a receipt image to the offline queue
 * Converts File to ArrayBuffer for proper IndexedDB storage
 * @param {File|Blob} file - The receipt image file
 * @returns {Promise<string>} - The temporary ID of the saved receipt
 */
/**
 * Save manual receipt data to the offline queue
 * @param {Object} data - The receipt data (vendor, amount, date, etc)
 * @returns {Promise<string>} - The temporary ID of the saved receipt
 */
export async function saveManualReceipt(data) {
    const tempId = generateTempId()

    const receipt = {
        id: tempId,
        data: data,
        isManual: true,
        timestamp: new Date().toISOString(),
    }

    await set(tempId, receipt)
    console.log('Manual receipt saved offline:', tempId)
    return tempId
}

export async function saveReceipt(file) {
    const tempId = generateTempId()

    // Convert file to ArrayBuffer for proper serialization
    const arrayBuffer = await fileToArrayBuffer(file)

    const receipt = {
        id: tempId,
        arrayBuffer: arrayBuffer,
        filename: file.name || 'receipt.jpg',
        type: file.type || 'image/jpeg',
        isManual: false,
        timestamp: new Date().toISOString(),
    }

    await set(tempId, receipt)
    console.log('Receipt saved offline:', tempId)
    return tempId
}

/**
 * Get all pending receipts from the queue
 * Reconstructs File objects from stored ArrayBuffers
 * @returns {Promise<Array>} - Array of pending receipt objects
 */
export async function getQueue() {
    const allKeys = await keys()
    const pendingKeys = allKeys.filter(key =>
        typeof key === 'string' && key.startsWith(QUEUE_PREFIX)
    )

    const receipts = await Promise.all(
        pendingKeys.map(async (key) => {
            try {
                const stored = await get(key)
                if (!stored) return null

                // Handle manual receipts
                if (stored.isManual) {
                    return {
                        id: stored.id,
                        data: stored.data,
                        isManual: true,
                        timestamp: stored.timestamp,
                    }
                }

                // Reconstruct File from ArrayBuffer
                let file = null
                if (stored.arrayBuffer) {
                    const blob = new Blob([stored.arrayBuffer], { type: stored.type })
                    file = new File([blob], stored.filename, { type: stored.type })
                }

                return {
                    id: stored.id,
                    file: file,
                    filename: stored.filename,
                    type: stored.type,
                    isManual: false,
                    timestamp: stored.timestamp,
                }
            } catch (err) {
                console.error('Error loading receipt:', key, err)
                return null
            }
        })
    )

    // Sort by timestamp, oldest first
    return receipts
        .filter(r => r !== null) // Removed receipt.file check to allow manual receipts
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
}

/**
 * Remove a receipt from the queue after successful upload
 * @param {string} id - The temporary ID of the receipt to remove
 */
export async function removeReceipt(id) {
    await del(id)
    console.log('Receipt removed from queue:', id)
}

/**
 * Get the count of pending receipts
 * @returns {Promise<number>}
 */
export async function getQueueCount() {
    const queue = await getQueue()
    return queue.length
}

let isSyncing = false

/**
 * Sync all pending receipts to the server
 * @param {Function} onProgress - Optional callback (uploaded, total) for progress updates
 * @param {Function} onError - Optional callback (receipt, error) for individual errors
 * @returns {Promise<{success: number, failed: number}>}
 */
export async function syncQueue(onProgress, onError) {
    if (isSyncing) {
        console.log('Sync already in progress, skipping')
        return { success: 0, failed: 0 }
    }

    try {
        isSyncing = true
        const queue = await getQueue()
        const total = queue.length

        if (total === 0) return { success: 0, failed: 0 }

        let success = 0
        let failed = 0

        console.log('Starting sync of', total, 'receipts')

        for (let i = 0; i < queue.length; i++) {
            const receipt = queue[i]
            try {
                if (receipt.isManual) {
                    console.log('Syncing manual receipt:', receipt.id)
                    await receiptsApi.create(receipt.data)
                } else {
                    if (!receipt.file) {
                        console.error('No file for receipt:', receipt.id)
                        failed++
                        continue
                    }

                    if (receipt.type && receipt.type.startsWith('audio/')) {
                        console.log('Uploading audio note:', receipt.id)
                        await receiptsApi.uploadAudio(receipt.file)
                    } else {
                        console.log('Uploading receipt file:', receipt.id)
                        await receiptsApi.upload(receipt.file)
                    }
                }

                await removeReceipt(receipt.id)
                success++
                console.log('Successfully synced:', receipt.id)
            } catch (err) {
                console.error('Failed to sync receipt:', receipt.id, err)
                failed++
                if (onError) {
                    onError(receipt, err)
                }
            }

            if (onProgress) {
                onProgress(i + 1, total)
            }
        }

        console.log('Sync complete:', success, 'success,', failed, 'failed')
        return { success, failed }
    } finally {
        isSyncing = false
    }
}

/**
 * Check if we're currently online
 * Note: This only checks browser's network status, not actual API reachability
 * @returns {boolean}
 */
export function isOnline() {
    return navigator.onLine
}

/**
 * Clear all pending receipts (for debugging)
 */
export async function clearQueue() {
    const allKeys = await keys()
    const pendingKeys = allKeys.filter(key =>
        typeof key === 'string' && key.startsWith(QUEUE_PREFIX)
    )
    await Promise.all(pendingKeys.map(key => del(key)))
    console.log('Queue cleared')
}

export default {
    saveReceipt,
    getQueue,
    removeReceipt,
    getQueueCount,
    syncQueue,
    isOnline,
    clearQueue,
}
