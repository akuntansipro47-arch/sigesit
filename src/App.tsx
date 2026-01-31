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
    const checkVersion = async () => {
      try {
        const response = await fetch('/version.json?t=' + new Date().getTime());
        const data = await response.json();
        const serverVersion = data.version;
        const localVersion = '4.4.9'; // UPDATE THIS MANUALLY IN CODE
        
        console.log(`Version Check: Server ${serverVersion} vs Local ${localVersion}`);
        
        if (serverVersion !== localVersion) {
          console.log('New version detected! Forcing update...');
          
          // 1. Unregister Service Workers
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
              await registration.unregister();
            }
          }
          
          // 2. Clear Caches
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
          }

          // 3. Reload
          window.location.reload();
        }
      } catch (error) {
        console.error('Failed to check version:', error);
      }
    };

    checkVersion();
    
    // Also keep the interval check for long-running sessions
    const interval = setInterval(checkVersion, 60 * 1000); // Check every minute
    return () => clearInterval(interval);
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
