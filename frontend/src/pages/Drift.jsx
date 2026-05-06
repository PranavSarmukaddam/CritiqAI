import { useState, useRef } from 'react'
import { API_BASE } from '../config'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const SEVERITY_COLORS = { high: '#f06060', medium: '#fb923c', low: '#f59e0b', none: '#10b981' }

function DropZone({ label, hint, accept, file, onFile, id }) {
    const ref = useRef()
    const [over, setOver] = useState(false)
    return (
        <div
            onClick={() => ref.current.click()}
            onDragOver={e => { e.preventDefault(); setOver(true) }}
            onDragLeave={() => setOver(false)}
            onDrop={e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
            style={{
                border: `1.5px ${file ? 'solid' : 'dashed'} ${file ? 'var(--green-border)' : over ? 'var(--crimson-border)' : 'var(--border)'}`,
                borderRadius: 'var(--r-lg)', padding: '1.2rem', cursor: 'pointer',
                transition: 'all 0.2s',
                background: file ? 'var(--green-soft)' : over ? 'var(--crimson-soft)' : 'var(--bg-2)',
                display: 'flex', alignItems: 'center', gap: '12px',
            }}
        >
            <input id={id} ref={ref} type="file" accept={accept} style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]) }} />
            <div style={{
                width: 36, height: 36, borderRadius: 'var(--r-md)',
                background: file ? 'var(--green-soft)' : 'linear-gradient(135deg, var(--bg-3), var(--bg-4))',
                border: `1px solid ${file ? 'var(--green-border)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0,
            }}>
                {file ? '✓' : '↑'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: file ? 'var(--green)' : 'var(--t1)', marginBottom: 2 }}>
                    {file ? file.name : label}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : hint}
                </div>
            </div>
        </div>
    )
}

export default function Drift() {
    const [refFile, setRefFile] = useState(null)
    const [curFile, setCurFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [result, setResult] = useState(null)
    const [mounted, setMounted] = useState(false)

    useState(() => { setTimeout(() => setMounted(true), 80) })

    const handleDrift = async () => {
        if (!refFile || !curFile) return
        setError(null); setLoading(true)
        const form = new FormData()
        form.append('reference_csv', refFile)
        form.append('current_csv', curFile)
        try {
            const res = await fetch(`${API_BASE}/audit/drift`, { method: 'POST', body: form })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || `Error ${res.status}`)
            setResult(data)
        } catch (e) { setError(e.message) }
        finally { setLoading(false) }
    }

    const canSubmit = refFile && curFile && !loading

    if (!result) return (
        <div className={`page ${mounted ? 'fade-up' : ''}`}>
            <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem', maxWidth: 680 }}>
                <h2 style={{ marginBottom: 6 }}>
                    Data <span style={{ color: 'var(--crimson)' }}>Drift Detection</span>
                </h2>
                <p style={{ marginBottom: '2rem' }}>
                    Upload training data and production data to detect distribution shifts
                    using KS tests and Population Stability Index.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
                    <DropZone id="drift-ref" label="Reference CSV" accept=".csv"
                        hint="Training / baseline data" file={refFile} onFile={setRefFile} />
                    <DropZone id="drift-cur" label="Current CSV" accept=".csv"
                        hint="Production / new data" file={curFile} onFile={setCurFile} />
                </div>

                {error && (
                    <div style={{
                        background: 'var(--red-soft)', border: '1px solid var(--red-border)',
                        borderRadius: 'var(--r-md)', padding: '12px 16px',
                        color: '#fda4af', fontSize: '0.82rem', marginBottom: '0.8rem',
                    }}>
                        <strong>Error:</strong> {error}
                    </div>
                )}

                <button className="btn btn-primary btn-lg"
                    style={{ width: '100%', justifyContent: 'center', opacity: canSubmit ? 1 : 0.3 }}
                    onClick={handleDrift} disabled={!canSubmit}>
                    {loading ? <><span className="spin">+</span> Analyzing…</> : 'Detect Drift'}
                </button>
            </div>
        </div>
    )

    const summary = result.summary || {}
    const featureDrift = result.feature_drift || {}
    const chartData = Object.entries(featureDrift).map(([name, d]) => ({
        name: name.length > 12 ? name.slice(0, 12) + '…' : name,
        psi: d.psi,
        severity: d.severity,
        fullName: name,
        ks_pvalue: d.ks_pvalue,
    })).sort((a, b) => b.psi - a.psi)

    return (
        <div className={`page ${mounted ? 'fade-up' : ''}`}>
            <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                    <div>
                        <h2 style={{ marginBottom: 6 }}>Drift Analysis Results</h2>
                        <p>
                            {summary.reference_rows} ref rows → {summary.current_rows} current rows ·{' '}
                            {summary.total_features_compared} features compared
                        </p>
                    </div>
                    <button className="btn btn-ghost" onClick={() => { setResult(null); setError(null) }}>
                        ← New Analysis
                    </button>
                </div>

                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                            Features Drifted
                        </div>
                        <div style={{
                            fontSize: '2rem', fontWeight: 900,
                            color: summary.features_drifted > 0 ? 'var(--red)' : 'var(--green)',
                        }}>
                            {summary.features_drifted}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--t3)' }}>
                            of {summary.total_features_compared}
                        </div>
                    </div>
                    <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                            Drift Percentage
                        </div>
                        <div style={{
                            fontSize: '2rem', fontWeight: 900,
                            color: summary.drift_percentage > 50 ? 'var(--red)' : summary.drift_percentage > 20 ? 'var(--accent)' : 'var(--green)',
                        }}>
                            {summary.drift_percentage}%
                        </div>
                    </div>
                    <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                            Risk Score
                        </div>
                        <div style={{
                            fontSize: '2rem', fontWeight: 900,
                            color: result.risk_contribution > 50 ? 'var(--red)' : result.risk_contribution > 20 ? 'var(--accent)' : 'var(--green)',
                        }}>
                            {result.risk_contribution}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--t3)' }}>/ 100</div>
                    </div>
                </div>

                {/* PSI Chart */}
                {chartData.length > 0 && (
                    <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                        <div className="section-header">
                            <span className="section-dot" style={{ background: '#fb923c' }} />
                            Population Stability Index by Feature
                        </div>
                        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 28)}>
                            <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis type="number" tick={{ fill: 'var(--t3)', fontSize: 10 }} />
                                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--t3)', fontSize: 10 }} width={80} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                                        borderRadius: 8, fontSize: 12,
                                    }}
                                    formatter={(val, name, props) => [val.toFixed(4), 'PSI']}
                                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                                />
                                <Bar dataKey="psi" radius={[0, 4, 4, 0]}>
                                    {chartData.map((d, i) => (
                                        <Cell key={i} fill={SEVERITY_COLORS[d.severity] || '#10b981'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.75rem' }}>
                            {Object.entries(SEVERITY_COLORS).map(([sev, col]) => (
                                <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: 'var(--t3)' }}>
                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: col }} />
                                    {sev}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Feature Detail Table */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="section-header">
                        <span className="section-dot" style={{ background: 'var(--blue)' }} />
                        Feature-Level Drift Details
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Feature</th>
                                    <th>PSI</th>
                                    <th>KS p-value</th>
                                    <th>Ref Mean</th>
                                    <th>Cur Mean</th>
                                    <th>Mean Shift (σ)</th>
                                    <th>Severity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(featureDrift).map(([name, d]) => (
                                    <tr key={name}>
                                        <td style={{ fontWeight: 600, color: 'var(--t1)' }}>{name}</td>
                                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem' }}>
                                            {d.psi.toFixed(4)}
                                        </td>
                                        <td style={{
                                            fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem',
                                            color: d.ks_pvalue < 0.05 ? 'var(--red)' : 'var(--green)',
                                        }}>
                                            {d.ks_pvalue < 0.001 ? '<0.001' : d.ks_pvalue.toFixed(4)}
                                        </td>
                                        <td>{d.ref_mean.toFixed(3)}</td>
                                        <td>{d.cur_mean.toFixed(3)}</td>
                                        <td style={{
                                            fontWeight: 600,
                                            color: d.mean_shift_zscore > 1 ? 'var(--red)' : d.mean_shift_zscore > 0.5 ? 'var(--accent)' : 'var(--green)',
                                        }}>
                                            {d.mean_shift_zscore.toFixed(2)}σ
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: 'var(--r-full)',
                                                fontSize: '0.65rem', fontWeight: 700,
                                                background: `${SEVERITY_COLORS[d.severity]}15`,
                                                color: SEVERITY_COLORS[d.severity],
                                            }}>
                                                {d.severity}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Flags */}
                {result.flags?.length > 0 && (
                    <div className="card">
                        <div className="section-header">
                            <span className="section-dot" style={{ background: 'var(--red)' }} />
                            Drift Flags ({result.flags.length})
                        </div>
                        {result.flags.map((f, i) => (
                            <div key={i} className="flag-item"><span className="flag-icon">▲</span>{f}</div>
                        ))}
                    </div>
                )}

            </div>
        </div>
    )
}
