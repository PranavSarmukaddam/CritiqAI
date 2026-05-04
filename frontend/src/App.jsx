import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HexMesh from './components/HexMesh'
import Navbar from './components/Navbar'
import Upload from './pages/Upload'
import AuditProgress from './pages/AuditProgress'
import Report from './pages/Report'
import History from './pages/History'
import Compare from './pages/Compare'
import Drift from './pages/Drift'

export default function App() {
    return (
        <BrowserRouter>
            {/* Fixed hexagonal mesh background — interactive with cursor */}
            <HexMesh />
            {/* Vignette softens the hex grid at edges */}
            <div className="bg-vignette" aria-hidden="true" />
            <Navbar />
            <Routes>
                <Route path="/"        element={<Upload />}        />
                <Route path="/audit"   element={<AuditProgress />} />
                <Route path="/report"  element={<Report />}        />
                <Route path="/history" element={<History />}       />
                <Route path="/compare" element={<Compare />}       />
                <Route path="/drift"   element={<Drift />}         />
                <Route path="*"        element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    )
}
