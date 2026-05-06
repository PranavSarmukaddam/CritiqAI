import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AuditVisualizer from '../components/AuditVisualizer'
import { API_BASE } from '../config'

const PIPELINE = [
    { num: '01', label: 'Data Integrity',   desc: 'Missing values, duplicates, distribution analysis' },
    { num: '02', label: 'Performance',      desc: 'F1 score, AUC, cross-validation consistency'       },
    { num: '03', label: 'Bias & Fairness',  desc: 'Disparate impact, group accuracy parity'           },
    { num: '04', label: 'Robustness',       desc: 'Noise sensitivity, bootstrap stability'             },
    { num: '05', label: 'Explainability',   desc: 'SHAP analysis, feature importance ranking'         },
]

const STATS = [
    { value: '5',    label: 'Audit Stages' },
    { value: '15+',  label: 'Risk Metrics' },
    { value: '<10s', label: 'Avg Runtime'  },
    { value: 'PDF',  label: 'Export Ready' },
]

function DropZone({ label, hint, accept, file, onFile, id }) {
    const ref  = useRef()
    const [over, setOver] = useState(false)

    return (
        <div
            onClick={() => ref.current.click()}
            onDragOver={e  => { e.preventDefault(); setOver(true)  }}
            onDragLeave={() => setOver(false)}
            onDrop={e => {
                e.preventDefault(); setOver(false)
                const f = e.dataTransfer.files[0]; if (f) onFile(f)
            }}
            style={{
                border: `1px ${file ? 'solid' : 'dashed'} ${file ? 'var(--green-border)' : over ? 'var(--accent-border)' : 'var(--border)'}`,
                borderRadius: 'var(--r-lg)',
                padding: '1.4rem',
                cursor: 'pointer',
                transition: 'all 0.22s var(--ease)',
                background: file ? 'var(--green-soft)' : over ? 'var(--accent-soft)' : 'var(--bg-2)',
                display: 'flex', alignItems: 'center', gap: '12px',
            }}
        >
            <input id={id} ref={ref} type="file" accept={accept} style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]) }} />

            <div style={{
                width: 38, height: 38, borderRadius: 'var(--r-md)',
                background: file ? 'var(--green-soft)' : 'var(--bg-3)',
                border: `1px solid ${file ? 'var(--green-border)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.85rem', flexShrink: 0,
                color: file ? 'var(--green)' : 'var(--t3)',
                fontWeight: 700,
                transition: 'all 0.22s var(--ease)',
            }}>
                {file ? '+' : '^'}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: file ? 'var(--green)' : 'var(--t1)', marginBottom: 2 }}>
                    {file ? file.name : label}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file ? `${(file.size / 1024).toFixed(1)} KB - click to replace` : hint}
                </div>
            </div>
        </div>
    )
}

export default function Upload() {
    const navigate = useNavigate()
    const [mode,      setMode]      = useState('choose')
    const [csvFile,   setCsvFile]   = useState(null)
    const [modelFile, setModelFile] = useState(null)
    const [loading,   setLoading]   = useState(false)
    const [error,     setError]     = useState(null)

    const handleDemoAudit = () => navigate('/audit', { state: { mode: 'demo' } })

    const handleUploadAudit = async () => {
        if (!csvFile || !modelFile) return
        setError(null); setLoading(true)
        const form = new FormData()
        form.append('csv_file',   csvFile)
        form.append('model_file', modelFile)
        try {
            const res  = await fetch(`${API_BASE}/audit/upload`, { method: 'POST', body: form })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || `Server error ${res.status}`)
            navigate('/report', { state: { result: data } })
        } catch (e) { setError(e.message); setLoading(false) }
    }

    /* ── CHOOSE SCREEN ── */
    if (mode === 'choose') return (
        <div className="page fade-up">
            <div className="container" style={{ paddingTop: '3rem', paddingBottom: '6rem' }}>

                {/* HERO — two-column */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '4rem',
                    alignItems: 'center',
                    marginBottom: '5rem',
                }}>
                    {/* Left — copy */}
                    <div>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 7,
                            padding: '4px 13px', borderRadius: 'var(--r-full)',
                            border: '1px solid var(--accent-border)',
                            background: 'var(--accent-soft)',
                            marginBottom: '1.6rem',
                            fontSize: '0.67rem', fontWeight: 600,
                            color: 'var(--accent)',
                            fontFamily: 'JetBrains Mono, monospace',
                            letterSpacing: '0.06em',
                        }}>
                            <span style={{
                                width: 5, height: 5, borderRadius: '50%',
                                background: 'var(--accent)',
                                animation: 'pulse 2s infinite',
                            }} />
                            AUTONOMOUS AUDIT AGENT
                        </div>

                        <h1 style={{ marginBottom: '1.1rem', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '-0.02em' }}>
                            Audit any ML model{' '}
                            <span className="gradient-text">in seconds.</span>
                        </h1>

                        <p style={{ fontSize: '0.95rem', maxWidth: 460, marginBottom: '2.2rem', lineHeight: 1.8 }}>
                            Enterprise-grade governance pipeline. Analyze data quality,
                            performance, bias, robustness &amp; explainability - then export
                            a compliance report.
                        </p>

                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button id="demo-audit-btn" className="btn btn-primary btn-lg" onClick={handleDemoAudit}>
                                Run Demo Audit
                            </button>
                            <button id="upload-own-btn" className="btn btn-ghost btn-lg" onClick={() => setMode('upload')}>
                                Upload Own Model
                            </button>
                        </div>
                    </div>

                    {/* Right — live audit scatter visualizer */}
                    <AuditVisualizer />
                </div>

                {/* STATS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '5rem' }}>
                    {STATS.map((s, i) => (
                        <div key={i} className="stat-card">
                            <div className="stat-value">{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* PIPELINE */}
                <div style={{ marginBottom: '5rem' }}>
                    <div style={{ marginBottom: '2.2rem' }}>
                        <h2 style={{ marginBottom: 8 }}>
                            5-Stage{' '}
                            <span style={{ color: 'var(--accent)' }}>Governance</span>{' '}
                            Pipeline
                        </h2>
                        <p style={{ maxWidth: 500 }}>
                            Every model is evaluated across five critical dimensions before receiving a governance score.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                        {PIPELINE.map((step, i) => (
                            <div key={i} className="glow-card" style={{ padding: '1.3rem 1rem' }}>
                                <div style={{
                                    fontFamily: 'JetBrains Mono, monospace',
                                    fontSize: '0.58rem', fontWeight: 700,
                                    color: 'var(--accent)',
                                    marginBottom: '0.65rem',
                                    letterSpacing: '0.07em',
                                }}>
                                    STAGE {step.num}
                                </div>
                                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--t1)', marginBottom: 5 }}>
                                    {step.label}
                                </div>
                                <p style={{ fontSize: '0.7rem', margin: 0, lineHeight: 1.5, color: 'var(--t3)' }}>
                                    {step.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* MODE CARDS */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <button onClick={handleDemoAudit} style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
                        <div className="glow-card" style={{ minHeight: 200 }}>
                            <div style={{
                                width: 38, height: 38, borderRadius: 'var(--r-md)',
                                background: 'var(--accent)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.85rem', marginBottom: '1.1rem',
                                color: 'var(--bg-0)', fontWeight: 800,
                                boxShadow: 'var(--accent-glow)',
                            }}>▶</div>
                            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--t1)', marginBottom: 7 }}>
                                Run Demo Audit
                            </div>
                            <p style={{ fontSize: '0.82rem', margin: 0, lineHeight: 1.65 }}>
                                One-click audit with our bundled synthetic dataset and RandomForest model. Zero setup required.
                            </p>
                            <div style={{ marginTop: '1.4rem', fontSize: '0.76rem', color: 'var(--accent)', fontWeight: 600 }}>
                                Start Demo →
                            </div>
                        </div>
                    </button>

                    <button onClick={() => setMode('upload')} style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
                        <div className="glow-card" style={{ minHeight: 200, borderColor: 'var(--border)' }}>
                            <div style={{
                                width: 38, height: 38, borderRadius: 'var(--r-md)',
                                background: 'var(--bg-3)',
                                border: '1px solid var(--border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.85rem', marginBottom: '1.1rem',
                                color: 'var(--t2)', fontWeight: 800,
                            }}>^</div>
                            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--t1)', marginBottom: 7 }}>
                                Upload Own Model
                            </div>
                            <p style={{ fontSize: '0.82rem', margin: 0, lineHeight: 1.65 }}>
                                Bring your own CSV dataset and scikit-learn model for a comprehensive governance audit.
                            </p>
                            <div style={{ marginTop: '1.4rem', fontSize: '0.76rem', color: 'var(--t2)', fontWeight: 600 }}>
                                Upload Files →
                            </div>
                        </div>
                    </button>
                </div>

            </div>
        </div>
    )

    /* ── UPLOAD SCREEN ── */
    const canSubmit = csvFile && modelFile && !loading
    return (
        <div className="page fade-up">
            <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem', maxWidth: 620 }}>

                <button className="btn btn-ghost" style={{ marginBottom: '1.5rem' }}
                    onClick={() => { setMode('choose'); setError(null); setCsvFile(null); setModelFile(null) }}>
                    ← Back
                </button>

                <h2 style={{ marginBottom: 8 }}>Upload Your Model</h2>
                <p style={{ marginBottom: '1.5rem' }}>
                    Provide your dataset and trained model for a full governance audit.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
                    <DropZone id="csv-upload" label="Dataset CSV"
                        accept=".csv"
                        hint="Must include a 'label' column - all others are features"
                        file={csvFile} onFile={setCsvFile} />
                    <DropZone id="model-upload" label="Trained Model"
                        accept=".joblib,.pkl,.pickle"
                        hint="Scikit-learn model saved via joblib.dump()"
                        file={modelFile} onFile={setModelFile} />
                </div>

                {error && (
                    <div style={{
                        background: 'var(--red-soft)', border: '1px solid var(--red-border)',
                        borderRadius: 'var(--r-md)', padding: '11px 14px',
                        color: 'var(--red)', fontSize: '0.82rem', marginBottom: '0.8rem',
                    }}>
                        <strong>Error:</strong> {error}
                    </div>
                )}

                <button id="run-upload-audit-btn" className="btn btn-primary btn-lg"
                    style={{ width: '100%', justifyContent: 'center', opacity: canSubmit ? 1 : 0.3 }}
                    onClick={handleUploadAudit} disabled={!canSubmit}>
                    {loading ? <><span className="spin">+</span> Running Audit…</> : 'Run Audit'}
                </button>

                <div style={{
                    marginTop: '1rem', padding: '13px 15px',
                    background: 'var(--bg-2)', border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)',
                }}>
                    <div style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 600, color: 'var(--t3)', fontSize: '0.58rem',
                        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7,
                    }}>
                        REQUIREMENTS
                    </div>
                    <ul style={{ fontSize: '0.77rem', color: 'var(--t3)', paddingLeft: '1.2rem', lineHeight: 2.1 }}>
                        <li>CSV must have a <code>label</code> column (binary, multiclass, or continuous)</li>
                        <li>All other columns must be numeric features</li>
                        <li>Model must be scikit-learn compatible (.joblib / .pkl)</li>
                        <li>Supports binary, multi-class classification, and regression</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
