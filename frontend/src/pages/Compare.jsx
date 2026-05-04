import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const METRIC_LABELS = {
    accuracy: 'Accuracy', precision: 'Precision', recall: 'Recall',
    f1_score: 'F1 Score', roc_auc: 'ROC-AUC',
}

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

export default function Compare() {
    const navigate = useNavigate()
    const [csvFile, setCsvFile] = useState(null)
    const [modelA, setModelA] = useState(null)
    const [modelB, setModelB] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [result, setResult] = useState(null)
    const [mounted, setMounted] = useState(false)

    useState(() => { setTimeout(() => setMounted(true), 80) })

    const handleCompare = async () => {
        if (!csvFile || !modelA || !modelB) return
        setError(null); setLoading(true)
        const form = new FormData()
        form.append('csv_file', csvFile)
        form.append('model_file_a', modelA)
        form.append('model_file_b', modelB)
        try {
            const res = await fetch('/audit/compare', { method: 'POST', body: form })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || `Error ${res.status}`)
            setResult(data)
        } catch (e) { setError(e.message) }
        finally { setLoading(false) }
    }

    const fmt = v => typeof v === 'number' ? (v < 2 ? (v * 100).toFixed(1) + '%' : v) : '-'
    const canSubmit = csvFile && modelA && modelB && !loading

    if (!result) return (
        <div className={`page ${mounted ? 'fade-up' : ''}`}>
            <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem', maxWidth: 680 }}>
                <h2 style={{ marginBottom: 6 }}>
                    Model <span style={{ color: 'var(--crimson)' }}>Comparison</span>
                </h2>
                <p style={{ marginBottom: '2rem' }}>
                    Upload one dataset and two models to compare them side-by-side.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1rem' }}>
                    <DropZone id="cmp-csv" label="Dataset CSV" accept=".csv"
                        hint="Same dataset for both models" file={csvFile} onFile={setCsvFile} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <DropZone id="cmp-model-a" label="Model A" accept=".joblib,.pkl,.pickle"
                            hint=".joblib or .pkl" file={modelA} onFile={setModelA} />
                        <DropZone id="cmp-model-b" label="Model B" accept=".joblib,.pkl,.pickle"
                            hint=".joblib or .pkl" file={modelB} onFile={setModelB} />
                    </div>
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
                    onClick={handleCompare} disabled={!canSubmit}>
                    {loading ? <><span className="spin">+</span> Comparing…</> : 'Compare Models'}
                </button>
            </div>
        </div>
    )

    const cmp = result.comparison
    const ma = result.model_a
    const mb = result.model_b

    return (
        <div className={`page ${mounted ? 'fade-up' : ''}`}>
            <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                    <div>
                        <h2 style={{ marginBottom: 6 }}>Comparison Results</h2>
                        <p>{ma.model_name} <span style={{ color: 'var(--t3)' }}>vs</span> {mb.model_name}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost" onClick={() => setResult(null)}>← New Compare</button>
                        <button className="btn btn-primary" onClick={() => navigate('/report', { state: { result: cmp.winner === 'A' ? ma : mb } })}>
                            View Winner Report →
                        </button>
                    </div>
                </div>

                {/* Winner Banner */}
                <div className="card" style={{
                    marginBottom: '1.5rem', padding: '1.5rem',
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.05), rgba(0,212,255,0.05))',
                    border: '1px solid var(--green-border)',
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                        RECOMMENDED MODEL
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--green)' }}>
                        🏆 {cmp.winner === 'A' ? ma.model_name : mb.model_name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--t3)', marginTop: 4 }}>
                        Lower composite risk score ({cmp.risk_score[`model_${cmp.winner.toLowerCase()}`]}/100)
                    </div>
                </div>

                {/* Risk Score Comparison */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    {[{ label: 'Model A', data: ma, winner: cmp.winner === 'A' },
                    { label: 'Model B', data: mb, winner: cmp.winner === 'B' }].map(({ label, data, winner }) => (
                        <div key={label} className="card" style={{
                            padding: '1.5rem', textAlign: 'center',
                            border: winner ? '1.5px solid var(--green-border)' : undefined,
                        }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                                {label} - {data.model_name}
                                {winner && <span style={{ color: 'var(--green)', marginLeft: 8 }}>✓ WINNER</span>}
                            </div>
                            <div style={{
                                fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.04em',
                                color: data.summary?.risk_color || 'var(--t1)',
                            }}>
                                {data.summary?.composite_risk_score}
                            </div>
                            <div style={{
                                display: 'inline-block', padding: '3px 12px', borderRadius: 'var(--r-full)',
                                fontSize: '0.7rem', fontWeight: 700,
                                background: `${data.summary?.risk_color}15`,
                                border: `1px solid ${data.summary?.risk_color}40`,
                                color: data.summary?.risk_color,
                                marginTop: 6,
                            }}>
                                {data.summary?.risk_level} Risk
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--t3)', marginTop: 8 }}>
                                {data.summary?.total_flags} flags · {data.elapsed_seconds}s
                            </div>
                        </div>
                    ))}
                </div>

                {/* Metrics Comparison Table */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="section-header">
                        <span className="section-dot" style={{ background: '#00d4ff' }} />
                        Performance Metrics Comparison
                    </div>
                    <table className="data-table" style={{ width: '100%' }}>
                        <thead>
                            <tr>
                                <th>Metric</th>
                                <th style={{ textAlign: 'center' }}>Model A</th>
                                <th style={{ textAlign: 'center' }}>Model B</th>
                                <th style={{ textAlign: 'center' }}>Δ (B−A)</th>
                                <th style={{ textAlign: 'center' }}>Better</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(cmp.metrics).map(([key, m]) => (
                                <tr key={key}>
                                    <td style={{ fontWeight: 600, color: 'var(--t1)' }}>{METRIC_LABELS[key] || key}</td>
                                    <td style={{ textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}>
                                        {fmt(m.model_a)}
                                    </td>
                                    <td style={{ textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}>
                                        {fmt(m.model_b)}
                                    </td>
                                    <td style={{
                                        textAlign: 'center', fontFamily: 'JetBrains Mono, monospace',
                                        fontWeight: 700,
                                        color: m.delta > 0 ? 'var(--green)' : m.delta < 0 ? 'var(--red)' : 'var(--t3)',
                                    }}>
                                        {m.delta != null ? (m.delta > 0 ? '+' : '') + fmt(m.delta) : '-'}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span style={{
                                            padding: '2px 10px', borderRadius: 'var(--r-full)',
                                            fontSize: '0.68rem', fontWeight: 700,
                                            background: m.better === 'tie' ? 'var(--bg-3)' : 'var(--green-soft)',
                                            color: m.better === 'tie' ? 'var(--t3)' : 'var(--green)',
                                        }}>
                                            {m.better === 'tie' ? 'Tie' : `Model ${m.better}`}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Flags Comparison */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {[{ label: 'Model A Flags', data: ma }, { label: 'Model B Flags', data: mb }].map(({ label, data }) => {
                        const flags = (data.stages || []).flatMap(s => s?.flags || [])
                        return (
                            <div key={label} className="card">
                                <div className="section-header">
                                    <span className="section-dot" style={{ background: 'var(--red)' }} />
                                    {label} ({flags.length})
                                </div>
                                {flags.length === 0
                                    ? <p style={{ fontSize: '0.85rem', color: 'var(--green)' }}>✓ No flags</p>
                                    : flags.map((f, i) => (
                                        <div key={i} className="flag-item"><span className="flag-icon">▲</span>{f}</div>
                                    ))
                                }
                            </div>
                        )
                    })}
                </div>

            </div>
        </div>
    )
}
