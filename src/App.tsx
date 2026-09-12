import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import ListPage from './pages/ListPage'
import CardPage from './pages/CardPage'
import LoginPage from './pages/LoginPage'
import SetupNamePage from './pages/SetupNamePage'

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

  const hasName = !!user?.user_metadata?.display_name

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/setup-name" element={!user ? <Navigate to="/login" replace /> : hasName ? <Navigate to="/" replace /> : <SetupNamePage />} />
        <Route path="/" element={!user ? <Navigate to="/login" replace /> : !hasName ? <Navigate to="/setup-name" replace /> : <ListPage />} />
        <Route path="/card/new" element={!user ? <Navigate to="/login" replace /> : !hasName ? <Navigate to="/setup-name" replace /> : <CardPage mode="new" />} />
        <Route path="/card/:id" element={!user ? <Navigate to="/login" replace /> : !hasName ? <Navigate to="/setup-name" replace /> : <CardPage mode="view" />} />
        <Route path="/card/:id/edit" element={!user ? <Navigate to="/login" replace /> : !hasName ? <Navigate to="/setup-name" replace /> : <CardPage mode="edit" />} />
      </Routes>
    </BrowserRouter>
  )
}
