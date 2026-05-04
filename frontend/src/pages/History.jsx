import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const RISK_COLORS = { Low: '#10b981', Medium: '#f59e0b', High: '#fb923c', Critical: '#f06060' }

export default function History() {
    const navigate = useNavigate()
    const [audits, setAudits] = useState([])
    const [trend, setTrend] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [mounted, setMounted] = useState(false)

    useEffect(() => { setTimeout(() => setMounted(true), 80) }, [])

    useEffect(() => {
        Promise.all([
            fetch('/audits').then(r => r.json()),
            fetch('/audits/trend').then(r => r.json()),
        ]).then(([listData, trendData]) => {
            setAudits(listData.audits || [])
            setTotal(listData.total || 0)
            setTrend(trendData.trend || [])
        }).catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const openAudit = async (id) => {
        try {
            const res = await fetch(`/audits/${id}`)
            const result = await res.json()
            navigate('/report', { state: { result } })
        } catch (e) { console.error(e) }
    }

    const deleteAudit = async (id, e) => {
        e.stopPropagation()
        if (!confirm('Delete this audit?')) return
        try {
            await fetch(`/audits/${id}`, { method: 'DELETE' })
            setAudits(prev => prev.filter(a => a.id !== id))
            setTotal(prev => prev - 1)
        } catch (e) { console.error(e) }
    }

    const formatDate = (iso) => {
        const d = new Date(iso)
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div className={`page ${mounted ? 'fade-up' : ''}`}>
            <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>

                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ marginBottom: 6 }}>Audit History</h2>
                    <p>{total} audit{total !== 1 ? 's' : ''} stored</p>
                </div>

                {/* Trend Chart */}
                {trend.length > 1 && (
                    <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                        <div style={{
                            fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem',
                            color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em',
                            fontWeight: 700, marginBottom: '1rem',
                        }}>
                            RISK SCORE TREND
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={trend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="model_name"
                                    tick={{ fill: 'var(--t3)', fontSize: 10 }}
                                    axisLine={{ stroke: 'var(--border)' }}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tick={{ fill: 'var(--t3)', fontSize: 10 }}
                                    axisLine={{ stroke: 'var(--border)' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                                        borderRadius: 8, fontSize: 12,
                                    }}
                                    labelStyle={{ color: 'var(--t1)' }}
                                />
                                <Line
                                    type="monotone" dataKey="risk_score" name="Risk Score"
                                    stroke="var(--crimson)" strokeWidth={2}
                                    dot={{ fill: 'var(--crimson)', r: 4 }}
                                    activeDot={{ r: 6, fill: 'var(--crimson)' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Audit Table */}
                {loading ? (
                    <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                        <span className="spin" style={{ fontSize: '1.5rem' }}>+</span>
                        <p style={{ marginTop: '0.5rem' }}>Loading audits...</p>
                    </div>
                ) : audits.length === 0 ? (
                    <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', opacity: 0.3, marginBottom: '0.75rem' }}>o</div>
                        <p style={{ marginBottom: '1rem' }}>No audits yet. Run your first audit to see it here.</p>
                        <button className="btn btn-primary" onClick={() => navigate('/')}>
                            {'<-'} Go to Upload
                        </button>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Audit ID</th>
                                    <th>Model</th>
                                    <th>Risk Score</th>
                                    <th>Risk Level</th>
                                    <th>Flags</th>
                                    <th>Time</th>
                                    <th>Date</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {audits.map(a => (
                                    <tr key={a.id}
                                        onClick={() => openAudit(a.id)}
                                        style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                                        onMouseLeave={e => e.currentTarget.style.background = ''}
                                    >
                                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'var(--t3)' }}>
                                            {a.id}
                                        </td>
                                        <td style={{ fontWeight: 700, color: 'var(--t1)' }}>{a.model_name}</td>
                                        <td>
                                            <span style={{
                                                fontFamily: 'JetBrains Mono, monospace',
                                                fontWeight: 800, fontSize: '1rem',
                                                color: RISK_COLORS[a.risk_level] || 'var(--t1)',
                                            }}>
                                                {a.risk_score}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: 'var(--r-full)',
                                                fontSize: '0.68rem', fontWeight: 700,
                                                background: `${RISK_COLORS[a.risk_level]}15`,
                                                border: `1px solid ${RISK_COLORS[a.risk_level]}40`,
                                                color: RISK_COLORS[a.risk_level],
                                            }}>
                                                {a.risk_level}
                                            </span>
                                        </td>
                                        <td style={{
                                            fontWeight: 600,
                                            color: a.total_flags > 0 ? 'var(--red)' : 'var(--green)',
                                        }}>
                                            {a.total_flags}
                                        </td>
                                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem' }}>
                                            {a.elapsed_seconds}s
                                        </td>
                                        <td style={{ fontSize: '0.75rem', color: 'var(--t3)' }}>
                                            {formatDate(a.created_at)}
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-ghost"
                                                style={{ fontSize: '0.7rem', padding: '4px 8px', color: 'var(--red)' }}
                                                onClick={(e) => deleteAudit(a.id, e)}
                                            >
                                                x
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

