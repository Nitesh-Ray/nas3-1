import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import Sectors from './pages/Sectors'
import Seasonality from './pages/Seasonality'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Home />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="sectors" element={<Sectors />} />
        <Route path="seasonality" element={<Seasonality />} />
      </Route>
    </Routes>
  )
}
