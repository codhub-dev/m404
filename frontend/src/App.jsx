import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, AdminRoute, GuestRoute } from './components/ui/RouteGuards';
import Login from './pages/Login';
import Home from './pages/Home';
import Profile from './pages/Profile';
import AdminPanel from './pages/admin/AdminPanel';
import ProteinTracker from './pages/protein/ProteinTracker';
import MyLogs from './pages/protein/MyLogs';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'rgba(30,10,50,0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              borderRadius: '14px',
              fontSize: '14px',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
            },
            success: { iconTheme: { primary: '#a78bfa', secondary: '#0a0010' } },
          }}
        />
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<Login />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<Home />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/protein" element={<ProteinTracker />} />
            <Route path="/protein/history" element={<MyLogs />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminPanel />} />
          </Route>

          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
