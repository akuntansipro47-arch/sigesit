import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import AdminDashboard from './pages/admin/Dashboard'
import EntryDashboard from './pages/entry/EntryDashboard'
import { useEffect } from 'react'
import { processOfflineQueue } from './lib/offline'

function App() {
  const { profile, loading, isAdmin } = useAuth()

  // Force reload if version mismatch (Simple cache buster)
  useEffect(() => {
    const lastVersion = localStorage.getItem('app_version');
    const currentVersion = '4.2.1'; // Increment this manually on deploy
    if (lastVersion && lastVersion !== currentVersion) {
      console.log('New version detected, updating...');
      localStorage.setItem('app_version', currentVersion);
      window.location.reload();
    } else if (!lastVersion) {
      localStorage.setItem('app_version', currentVersion);
    }
  }, []);

  // Process offline queue on app load
  useEffect(() => {
    processOfflineQueue();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-blue-600 font-black text-sm uppercase tracking-widest animate-pulse">Menyiapkan Aplikasi...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Protected Admin Routes */}
        <Route 
          path="/admin/*" 
          element={
            isAdmin ? <AdminDashboard /> : <Navigate to="/" replace />
          } 
        />
        
        {/* Protected Entry Routes */}
        <Route 
          path="/entry/*" 
          element={
            profile?.role === 'kader' || isAdmin ? <EntryDashboard /> : <Navigate to="/" replace />
          } 
        />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
