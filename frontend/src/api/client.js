import axios from 'axios'

const API_BASE = '/api'

const client = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Receipts API
export const receiptsApi = {
    upload: async (file) => {
        const formData = new FormData()
        formData.append('file', file)
        const response = await client.post('/receipts/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return response.data
    },
    create: async (data) => {
        const response = await client.post('/receipts', data)
        return response.data
    },

    list: async (params = {}) => {
        const response = await client.get('/receipts', { params })
        return response.data
    },

    get: async (id) => {
        const response = await client.get(`/receipts/${id}`)
        return response.data
    },

    update: async (id, data) => {
        const response = await client.put(`/receipts/${id}`, data)
        return response.data
    },

    delete: async (id) => {
        const response = await client.delete(`/receipts/${id}`)
        return response.data
    },

    getImageUrl: (id) => `/api/receipts/image/${id}`,
}

// Dashboard API
export const dashboardApi = {
    getSummary: async () => {
        const response = await client.get('/dashboard/summary')
        return response.data
    },

    getTrends: async (months = 12) => {
        const response = await client.get('/dashboard/trends', { params: { months } })
        return response.data
    },

    getCategories: async () => {
        const response = await client.get('/dashboard/categories')
        return response.data
    },
}

export default client
