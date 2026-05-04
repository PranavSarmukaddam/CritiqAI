import { useEffect, useRef, useState, useCallback } from 'react'

const LAYERS = [4, 6, 6, 3]
const NODE_R  = 8

function buildNetwork(w, h) {
    const padX = 50, padY = 30
    const layerGap = (w - padX * 2) / (LAYERS.length - 1)
    const nodes = [], edges = []

    LAYERS.forEach((count, li) => {
        const x = padX + li * layerGap
        const gap = (h - padY * 2) / (count + 1)
        for (let ni = 0; ni < count; ni++) {
            nodes.push({ x, y: padY + gap * (ni + 1), layer: li, idx: ni, activation: 0 })
        }
    })

    let offset = 0
    for (let li = 0; li < LAYERS.length - 1; li++) {
        const nextOffset = offset + LAYERS[li]
        for (let a = offset; a < nextOffset; a++) {
            for (let b = nextOffset; b < nextOffset + LAYERS[li + 1]; b++) {
                edges.push({ from: a, to: b, weight: Math.random() * 0.6 + 0.2, glow: 0 })
            }
        }
        offset = nextOffset
    }
    return { nodes, edges }
}

export default function NeuralNetGame() {
    const canvasRef    = useRef(null)
    const netRef       = useRef(null)
    const particlesRef = useRef([])
    const animRef      = useRef(null)
    const [accuracy, setAccuracy] = useState(72.4)
    const [epoch,    setEpoch]    = useState(0)
    const [loss,     setLoss]     = useState(0.847)

    const feedData = useCallback(() => {
        if (!netRef.current) return
        const { nodes } = netRef.current
        const inputNodes = nodes.filter(n => n.layer === 0)
        inputNodes.forEach(n => {
            n.activation = 1
            for (let i = 0; i < 3; i++) {
                particlesRef.current.push({
                    x: n.x, y: n.y,
                    targetLayer: 1,
                    targetIdx: Math.floor(Math.random() * LAYERS[1]),
                    progress: 0,
                    speed: 0.012 + Math.random() * 0.008,
                    startX: n.x, startY: n.y,
                    warm: Math.random() > 0.5,
                    size: Math.random() * 2 + 1.5,
                })
            }
        })
        setEpoch(e  => e + 1)
        setAccuracy(a => Math.min(99.2, a + Math.random() * 1.5 + 0.3))
        setLoss(l   => Math.max(0.012, l * (0.88 + Math.random() * 0.08)))
    }, [])

    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        const w = canvas.width  = canvas.offsetWidth  * 2
        const h = canvas.height = canvas.offsetHeight * 2
        ctx.scale(2, 2)
        const dw = w / 2, dh = h / 2
        netRef.current = buildNetwork(dw, dh)

        const draw = () => {
            ctx.clearRect(0, 0, dw, dh)
            const { nodes, edges } = netRef.current

            // Edges
            for (const e of edges) {
                const a = nodes[e.from], b = nodes[e.to]
                const alpha = 0.05 + e.glow * 0.35
                ctx.beginPath()
                ctx.moveTo(a.x, a.y)
                ctx.lineTo(b.x, b.y)
                ctx.strokeStyle = e.glow > 0.1
                    ? `rgba(232, 184, 109, ${alpha})`
                    : `rgba(255, 255, 255, ${alpha})`
                ctx.lineWidth = 0.5 + e.glow * 1.2
                ctx.stroke()
                e.glow *= 0.93
            }

            // Nodes
            for (const n of nodes) {
                const a = n.activation
                const r = NODE_R + a * 3

                // Outer glow on activation
                if (a > 0.08) {
                    const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 3.5)
                    grad.addColorStop(0, `rgba(232, 184, 109, ${a * 0.15})`)
                    grad.addColorStop(1, 'transparent')
                    ctx.fillStyle = grad
                    ctx.fillRect(n.x - r * 3.5, n.y - r * 3.5, r * 7, r * 7)
                }

                // Node fill
                const baseAlpha = 0.12 + a * 0.65
                ctx.beginPath()
                ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
                ctx.fillStyle = n.layer === LAYERS.length - 1
                    ? `rgba(52, 211, 153, ${baseAlpha})`
                    : `rgba(232, 184, 109, ${baseAlpha})`
                ctx.fill()

                // Node border
                ctx.beginPath()
                ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
                ctx.strokeStyle = n.layer === LAYERS.length - 1
                    ? `rgba(52, 211, 153, ${0.25 + a * 0.5})`
                    : `rgba(232, 184, 109, ${0.25 + a * 0.5})`
                ctx.lineWidth = 1
                ctx.stroke()

                n.activation *= 0.96
            }

            // Particles
            const particles = particlesRef.current
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i]
                p.progress += p.speed

                if (p.progress >= 1) {
                    const targetNodes = nodes.filter(n => n.layer === p.targetLayer)
                    const target = targetNodes[p.targetIdx % targetNodes.length]
                    if (target) {
                        target.activation = 1
                        for (const e of edges) {
                            const fn = nodes[e.from], tn = nodes[e.to]
                            if (fn.layer === p.targetLayer - 1 && tn === target) e.glow = 1
                        }
                        if (p.targetLayer < LAYERS.length - 1) {
                            particles.push({
                                x: target.x, y: target.y,
                                targetLayer: p.targetLayer + 1,
                                targetIdx: Math.floor(Math.random() * LAYERS[p.targetLayer + 1]),
                                progress: 0,
                                speed: 0.015 + Math.random() * 0.01,
                                startX: target.x, startY: target.y,
                                warm: p.warm,
                                size: p.size * 0.9,
                            })
                        }
                    }
                    particles.splice(i, 1)
                    continue
                }

                const targetNodes = nodes.filter(n => n.layer === p.targetLayer)
                const target = targetNodes[p.targetIdx % targetNodes.length]
                if (!target) { particles.splice(i, 1); continue }

                const cx = p.startX + (target.x - p.startX) * p.progress
                const cy = p.startY + (target.y - p.startY) * p.progress + Math.sin(p.progress * Math.PI) * -10
                const alpha = 0.55 + p.progress * 0.3

                ctx.beginPath()
                ctx.arc(cx, cy, p.size, 0, Math.PI * 2)
                ctx.fillStyle = p.warm
                    ? `rgba(232, 184, 109, ${alpha})`
                    : `rgba(52,  211, 153, ${alpha})`
                ctx.shadowColor = p.warm ? 'rgba(232,184,109,0.5)' : 'rgba(52,211,153,0.5)'
                ctx.shadowBlur  = 5
                ctx.fill()
                ctx.shadowBlur  = 0
            }

            // Layer labels
            ctx.font      = '500 8px "JetBrains Mono", monospace'
            ctx.textAlign = 'center'
            const padX2 = 50
            const lGap  = (dw - padX2 * 2) / (LAYERS.length - 1)
            ;['INPUT', 'HIDDEN', 'HIDDEN', 'OUTPUT'].forEach((label, i) => {
                ctx.fillStyle = 'rgba(68,68,68,0.8)'
                ctx.fillText(label, padX2 + i * lGap, dh - 8)
            })

            animRef.current = requestAnimationFrame(draw)
        }

        draw()

        const autoFeed = setInterval(() => {
            if (particlesRef.current.length < 20) feedData()
        }, 3000)

        return () => {
            cancelAnimationFrame(animRef.current)
            clearInterval(autoFeed)
        }
    }, [feedData])

    return (
        <div
            onClick={feedData}
            style={{
                position: 'relative',
                borderRadius: 'var(--r-xl)',
                border: '1px solid var(--accent-border)',
                overflow: 'hidden',
                background: 'var(--bg-2)',
                animation: 'float 7s ease-in-out infinite',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5), var(--accent-glow)',
                cursor: 'pointer',
            }}
        >
            <canvas ref={canvasRef} style={{ width: '100%', height: 280, display: 'block' }} />

            {/* HUD */}
            <div style={{ position: 'absolute', top: 10, left: 12, display: 'flex', gap: 7 }}>
                {[
                    { label: `EPOCH ${epoch}`,            c: 'rgba(232,184,109,0.12)', b: 'rgba(232,184,109,0.2)',  t: 'var(--accent)' },
                    { label: `ACC ${accuracy.toFixed(1)}%`, c: 'rgba(52,211,153,0.08)',  b: 'rgba(52,211,153,0.18)',  t: 'var(--green)' },
                    { label: `LOSS ${loss.toFixed(3)}`,     c: 'rgba(248,113,113,0.08)', b: 'rgba(248,113,113,0.15)', t: 'var(--red)' },
                ].map(({ label, c, b, t }) => (
                    <div key={label} style={{
                        padding: '3px 8px', borderRadius: 'var(--r-sm)',
                        background: c, border: `1px solid ${b}`,
                        fontSize: '0.53rem', fontFamily: 'JetBrains Mono, monospace',
                        color: t, fontWeight: 600,
                    }}>{label}</div>
                ))}
            </div>

            {/* Click hint */}
            <div style={{
                position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
                padding: '3px 12px', borderRadius: 'var(--r-full)',
                background: 'rgba(232,184,109,0.08)', border: '1px solid rgba(232,184,109,0.15)',
                fontSize: '0.53rem', fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--accent)', fontWeight: 500,
                animation: 'pulse 2.5s ease-in-out infinite',
                whiteSpace: 'nowrap',
            }}>
                CLICK TO FEED DATA
            </div>
        </div>
    )
}
