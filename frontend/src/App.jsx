import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Capture from './pages/Capture'
import Receipts from './pages/Receipts'
import ReceiptDetail from './pages/ReceiptDetail'
import ManualEntry from './pages/ManualEntry'

function App() {
    return (
        <Layout>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/capture" element={<Capture />} />
                <Route path="/receipts" element={<Receipts />} />
                <Route path="/receipts/:id" element={<ReceiptDetail />} />
                <Route path="/manual" element={<ManualEntry />} />
            </Routes>
        </Layout>
    )
}

export default App
