import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import RecordPage from './pages/RecordPage'
import SettingsPage from './pages/SettingsPage'
import ReportsPage from './pages/ReportsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/registro" replace />} />
        <Route path="registro" element={<RecordPage />} />
        <Route path="ajustes" element={<SettingsPage />} />
        <Route path="informes" element={<ReportsPage />} />
      </Route>
    </Routes>
  )
}
