import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { registerSW } from 'virtual:pwa-register'

// Register PWA Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Aplikasi versi baru tersedia. Refresh sekarang?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('Aplikasi siap bekerja offline');
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
