import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import ListPage from './pages/ListPage'
import CardPage from './pages/CardPage'
import LoginPage from './pages/LoginPage'

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (user === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner-dark" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/" element={user ? <ListPage /> : <Navigate to="/login" replace />} />
        <Route path="/card/new" element={user ? <CardPage mode="new" /> : <Navigate to="/login" replace />} />
        <Route path="/card/:id" element={user ? <CardPage mode="view" /> : <Navigate to="/login" replace />} />
        <Route path="/card/:id/edit" element={user ? <CardPage mode="edit" /> : <Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
