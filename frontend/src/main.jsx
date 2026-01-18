import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { OfflineModeProvider } from './context/OfflineModeContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <OfflineModeProvider>
                <App />
            </OfflineModeProvider>
        </BrowserRouter>
    </React.StrictMode>,
)
