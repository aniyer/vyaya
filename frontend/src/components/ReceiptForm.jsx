import { useState, useEffect } from 'react'
import { useCategories } from '../hooks/useReceipts'

export default function ReceiptForm({ receipt, onSubmit, loading }) {
    const { categories } = useCategories()
    const [formData, setFormData] = useState({
        vendor: '',
        amount: '',
        currency: 'USD',
        transaction_date: '',
        category_id: '',
    })

    useEffect(() => {
        if (receipt) {
            setFormData({
                vendor: receipt.vendor || '',
                amount: receipt.amount?.toString() || '',
                currency: receipt.currency || 'USD',
                transaction_date: receipt.transaction_date || '',
                category_id: receipt.category_id?.toString() || '',
            })
        }
    }, [receipt])

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit({
            vendor: formData.vendor || null,
            amount: formData.amount ? parseFloat(formData.amount) : null,
            currency: formData.currency,
            transaction_date: formData.transaction_date || null,
            category_id: formData.category_id ? parseInt(formData.category_id) : null,
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Vendor */}
            <div>
                <label htmlFor="vendor" className="label">Vendor</label>
                <input
                    type="text"
                    id="vendor"
                    name="vendor"
                    value={formData.vendor}
                    onChange={handleChange}
                    placeholder="e.g., Walmart, Starbucks"
                    className="input"
                />
            </div>

            {/* Amount and Currency */}
            <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                    <label htmlFor="amount" className="label">Amount</label>
                    <input
                        type="number"
                        id="amount"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="input"
                    />
                </div>
                <div>
                    <label htmlFor="currency" className="label">Currency</label>
                    <select
                        id="currency"
                        name="currency"
                        value={formData.currency}
                        onChange={handleChange}
                        className="input"
                    >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="CAD">CAD</option>
                    </select>
                </div>
            </div>

            {/* Date */}
            <div>
                <label htmlFor="transaction_date" className="label">Date</label>
                <input
                    type="date"
                    id="transaction_date"
                    name="transaction_date"
                    value={formData.transaction_date}
                    onChange={handleChange}
                    className="input"
                />
            </div>

            {/* Category */}
            <div>
                <label htmlFor="category_id" className="label">Category</label>
                <select
                    id="category_id"
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleChange}
                    className="input"
                >
                    <option value="">Select category...</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Submit */}
            <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
            >
                {loading ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Saving...
                    </span>
                ) : (
                    'Save Changes'
                )}
            </button>
        </form>
    )
}
