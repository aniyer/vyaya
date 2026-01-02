import { useState, useEffect, useCallback, useMemo } from 'react'
import { receiptsApi, dashboardApi } from '../api/client'

/**
 * Hook for fetching and managing receipts list
 */
export function useReceipts(initialParams = {}) {
    const [receipts, setReceipts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [pagination, setPagination] = useState({
        page: 1,
        perPage: 10,
        total: 0,
        pages: 0,
    })

    // Stable params to prevent infinite loops
    const stableParams = useMemo(() => initialParams, [JSON.stringify(initialParams)])

    const fetchReceipts = useCallback(async (params = {}) => {
        setLoading(true)
        setError(null)
        try {
            const data = await receiptsApi.list({
                per_page: 10,
                ...stableParams,
                ...params
            })
            setReceipts(data.items)
            setPagination({
                page: data.page,
                perPage: data.per_page,
                total: data.total,
                pages: data.pages,
            })
        } catch (err) {
            setError(err.message || 'Failed to fetch receipts')
        } finally {
            setLoading(false)
        }
    }, [stableParams])

    useEffect(() => {
        fetchReceipts()
    }, [fetchReceipts])

    return {
        receipts,
        loading,
        error,
        pagination,
        refetch: fetchReceipts,
    }
}

/**
 * Hook for fetching a single receipt
 */
export function useReceipt(id) {
    const [receipt, setReceipt] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchReceipt = useCallback(async () => {
        if (!id) return
        setLoading(true)
        setError(null)
        try {
            const data = await receiptsApi.get(id)
            setReceipt(data)
        } catch (err) {
            setError(err.message || 'Failed to fetch receipt')
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => {
        fetchReceipt()
    }, [fetchReceipt])

    return {
        receipt,
        loading,
        error,
        refetch: fetchReceipt,
    }
}

/**
 * Hook for dashboard data
 */
export function useDashboard() {
    const [summary, setSummary] = useState(null)
    const [trends, setTrends] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchDashboard = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [summaryData, trendsData] = await Promise.all([
                dashboardApi.getSummary(),
                dashboardApi.getTrends(12),
            ])
            setSummary(summaryData)
            setTrends(trendsData)
        } catch (err) {
            setError(err.message || 'Failed to fetch dashboard data')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchDashboard()
    }, [fetchDashboard])

    return {
        summary,
        trends,
        loading,
        error,
        refetch: fetchDashboard,
    }
}

/**
 * Hook for categories
 */
export function useCategories() {
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        dashboardApi.getCategories()
            .then(setCategories)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    return { categories, loading }
}
