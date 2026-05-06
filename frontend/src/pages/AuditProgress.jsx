import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../config'

const STAGES = [
    { num: '01', label: 'Data Integrity & Distribution' },
    { num: '02', label: 'Performance Consistency' },
    { num: '03', label: 'Bias & Fairness Detection' },
    { num: '04', label: 'Robustness & Stability' },
    { num: '05', label: 'Explainability (SHAP)' },
    { num: '06', label: 'Risk Scoring & Governance' },
]
const DURATIONS = [800, 1000, 850, 950, 1100, 600]

export default function AuditProgress() {
    const navigate = useNavigate()
    const [currentStage, setCurrentStage] = useState(-1)
    const [completed, setCompleted] = useState([])
    const [auditResult, setAuditResult] = useState(null)
    const [error, setError] = useState(null)
    const [elapsed, setElapsed] = useState(0)
    const started = useRef(false)

    useEffect(() => {
        if (started.current) return
        started.current = true
        const timer = setInterval(() => setElapsed(e => e + 1), 1000)
        runAudit(timer)
        return () => clearInterval(timer)
    }, [])

    const runAudit = async (timer) => {
        for (let i = 0; i < STAGES.length; i++) {
            setCurrentStage(i)
            await sleep(DURATIONS[i])
            setCompleted(prev => [...prev, i])
        }
        setCurrentStage(-1)
        try {
            const res = await fetch(`${API_BASE}/audit/demo`, { method: 'POST' })
            if (!res.ok) throw new Error(`API error ${res.status}`)
            const data = await res.json()
            clearInterval(timer)
            setAuditResult(data)
            setTimeout(() => navigate('/report', { state: { result: data } }), 800)
        } catch (e) { setError(e.message); clearInterval(timer) }
    }

    const sleep = ms => new Promise(r => setTimeout(r, ms))
    const progress = Math.round((completed.length / STAGES.length) * 100)

    return (
        <div className="page fade-up">
            <div className="container" style={{ paddingTop: '3rem', maxWidth: 600 }}>

                <div style={{ marginBottom: '2.5rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7,
                        padding: '3px 11px', borderRadius: 'var(--r-full)',
                        border: '1px solid var(--primary-border)',
                        background: 'var(--primary-soft)',
                        marginBottom: '1rem',
                        fontSize: '0.65rem', fontWeight: 600,
                        color: 'var(--primary)', fontFamily: 'JetBrains Mono, monospace',
                    }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1.2s infinite' }} />
                        RUNNING PIPELINE
                    </div>
                    <h2 style={{ marginBottom: 8 }}>Evaluating Model</h2>
                    <p>Auditing across all governance dimensions.</p>
                </div>

                {/* Progress */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'var(--t3)', fontWeight: 500 }}>PROGRESS</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'var(--primary)' }}>
                            {progress}% · {elapsed}s
                        </span>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                </div>

                {/* Stages */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {STAGES.map((s, i) => {
                        const done = completed.includes(i)
                        const active = currentStage === i
                        return (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '13px 17px',
                                borderBottom: i < STAGES.length - 1 ? '1px solid var(--border)' : 'none',
                                background: active ? 'var(--primary-soft)' : done ? 'var(--green-soft)' : 'transparent',
                                transition: 'background 0.2s',
                            }}>
                                <div style={{
                                    width: 30, height: 30, borderRadius: 'var(--r-md)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.62rem', flexShrink: 0,
                                    fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
                                    background: done ? 'var(--green-soft)' : active ? 'var(--primary-soft)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${done ? 'var(--green-border)' : active ? 'var(--primary-border)' : 'var(--border)'}`,
                                    color: done ? 'var(--green)' : active ? 'var(--primary)' : 'var(--t3)',
                                }}>
                                    {done ? '+' : s.num}
                                </div>

                                <span style={{
                                    flex: 1, fontWeight: 600, fontSize: '0.83rem',
                                    color: done ? 'var(--green)' : active ? 'var(--primary)' : 'var(--t3)',
                                    transition: 'color 0.2s',
                                }}>{s.label}</span>

                                {active && <span className="spin" style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>+</span>}
                                {done && (
                                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'var(--green)' }}>
                                        {(DURATIONS[i] / 1000).toFixed(1)}s
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>

                {error && (
                    <div style={{
                        background: 'var(--red-soft)', border: '1px solid var(--red-border)',
                        borderRadius: 'var(--r-md)', padding: '11px 14px',
                        color: 'var(--red)', fontSize: '0.82rem', marginTop: '1rem',
                    }}>
                        <strong>Audit failed:</strong> {error}
                    </div>
                )}

                {auditResult && (
                    <div style={{
                        background: 'var(--green-soft)', border: '1px solid var(--green-border)',
                        borderRadius: 'var(--r-md)', padding: '11px 14px',
                        color: 'var(--green)', fontSize: '0.84rem', fontWeight: 600,
                        marginTop: '1rem',
                    }}>
                        Audit complete - redirecting to report…
                    </div>
                )}
            </div>
        </div>
    )
}
