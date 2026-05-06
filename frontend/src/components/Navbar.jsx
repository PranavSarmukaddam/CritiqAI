import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { API_BASE } from '../config'

const NAV_LINKS = [
    { path: '/',        label: 'Upload'  },
    { path: '/audit',   label: 'Audit'   },
    { path: '/report',  label: 'Report'  },
    { path: '/history', label: 'History' },
    { path: '/compare', label: 'Compare' },
    { path: '/drift',   label: 'Drift'   },
]

export default function Navbar() {
    const { pathname } = useLocation()
    const [apiStatus, setApiStatus]   = useState('checking')
    const [clock, setClock]           = useState('')

    // Live clock
    useEffect(() => {
        const tick = () => {
            const n = new Date()
            setClock(n.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }))
        }
        tick()
        const id = setInterval(tick, 1000)
        return () => clearInterval(id)
    }, [])

    // API heartbeat
    useEffect(() => {
        let cancelled = false
        const check = async () => {
            try {
                const res = await fetch(`${API_BASE}/audit/health`, { signal: AbortSignal.timeout(3000) })
                if (!cancelled) setApiStatus(res.ok ? 'live' : 'down')
            } catch { if (!cancelled) setApiStatus('down') }
        }
        check()
        const id = setInterval(check, 15000)
        return () => { cancelled = true; clearInterval(id) }
    }, [])

    return (
        <nav className="navbar">
            {/* Logo */}
            <Link to="/" className="nav-logo">
                <img
                    src="/images/critiq.jpg"
                    alt="CritiqAI"
                    className="nav-logo-image"
                />
                <span className="nav-logo-text">
                    Critiq<span>AI</span>
                </span>
            </Link>

            {/* Nav links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {NAV_LINKS.map((link, i) => {
                    const active = pathname === link.path
                    return (
                        <span key={link.path} style={{ display: 'flex', alignItems: 'center' }}>
                            <Link
                                to={link.path}
                                style={{
                                    padding: '5px 12px',
                                    borderRadius: 'var(--r-full)',
                                    fontSize: '0.75rem',
                                    fontWeight: active ? 600 : 400,
                                    textDecoration: 'none',
                                    color: active ? 'var(--t1)' : 'var(--t3)',
                                    background: active ? 'rgba(232,184,109,0.08)' : 'transparent',
                                    border: active ? '1px solid var(--accent-border)' : '1px solid transparent',
                                    transition: 'all 0.18s var(--ease)',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                }}
                            >
                                {active && (
                                    <span style={{
                                        width: 4, height: 4, borderRadius: '50%',
                                        background: 'var(--accent)',
                                        animation: 'pulse 2s infinite',
                                        flexShrink: 0,
                                    }} />
                                )}
                                {link.label}
                            </Link>
                            {i < NAV_LINKS.length - 1 && (
                                <span style={{ color: 'var(--t4)', fontSize: '0.65rem', padding: '0 1px' }}>›</span>
                            )}
                        </span>
                    )
                })}
            </div>

            {/* Right side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="nav-clock">{clock}</span>

                <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '3px 10px',
                    borderRadius: 'var(--r-full)',
                    fontSize: '0.63rem', fontWeight: 700,
                    fontFamily: 'JetBrains Mono, monospace',
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                    background: apiStatus === 'live' ? 'var(--green-soft)'  : apiStatus === 'down' ? 'var(--red-soft)'  : 'var(--bg-3)',
                    border: `1px solid ${apiStatus === 'live' ? 'var(--green-border)' : apiStatus === 'down' ? 'var(--red-border)' : 'var(--border)'}`,
                    color:  apiStatus === 'live' ? 'var(--green)'       : apiStatus === 'down' ? 'var(--red)'       : 'var(--t3)',
                    transition: 'all 0.3s',
                }}>
                    <span style={{
                        width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                        background: apiStatus === 'live' ? 'var(--green)' : apiStatus === 'down' ? 'var(--red)' : 'var(--t3)',
                        animation: apiStatus === 'live' ? 'pulse 2s infinite' : 'none',
                    }} />
                    {apiStatus === 'live' ? 'API LIVE' : apiStatus === 'down' ? 'OFFLINE' : '...'}
                </div>
            </div>
        </nav>
    )
}
