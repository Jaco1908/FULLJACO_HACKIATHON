import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import SplashScreen from './components/SplashScreen'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Chat from './pages/Chat'
import Historial from './pages/Historial'
import Admin from './pages/Admin'
import Landing from './pages/Landing'
import ResetPassword from './pages/ResetPassword'
import Perfil from './pages/Perfil'
import Comparador from './pages/Comparador'
import Insights from './pages/Insights'
import './App.css'

function Layout({ children }) {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">{children}</main>
    </div>
  )
}

export default function App() {
  const [splash, setSplash] = useState(!sessionStorage.getItem('splashShown'))

  function hideSplash() {
    sessionStorage.setItem('splashShown', '1')
    setSplash(false)
  }

  if (splash) return <SplashScreen onDone={hideSplash} />

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/chat" element={
              <ProtectedRoute><Layout><Chat /></Layout></ProtectedRoute>
            } />
            <Route path="/historial" element={
              <ProtectedRoute><Layout><Historial /></Layout></ProtectedRoute>
            } />
            <Route path="/perfil" element={
              <ProtectedRoute><Layout><Perfil /></Layout></ProtectedRoute>
            } />
            <Route path="/comparador" element={
              <ProtectedRoute><Layout><Comparador /></Layout></ProtectedRoute>
            } />
            <Route path="/insights" element={
              <ProtectedRoute><Layout><Insights /></Layout></ProtectedRoute>
            } />
            <Route path="/admin" element={
              <AdminRoute><Layout><Admin /></Layout></AdminRoute>
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
