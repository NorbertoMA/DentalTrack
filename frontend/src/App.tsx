import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import RecordPage from './pages/RecordPage'
import SettingsPage from './pages/SettingsPage'
import ReportsPage from './pages/ReportsPage'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/registro" replace />} />
          <Route path="registro" element={<RecordPage />} />
          <Route path="ajustes" element={<SettingsPage />} />
          <Route path="informes" element={<ReportsPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
