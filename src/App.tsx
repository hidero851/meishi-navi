import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ListPage from './pages/ListPage'
import CardPage from './pages/CardPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ListPage />} />
        <Route path="/card/new" element={<CardPage mode="new" />} />
        <Route path="/card/:id" element={<CardPage mode="view" />} />
        <Route path="/card/:id/edit" element={<CardPage mode="edit" />} />
      </Routes>
    </BrowserRouter>
  )
}
