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
 * Save a receipt image to the offline queue
 * @param {File|Blob} file - The receipt image file
 * @returns {Promise<string>} - The temporary ID of the saved receipt
 */
export async function saveReceipt(file) {
    const tempId = generateTempId()
    const receipt = {
        id: tempId,
        file: file,
        filename: file.name || 'receipt.jpg',
        timestamp: new Date().toISOString(),
    }
    await set(tempId, receipt)
    return tempId
}

/**
 * Get all pending receipts from the queue
 * @returns {Promise<Array>} - Array of pending receipt objects
 */
export async function getQueue() {
    const allKeys = await keys()
    const pendingKeys = allKeys.filter(key =>
        typeof key === 'string' && key.startsWith(QUEUE_PREFIX)
    )

    const receipts = await Promise.all(
        pendingKeys.map(async (key) => {
            const receipt = await get(key)
            return receipt
        })
    )

    // Sort by timestamp, oldest first
    return receipts
        .filter(r => r !== undefined)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
}

/**
 * Remove a receipt from the queue after successful upload
 * @param {string} id - The temporary ID of the receipt to remove
 */
export async function removeReceipt(id) {
    await del(id)
}

/**
 * Get the count of pending receipts
 * @returns {Promise<number>}
 */
export async function getQueueCount() {
    const queue = await getQueue()
    return queue.length
}

/**
 * Sync all pending receipts to the server
 * @param {Function} onProgress - Optional callback (uploaded, total) for progress updates
 * @param {Function} onError - Optional callback (receipt, error) for individual errors
 * @returns {Promise<{success: number, failed: number}>}
 */
export async function syncQueue(onProgress, onError) {
    const queue = await getQueue()
    const total = queue.length
    let success = 0
    let failed = 0

    for (let i = 0; i < queue.length; i++) {
        const receipt = queue[i]
        try {
            // Create a File object from the stored Blob if needed
            const file = receipt.file instanceof File
                ? receipt.file
                : new File([receipt.file], receipt.filename, { type: receipt.file.type || 'image/jpeg' })

            await receiptsApi.upload(file)
            await removeReceipt(receipt.id)
            success++
        } catch (err) {
            failed++
            if (onError) {
                onError(receipt, err)
            }
        }

        if (onProgress) {
            onProgress(i + 1, total)
        }
    }

    return { success, failed }
}

/**
 * Check if we're currently online
 * @returns {boolean}
 */
export function isOnline() {
    return navigator.onLine
}

export default {
    saveReceipt,
    getQueue,
    removeReceipt,
    getQueueCount,
    syncQueue,
    isOnline,
}
