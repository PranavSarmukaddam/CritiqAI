import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts'

const RISK_BADGE = {
    Low: { cls: 'badge-low', label: 'Low Risk' },
    Medium: { cls: 'badge-medium', label: 'Medium Risk' },
    High: { cls: 'badge-high', label: 'High Risk' },
    Critical: { cls: 'badge-critical', label: 'Critical Risk' },
}

const STAGE_COLORS = {
    data_integrity: '#38bdf8',
    performance: '#00d4ff',
    fairness: '#f43f5e',
    robustness: '#10b981',
    explainability: '#8b5cf6',
}

function RiskGauge({ score, color }) {
    const r = 68
    const circ = 2 * Math.PI * r
    const offset = circ * (1 - score / 100)
    return (
        <div className="gauge-container">
            <div className="gauge-ring">
                <svg width="170" height="170" viewBox="0 0 170 170">
                    <circle cx="85" cy="85" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                    <circle cx="85" cy="85" r={r} fill="none"
                        stroke={color || 'var(--crimson)'}
                        strokeWidth="12"
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
                    />
                </svg>
                <div className="gauge-text">
                    <span className="gauge-score" style={{ color: color || 'var(--crimson)' }}>{score}</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--t3)', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>/ 100</span>
                </div>
            </div>
        </div>
    )
}

function Metric({ label, value, color, raw }) {
    const display = raw ? (value ?? '-') : (typeof value === 'number'
        ? (value < 2 ? (value * 100).toFixed(1) + '%' : value)
        : (value ?? '-'))
    return (
        <div className="metric-box">
            <div className="metric-value" style={{ color: color || 'var(--text-primary)' }}>{display}</div>
            <div className="metric-label">{label}</div>
        </div>
    )
}

function SectionTitle({ label, color }) {
    return (
        <div className="section-header">
            <span className="section-dot" style={{ background: color || 'var(--crimson)' }} />
            {label}
        </div>
    )
}

/* -- Confusion Matrix Heatmap (supports NxN) -- */
function ConfusionMatrix({ matrix }) {
    if (!matrix || matrix.length < 2) return null
    const max = Math.max(...matrix.flat())
    const n = matrix.length
    const labels = Array.from({ length: n }, (_, i) => `Pred ${i}`)
    return (
        <div style={{ marginTop: '1rem' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Confusion Matrix
            </div>
            <div style={{ display: 'inline-grid', gridTemplateColumns: `auto ${labels.map(() => '1fr').join(' ')}`, gap: 2 }}>
                <div />
                {labels.map(l => (
                    <div key={l} style={{
                        textAlign: 'center', fontSize: '0.65rem', fontWeight: 700,
                        color: 'var(--t3)', padding: '4px 8px',
                    }}>{l}</div>
                ))}
                {matrix.map((row, i) => (
                    <>
                        <div key={`label-${i}`} style={{
                            display: 'flex', alignItems: 'center', fontSize: '0.65rem',
                            fontWeight: 700, color: 'var(--t3)', paddingRight: 8,
                        }}>True {i}</div>
                        {row.map((val, j) => {
                            const intensity = max > 0 ? val / max : 0
                            const isDiag = i === j
                            return (
                                <div key={`${i}-${j}`} style={{
                                    padding: '10px 12px', textAlign: 'center',
                                    fontFamily: 'JetBrains Mono, monospace',
                                    fontWeight: 800, fontSize: n > 3 ? '0.75rem' : '0.95rem',
                                    borderRadius: 6,
                                    background: isDiag
                                        ? `rgba(16, 185, 129, ${0.1 + intensity * 0.3})`
                                        : `rgba(240, 96, 96, ${0.1 + intensity * 0.3})`,
                                    color: isDiag ? 'var(--green)' : 'var(--red)',
                                    transition: 'all 0.3s',
                                }}>{val}</div>
                            )
                        })}
                    </>
                ))}
            </div>
        </div>
    )
}

export default function Report() {
    const { state } = useLocation()
    const navigate = useNavigate()
    const [result, setResult] = useState(state?.result || null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => { setTimeout(() => setMounted(true), 80) }, [])

    if (!result) return (
        <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <div style={{ textAlign: 'center', maxWidth: 380 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.3 }}>o</div>
                <h2 style={{ marginBottom: '0.65rem' }}>No Audit Data</h2>
                <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    Run a demo audit or upload your own model to see the governance report.
                </p>
                <button className="btn btn-primary" onClick={() => navigate('/')}>{'<-'} Back to Home</button>
            </div>
        </div>
    )

    const sum = result.summary
    const stages = result.stages || []
    const s1 = stages[0]
    const s2 = stages[1]
    const s3 = stages[2]
    const s4 = stages[3]
    const s6 = stages[4]
    const s8 = stages.find(s => s?.stage === 8) || null
    const s5 = stages.find(s => s?.stage === 5) || stages[stages.length - 1]
    const exp = result.explainability || {}
    const adv = result.adversarial || {}
    const badge = RISK_BADGE[sum.risk_level] || RISK_BADGE['Medium']
    const taskType = result.task_type || s2?.task_type || 'binary_classification'
    const isRegression = taskType === 'regression'
    const isMulticlass = taskType === 'multiclass_classification'

    // Chart data
    const noiseChartData = (s4?.noise_sensitivity || []).map(r => ({
        noise: `sigma=${r.noise_std}`,
        metric: isRegression ? +r.metric.toFixed(4) : +(r.metric * 100).toFixed(1),
        drift: +(r.prediction_drift * 100).toFixed(1),
    }))

    const featureChartData = (exp?.top_features || []).map(f => ({
        name: f.feature.length > 10 ? f.feature.slice(0, 10) + '...' : f.feature,
        importance: +(f.importance * 100).toFixed(1),
        fullName: f.feature,
    }))

    const radarData = sum?.stage_scores ? Object.entries(sum.stage_scores).map(([key, val]) => ({
        subject: key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
        score: val,
        fullMark: 100,
    })) : []

    const exportReport = async () => {
        if (!result?.audit_id) return
        try {
            const res = await fetch(`/audits/${result.audit_id}/pdf`)
            if (!res.ok) throw new Error('PDF export failed')
            
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${result.audit_id}_report.pdf`
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)
        } catch (e) {
            console.error(e)
            alert('Failed to download PDF from server.')
        }
    }

    return (
        <div className={`page ${mounted ? 'fade-up' : ''}`}>
            <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>

                {/* ---- Header ---- */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem',
                    paddingBottom: '2rem', borderBottom: '1px solid var(--border)',
                }}>
                    <div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: 'var(--t3)', marginBottom: 8, letterSpacing: '0.04em' }}>
                            {result.audit_id}
                        </div>
                        <h2 style={{ marginBottom: 8 }}>Governance Audit Report</h2>
                        <p style={{ fontSize: '0.88rem' }}>
                            Model: <strong style={{ color: 'var(--t1)', fontWeight: 600 }}>{result.model_name}</strong>
                            <span style={{ color: 'var(--t3)', margin: '0 8px' }}>-</span>
                            Completed in <span style={{ color: 'var(--crimson)', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{result.elapsed_seconds}s</span>
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                        <button id="export-report-btn" className="btn btn-primary" onClick={exportReport}>
                            v Save as PDF
                        </button>
                        <Link to="/history" className="btn btn-outline">History</Link>
                        <Link to="/" className="btn btn-ghost">{'<-'} New Audit</Link>
                    </div>
                </div>

                {/* ---- Risk Score + Radar Chart ---- */}
                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 280px', gap: '1px', marginBottom: '1px', background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>

                    {/* Gauge card */}
                    <div style={{
                        background: 'var(--bg-2)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '2rem 1.5rem', gap: '0.85rem',
                    }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                            RISK SCORE
                        </div>
                        <RiskGauge score={sum.composite_risk_score} color={sum.risk_color} />
                        <span className={`badge ${badge.cls}`}>{badge.label}</span>
                        <p style={{ fontSize: '0.72rem', textAlign: 'center', color: 'var(--t3)', lineHeight: 1.5 }}>
                            {sum.risk_description}
                        </p>
                    </div>

                    {/* Stage bars */}
                    <div style={{ background: 'var(--bg-2)', padding: '1.5rem' }}>
                        <SectionTitle label="Risk by Stage" />
                        <div className="bar-chart" style={{ marginTop: '0.5rem' }}>
                            {Object.entries(sum.stage_scores).map(([key, val]) => (
                                <div key={key} className="bar-row">
                                    <div className="bar-label" style={{ textTransform: 'capitalize' }}>
                                        {key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                    </div>
                                    <div className="bar-track">
                                        <div className="bar-fill" style={{ width: `${val}%`, background: STAGE_COLORS[key] || 'var(--crimson)' }} />
                                    </div>
                                    <div className="bar-val">{val}</div>
                                </div>
                            ))}
                        </div>
                        <div className="divider" />
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                            <strong style={{ color: sum.total_flags > 0 ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>
                                {sum.total_flags} flag{sum.total_flags !== 1 ? 's' : ''}
                            </strong> detected across all stages
                        </div>
                    </div>

                    {/* Radar Chart */}
                    {radarData.length > 0 && (
                        <div style={{ background: 'var(--bg-2)', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ResponsiveContainer width="100%" height={220}>
                                <RadarChart data={radarData} outerRadius={70}>
                                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                                    <PolarAngleAxis
                                        dataKey="subject"
                                        tick={{ fill: 'var(--t3)', fontSize: 9 }}
                                    />
                                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar
                                        dataKey="score" stroke="var(--crimson)" fill="var(--crimson)"
                                        fillOpacity={0.15} strokeWidth={2}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* ---- Performance metrics ---- */}
                <div className="card" style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
                    <SectionTitle label={`Stage 2 - Performance ${isRegression ? '(Regression)' : isMulticlass ? '(Multi-Class)' : ''}`} color="#00d4ff" />
                    {isRegression ? (
                        <div className="metric-grid">
                            <Metric label="MSE" value={s2?.metrics?.mse} color="#00d4ff" raw />
                            <Metric label="RMSE" value={s2?.metrics?.rmse} color="#6c9fff" raw />
                            <Metric label="MAE" value={s2?.metrics?.mae} color="#c084fc" raw />
                            <Metric label="R2" value={s2?.metrics?.r2} color="#e879f9" raw />
                            <Metric label="CV Mean (R2)" value={s2?.cross_validation?.mean} color="#fb923c" raw />
                            <Metric label="CV Std" value={s2?.cross_validation?.std} color="var(--text-secondary)" raw />
                        </div>
                    ) : (
                        <div className="metric-grid">
                            <Metric label="Accuracy" value={s2?.metrics?.accuracy} color="#00d4ff" />
                            <Metric label="Precision" value={s2?.metrics?.precision} color="#6c9fff" />
                            <Metric label="Recall" value={s2?.metrics?.recall} color="#c084fc" />
                            <Metric label={isMulticlass ? 'Macro F1' : 'F1 Score'} value={s2?.metrics?.f1_score} color="#e879f9" />
                            {s2?.metrics?.roc_auc != null && (
                                <Metric label="ROC-AUC" value={s2.metrics.roc_auc} color="var(--green)" />
                            )}
                            <Metric label="CV Mean" value={s2?.cross_validation?.mean} color="#fb923c" />
                            <Metric label="CV Std" value={s2?.cross_validation?.std} color="var(--text-secondary)" />
                        </div>
                    )}
                    {/* Confusion Matrix - only for classification */}
                    {!isRegression && <ConfusionMatrix matrix={s2?.confusion_matrix} />}
                    {s2?.flags?.length > 0 && (
                        <div style={{ marginTop: '1.25rem' }}>
                            {s2.flags.map((f, i) => <div key={i} className="flag-item"><span className="flag-icon">^</span>{f}</div>)}
                        </div>
                    )}
                </div>

                {/* ---- Data + Fairness ---- */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    {/* Stage 1 - Data */}
                    <div className="card">
                        <SectionTitle label="Stage 1 - Data Integrity" color="var(--blue)" />
                        <table className="data-table">
                            <tbody>
                                <tr>
                                    <td>Total Rows</td>
                                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {s1?.summary?.total_rows ?? '-'}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Duplicate Rows</td>
                                    <td style={{
                                        fontWeight: 700,
                                        color: (s1?.summary?.duplicate_rows ?? 0) > 0 ? 'var(--accent)' : 'var(--green)',
                                    }}>
                                        {s1?.summary?.duplicate_rows ?? '-'}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Missing Values</td>
                                    <td style={{
                                        fontWeight: 700,
                                        color: (s1?.summary?.missing_pct_total ?? 0) > 5 ? 'var(--red)' : 'var(--green)',
                                    }}>
                                        {s1?.summary?.missing_pct_total ?? '-'}%
                                    </td>
                                </tr>
                                <tr>
                                    <td>Imbalance Ratio</td>
                                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                        {s1?.summary?.imbalance_ratio ?? 'N/A'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        {s1?.flags?.length > 0 && (
                            <div style={{ marginTop: '1rem' }}>
                                {s1.flags.map((f, i) => <div key={i} className="flag-item"><span className="flag-icon">^</span>{f}</div>)}
                            </div>
                        )}
                    </div>

                    {/* Stage 3 - Fairness */}
                    <div className="card">
                        <SectionTitle label="Stage 3 - Bias & Fairness" color="var(--red)" />
                        {s3?.group_results && Object.keys(s3.group_results).length > 0 ? (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Group</th><th>Size</th>
                                        <th>{isRegression ? 'MAE' : 'Accuracy'}</th>
                                        <th>Gap</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(s3.group_results).map(([name, g]) => {
                                        const metricVal = isRegression ? g.mae : g.accuracy
                                        const gapVal = isRegression ? g.mae_gap_vs_overall : g.accuracy_gap_vs_overall
                                        return (
                                            <tr key={name}>
                                                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{name}</td>
                                                <td>{g.size}</td>
                                                <td>{isRegression ? metricVal?.toFixed(4) : (metricVal * 100).toFixed(1) + '%'}</td>
                                                <td style={{
                                                    fontWeight: 700,
                                                    color: Math.abs(gapVal || 0) > (isRegression ? 0.5 : 0.05) ? 'var(--red)' : 'var(--green)',
                                                }}>
                                                    {isRegression ? gapVal?.toFixed(4) : `${gapVal > 0 ? '+' : ''}${(gapVal * 100).toFixed(1)}%`}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        ) : <p style={{ fontSize: '0.85rem' }}>No group data available.</p>}
                        {s3?.disparate_impact_ratio != null && (
                            <div style={{ marginTop: '1rem', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                                {isRegression ? 'Disparate Error Ratio' : 'Disparate Impact Ratio'}:{' '}
                                <strong style={{ color: s3.disparate_impact_ratio < 0.8 ? 'var(--red)' : 'var(--green)' }}>
                                    {s3.disparate_impact_ratio}
                                </strong>
                                {s3.disparate_impact_ratio < 0.8 ? ' - below 0.8 threshold' : ' - within range'}
                            </div>
                        )}
                        {s3?.flags?.length > 0 && (
                            <div style={{ marginTop: '1rem' }}>
                                {s3.flags.map((f, i) => <div key={i} className="flag-item"><span className="flag-icon">^</span>{f}</div>)}
                            </div>
                        )}
                    </div>
                </div>

                {/* ---- Robustness with Chart ---- */}
                <div className="card" style={{ marginBottom: '1.25rem' }}>
                    <SectionTitle label="Stage 4 - Robustness Under Noise" color="var(--green)" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr><th>Noise sigma</th><th>{isRegression ? 'MAE' : 'Accuracy'}</th><th>{isRegression ? 'Delta Error' : 'Drop'}</th><th>Pred Drift</th></tr>
                                </thead>
                                <tbody>
                                    {(s4?.noise_sensitivity || []).map(r => (
                                        <tr key={r.noise_std}>
                                            <td style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>{r.noise_std}</td>
                                            <td>{isRegression ? r.metric?.toFixed(4) : (r.metric * 100).toFixed(1) + '%'}</td>
                                            <td style={{
                                                fontWeight: 700,
                                                color: Math.abs(r.metric_delta) > (isRegression ? 0.5 : 0.10) ? 'var(--red)' : Math.abs(r.metric_delta) > (isRegression ? 0.2 : 0.05) ? 'var(--accent)' : 'var(--green)',
                                            }}>
                                                {isRegression ? `+${r.metric_delta?.toFixed(4)}` : `-${(r.metric_delta * 100).toFixed(1)}%`}
                                            </td>
                                            <td style={{ color: 'var(--text-muted)' }}>{(r.prediction_drift * 100).toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ marginTop: '0.85rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                Bootstrap stability std:{' '}
                                <strong style={{ color: (s4?.bootstrap_stability?.std ?? 0) > 0.03 ? 'var(--red)' : 'var(--green)' }}>
                                    {s4?.bootstrap_stability?.std ?? '-'}
                                </strong>
                            </div>
                        </div>
                        {noiseChartData.length > 0 && (
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={noiseChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="noise" tick={{ fill: 'var(--t3)', fontSize: 10 }} />
                                    <YAxis domain={isRegression ? ['auto', 'auto'] : [0, 100]} tick={{ fill: 'var(--t3)', fontSize: 10 }} />
                                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                                    <Line type="monotone" dataKey="metric" name={isRegression ? 'MAE' : 'Accuracy %'} stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="drift" name="Drift %" stroke="#fb923c" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 5" />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    {s4?.flags?.length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                            {s4.flags.map((f, i) => <div key={i} className="flag-item"><span className="flag-icon">^</span>{f}</div>)}
                        </div>
                    )}
                </div>

                {/* ---- Explainability with SHAP Chart ---- */}
                <div className="card" style={{ marginBottom: '1.25rem' }}>
                    <SectionTitle label="Stage 6 - Explainability (SHAP)" color="#a78bfa" />
                    {exp?.top_features?.length > 0 ? (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                        Feature Importance (mean |SHAP|)
                                    </div>
                                    <div className="bar-chart">
                                        {exp.top_features.map((feat) => (
                                            <div key={feat.feature} className="bar-row">
                                                <div className="bar-label" style={{ width: '120px' }}>{feat.feature}</div>
                                                <div className="bar-track">
                                                    <div className="bar-fill" style={{
                                                        width: `${Math.min(feat.importance * 100, 100)}%`,
                                                        background: 'linear-gradient(90deg, #a78bfa 0%, #c4b5fd 100%)',
                                                    }} />
                                                </div>
                                                <div className="bar-val">{(feat.importance * 100).toFixed(1)}%</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {featureChartData.length > 0 && (
                                    <ResponsiveContainer width="100%" height={Math.max(180, featureChartData.length * 24)}>
                                        <BarChart data={featureChartData} layout="vertical" margin={{ left: 60 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis type="number" tick={{ fill: 'var(--t3)', fontSize: 10 }} />
                                            <YAxis type="category" dataKey="name" tick={{ fill: 'var(--t3)', fontSize: 10 }} width={60} />
                                            <Tooltip
                                                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                                                formatter={(val) => [val.toFixed(1) + '%', 'Importance']}
                                                labelFormatter={(l, p) => p?.[0]?.payload?.fullName || l}
                                            />
                                            <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                                                {featureChartData.map((_, i) => (
                                                    <Cell key={i} fill={`hsl(${260 + i * 12}, 70%, 65%)`} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                            {exp?.summary_statistics && (
                                <div style={{
                                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem',
                                    marginTop: '1rem', padding: '0.75rem',
                                    background: 'var(--bg-surface)', borderRadius: 'var(--r-md)',
                                }}>
                                    <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mean |SHAP|</div><div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{exp.summary_statistics.mean_abs_shap}</div></div>
                                    <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Max |SHAP|</div><div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{exp.summary_statistics.max_abs_shap}</div></div>
                                    <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Std Dev</div><div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{exp.summary_statistics.std_shap}</div></div>
                                    <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sparsity</div><div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{(exp.summary_statistics.sparsity * 100).toFixed(1)}%</div></div>
                                </div>
                            )}
                            {exp?.sample_explanations?.length > 0 && (
                                <div style={{ marginTop: '1rem' }}>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Sample Explanations</div>
                                    {exp.sample_explanations.slice(0, 3).map((sample, i) => (
                                        <div key={i} style={{ padding: '0.75rem', marginBottom: '0.5rem', background: 'var(--bg-surface)', borderRadius: 'var(--r-md)', fontSize: '0.82rem' }}>
                                            <div style={{ color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                                                Sample #{sample.sample_index} (True: {sample.true_label})
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                {sample.top_contributors.map((contrib, j) => (
                                                    <span key={j} style={{
                                                        padding: '0.2rem 0.5rem', borderRadius: 'var(--r-sm)',
                                                        background: contrib.direction === 'increases' ? 'var(--green-soft)' : 'var(--red-soft)',
                                                        color: contrib.direction === 'increases' ? 'var(--green)' : 'var(--red)',
                                                        fontSize: '0.75rem',
                                                    }}>
                                                        {contrib.feature}: {contrib.direction === 'increases' ? '+' : ''}{contrib.contribution.toFixed(3)}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            No explainability data available.
                        </p>
                    )}
                    {exp?.model_type && (
                        <div style={{ marginTop: '0.85rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Model type: <strong style={{ color: 'var(--text-secondary)' }}>{exp.model_type}</strong>
                            {exp?.samples_analyzed && <span> - Samples: {exp.samples_analyzed}</span>}
                        </div>
                    )}
                    {exp?.flags?.length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                            {exp.flags.map((f, i) => <div key={i} className="flag-item"><span className="flag-icon">^</span>{f}</div>)}
                        </div>
                    )}
                </div>

                {/* ---- Adversarial Attack Results ---- */}
                {(adv?.feature_sensitivity?.length > 0 || adv?.flip_analysis?.samples_tested > 0) && (
                    <div className="card" style={{ marginBottom: '1.25rem' }}>
                        <SectionTitle label="Stage 8 - Adversarial Attacks" color="#ef4444" />

                        {/* Attack Summary Metrics */}
                        <div className="metric-grid" style={{ marginBottom: '1.25rem' }}>
                            <Metric label="Baseline Acc" value={adv.baseline_accuracy} color="#10b981" />
                            <Metric label="Flip Rate" value={adv.flip_analysis?.flip_success_rate} color="#ef4444" />
                            <Metric label="Samples Flipped" value={`${adv.flip_analysis?.samples_flipped}/${adv.flip_analysis?.samples_tested}`} color="#fb923c" />
                            {adv.flip_analysis?.avg_flip_magnitude != null && (
                                <Metric label="Avg Flip Mag" value={adv.flip_analysis.avg_flip_magnitude} color="#8b5cf6" />
                            )}
                        </div>

                        {/* Feature Sensitivity */}
                        {adv.feature_sensitivity?.length > 0 && (
                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                    Feature Sensitivity Ranking (flip rate under perturbation)
                                </div>
                                <div className="bar-chart">
                                    {adv.feature_sensitivity.slice(0, 8).map(feat => (
                                        <div key={feat.feature} className="bar-row">
                                            <div className="bar-label" style={{ width: '120px' }}>{feat.feature}</div>
                                            <div className="bar-track">
                                                <div className="bar-fill" style={{
                                                    width: `${Math.min(feat.flip_rate * 100, 100)}%`,
                                                    background: feat.flip_rate > 0.15 ? 'linear-gradient(90deg, #ef4444, #f87171)' :
                                                        feat.flip_rate > 0.05 ? 'linear-gradient(90deg, #fb923c, #fdba74)' :
                                                            'linear-gradient(90deg, #10b981, #34d399)',
                                                }} />
                                            </div>
                                            <div className="bar-val">{(feat.flip_rate * 100).toFixed(1)}%</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Combined Attack Results */}
                        {adv.combined_attack?.length > 0 && (
                            <div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                    Combined Multi-Feature Attack
                                </div>
                                <table className="data-table">
                                    <thead>
                                        <tr><th>Intensity</th><th>Accuracy</th><th>Drop</th><th>Flip Rate</th></tr>
                                    </thead>
                                    <tbody>
                                        {adv.combined_attack.map(a => (
                                            <tr key={a.intensity}>
                                                <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{a.intensity}</td>
                                                <td>{(a.accuracy * 100).toFixed(1)}%</td>
                                                <td style={{
                                                    fontWeight: 700,
                                                    color: a.accuracy_drop > 0.15 ? 'var(--red)' : a.accuracy_drop > 0.05 ? 'var(--accent)' : 'var(--green)',
                                                }}>
                                                    -{(a.accuracy_drop * 100).toFixed(1)}%
                                                </td>
                                                <td style={{ color: 'var(--text-muted)' }}>{(a.flip_rate * 100).toFixed(1)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Boundary Samples */}
                        {adv.boundary_samples?.length > 0 && (
                            <div style={{ marginTop: '1rem' }}>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                    Decision Boundary Proximity (closest {adv.boundary_samples.length} samples)
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {adv.boundary_samples.map((s, i) => (
                                        <div key={i} style={{
                                            padding: '6px 10px', borderRadius: 'var(--r-sm)',
                                            background: s.confidence < 0.55 ? 'var(--red-soft)' : 'var(--bg-surface)',
                                            border: `1px solid ${s.confidence < 0.55 ? 'var(--red-border)' : 'var(--border)'}`,
                                            fontSize: '0.72rem',
                                        }}>
                                            <span style={{ color: 'var(--t3)' }}>#{s.sample_index}</span>{' '}
                                            <span style={{ fontWeight: 600, color: s.confidence < 0.55 ? 'var(--red)' : 'var(--green)' }}>
                                                {(s.confidence * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {adv.flags?.length > 0 && (
                            <div style={{ marginTop: '1rem' }}>
                                {adv.flags.map((f, i) => <div key={i} className="flag-item"><span className="flag-icon">^</span>{f}</div>)}
                            </div>
                        )}
                    </div>
                )}

                {/* ---- Flags + Recommendations ---- */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
                    <div className="card">
                        <SectionTitle label={`All Flags (${sum.total_flags})`} color="var(--red)" />
                        {sum.total_flags === 0
                            ? <p style={{ fontSize: '0.87rem', color: 'var(--green)' }}>No flags - model passed all checks.</p>
                            : stages.flatMap(s => s?.flags || []).map((f, i) => (
                                <div key={i} className="flag-item"><span className="flag-icon">^</span>{f}</div>
                            ))
                        }
                    </div>
                    <div className="card">
                        <SectionTitle label="Recommendations" color="var(--green)" />
                        {sum.recommendations.map((r, i) => (
                            <div key={i} className="rec-item">{r}</div>
                        ))}
                    </div>
                </div>

                {/* ---- Footer ---- */}
                <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center' }}>
                    <button id="export-btn-bottom" className="btn btn-primary btn-lg" onClick={exportReport}>
                        v Save as PDF
                    </button>
                    <Link to="/history" className="btn btn-outline btn-lg">View History</Link>
                    <Link to="/" className="btn btn-ghost btn-lg">{'<-'} Run Another Audit</Link>
                </div>

            </div>
        </div>
    )
}


