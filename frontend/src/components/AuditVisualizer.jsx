import { useEffect, useRef, useState, useCallback } from 'react'

const N_PTS        = 32
const WINDOW_MS    = 2600
const HEALTH_MAX   = 3

function mkPt(id, w, h) {
    return {
        id, state: 'normal',
        x: Math.random() * (w - 60) + 30,
        y: Math.random() * (h - 60) + 30,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 2 + 4,
        timer: 0, flash: 0,
    }
}

export default function AnomalyHunter() {
    const cvs   = useRef(null)
    const S     = useRef({ pts: [], score: 0, health: HEALTH_MAX, state: 'idle', lastSpawn: 0, interval: 1800, combo: 0 })
    const raf   = useRef(null)
    const [ui, setUi] = useState({ score: 0, health: HEALTH_MAX, state: 'idle', combo: 0 })

    const refresh = () => {
        const s = S.current
        setUi({ score: s.score, health: s.health, state: s.state, combo: s.combo })
    }

    const init = useCallback(() => {
        const c = cvs.current; if (!c) return
        const w = c.offsetWidth, h = c.offsetHeight
        c.width = w; c.height = h
        S.current.pts = Array.from({ length: N_PTS }, (_, i) => mkPt(i, w, h))
    }, [])

    const start = useCallback(() => {
        init()
        Object.assign(S.current, { score: 0, health: HEALTH_MAX, state: 'playing', lastSpawn: performance.now(), interval: 1800, combo: 0 })
        refresh()
    }, [init])

    const handleClick = useCallback((e) => {
        const s = S.current; if (s.state !== 'playing') return
        const c = cvs.current; if (!c) return
        const r = c.getBoundingClientRect()
        const mx = e.clientX - r.left, my = e.clientY - r.top
        for (const p of s.pts) {
            if (p.state !== 'anomaly') continue
            if (Math.hypot(p.x - mx, p.y - my) < p.r + 10) {
                p.state = 'flagged'; p.flash = 500; p.timer = 0
                s.score += 10 + s.combo * 3; s.combo++
                refresh(); return
            }
        }
    }, [])

    useEffect(() => {
        const c = cvs.current; if (!c) return
        const ctx = c.getContext('2d')
        init()
        let last = performance.now()

        const draw = (now) => {
            raf.current = requestAnimationFrame(draw)
            const dt = Math.min(now - last, 50); last = now
            const s  = S.current
            const w  = c.width, h = c.height
            ctx.clearRect(0, 0, w, h)

            if (s.state === 'playing') {
                // Spawn anomaly
                if (now - s.lastSpawn > s.interval) {
                    const normals = s.pts.filter(p => p.state === 'normal')
                    if (normals.length) {
                        const p = normals[Math.floor(Math.random() * normals.length)]
                        p.state = 'anomaly'; p.timer = WINDOW_MS
                    }
                    s.lastSpawn = now
                    s.interval  = Math.max(700, s.interval - 25)
                }

                for (const p of s.pts) {
                    // Move
                    p.x += p.vx * dt * 0.5; p.y += p.vy * dt * 0.5
                    if (p.x < p.r || p.x > w - p.r) p.vx *= -1
                    if (p.y < p.r || p.y > h - p.r) p.vy *= -1

                    if (p.state === 'anomaly') {
                        p.timer -= dt
                        if (p.timer <= 0) {
                            p.state = 'escaped'; p.flash = 600
                            s.health--; s.combo = 0
                            if (s.health <= 0) { s.state = 'gameover' }
                            refresh()
                        }
                    }
                    if ((p.state === 'flagged' || p.state === 'escaped') && p.flash > 0) {
                        p.flash -= dt
                        if (p.flash <= 0) {
                            p.state = 'normal'
                            p.x = Math.random() * (w - 60) + 30
                            p.y = Math.random() * (h - 60) + 30
                        }
                    }
                }
            }

            // Draw points
            for (const p of s.pts) {
                const pulse = (Math.sin(now / 200) + 1) / 2
                let fill, stroke
                if (p.state === 'normal')  { fill = 'rgba(52,211,153,0.55)';  stroke = 'rgba(52,211,153,0.3)' }
                if (p.state === 'anomaly') { fill = 'rgba(248,113,113,0.9)';  stroke = 'rgba(248,113,113,0.6)' }
                if (p.state === 'flagged') { fill = 'rgba(232,184,109,0.95)'; stroke = 'rgba(232,184,109,0.7)' }
                if (p.state === 'escaped') { fill = 'rgba(80,80,80,0.4)';     stroke = 'rgba(80,80,80,0.2)' }

                // Pulse ring for anomalies
                if (p.state === 'anomaly') {
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 5 + pulse * 8, 0, Math.PI * 2)
                    ctx.strokeStyle = `rgba(248,113,113,${0.3 * (1 - pulse)})`
                    ctx.lineWidth = 1.5; ctx.stroke()
                }

                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
                ctx.fillStyle = fill; ctx.fill()
                ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke()

                // Timer bar
                if (p.state === 'anomaly') {
                    const pct = p.timer / WINDOW_MS
                    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(p.x - 16, p.y - p.r - 7, 32, 3)
                    ctx.fillStyle = pct > 0.4 ? 'rgba(248,113,113,0.9)' : 'rgba(255,60,60,1)'
                    ctx.fillRect(p.x - 16, p.y - p.r - 7, 32 * pct, 3)
                }
            }
        }
        draw(performance.now())
        c.addEventListener('click', handleClick)
        return () => { cancelAnimationFrame(raf.current); c.removeEventListener('click', handleClick) }
    }, [init, handleClick])

    const s = ui
    return (
        <div style={{ position: 'relative', borderRadius: 'var(--r-xl)', border: '1px solid var(--accent-border)', overflow: 'hidden', background: 'rgba(14,14,14,0.75)', backdropFilter: 'blur(8px)', boxShadow: '0 24px 64px rgba(0,0,0,0.55), var(--accent-glow)', cursor: s.state === 'playing' ? 'crosshair' : 'default' }}>

            <canvas ref={cvs} style={{ width: '100%', height: 280, display: 'block' }} />

            {/* HUD */}
            <div style={{ position: 'absolute', top: 10, left: 12, display: 'flex', gap: 6 }}>
                {[
                    { l: 'SCORE',  v: s.score,   c: 'var(--accent)' },
                    { l: 'COMBO',  v: `x${s.combo}`, c: s.combo > 1 ? 'var(--green)' : 'var(--t3)' },
                    { l: 'HEARTS', v: '*'.repeat(s.health) + '.'.repeat(Math.max(0, HEALTH_MAX - s.health)), c: 'var(--red)' },
                ].map(({ l, v, c }) => (
                    <div key={l} style={{ padding: '3px 8px', borderRadius: 'var(--r-sm)', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.52rem', fontWeight: 600, lineHeight: 1.7 }}>
                        <span style={{ color: 'var(--t3)', display: 'block', letterSpacing: '0.06em' }}>{l}</span>
                        <span style={{ color: c, fontSize: '0.68rem' }}>{v || 0}</span>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div style={{ position: 'absolute', top: 10, right: 12, padding: '4px 10px', borderRadius: 'var(--r-sm)', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.5rem', color: 'var(--t3)', lineHeight: 1.9 }}>
                <div><span style={{ color: 'var(--red)' }}>*</span> Anomaly - click it!</div>
                <div><span style={{ color: 'var(--green)' }}>*</span> Normal - ignore</div>
            </div>

            {/* Overlay: idle / gameover */}
            {s.state !== 'playing' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,10,10,0.75)', backdropFilter: 'blur(4px)', gap: 10 }}>
                    {s.state === 'gameover' && (
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: 'var(--t3)', marginBottom: 4 }}>
                            FINAL SCORE: <span style={{ color: 'var(--accent)' }}>{s.score}</span>
                        </div>
                    )}
                    <div style={{ fontSize: s.state === 'gameover' ? '1.1rem' : '1.25rem', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.02em' }}>
                        {s.state === 'gameover' ? 'Audit Failed' : 'Anomaly Hunter'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--t2)', maxWidth: 260, textAlign: 'center', lineHeight: 1.6 }}>
                        {s.state === 'idle'
                            ? 'Red dots are anomalies - click them before time runs out. Miss 3 and it\'s over.'
                            : 'Too many anomalies escaped the audit!'}
                    </div>
                    <button onClick={start} style={{ marginTop: 6, padding: '8px 22px', borderRadius: 'var(--r-md)', background: 'var(--t1)', color: 'var(--bg-0)', border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'opacity 0.15s' }}
                        onMouseEnter={e => e.target.style.opacity = 0.85} onMouseLeave={e => e.target.style.opacity = 1}>
                        {s.state === 'gameover' ? 'Try Again' : 'Start Game'}
                    </button>
                </div>
            )}

            {/* Bottom hint */}
            {s.state === 'playing' && (
                <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', fontSize: '0.5rem', color: 'var(--t3)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
                    CLICK RED ANOMALIES BEFORE THE TIMER BAR EMPTIES
                </div>
            )}
        </div>
    )
}

