import { useEffect, useRef } from 'react'

/*
  3D Wireframe: A slowly rotating icosahedron rendered with CSS-like
  line rendering on a canvas. Creates a futuristic holographic vibe.
*/

const PHI = (1 + Math.sqrt(5)) / 2

// Icosahedron vertices
const VERTS = [
    [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
    [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
    [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
]

// Icosahedron edges
const EDGES = [
    [0, 11], [0, 5], [0, 1], [0, 7], [0, 10],
    [1, 5], [1, 9], [1, 8], [1, 7],
    [2, 11], [2, 4], [2, 3], [2, 6], [2, 10],
    [3, 4], [3, 9], [3, 8], [3, 6],
    [4, 5], [4, 9], [4, 11],
    [5, 9], [5, 11],
    [6, 7], [6, 8], [6, 10],
    [7, 8], [7, 10],
    [8, 9],
    [10, 11],
]

function rotateY(v, a) {
    const c = Math.cos(a), s = Math.sin(a)
    return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]
}
function rotateX(v, a) {
    const c = Math.cos(a), s = Math.sin(a)
    return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]
}
function project(v, cx, cy, scale) {
    const z = v[2] + 5
    const f = scale / z
    return [cx + v[0] * f, cy + v[1] * f, z]
}

export default function Wireframe3D() {
    const canvasRef = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        let animId
        let t = 0

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resize()
        window.addEventListener('resize', resize)

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            t += 0.003

            const cx = canvas.width * 0.82
            const cy = canvas.height * 0.45
            const scale = Math.min(canvas.width, canvas.height) * 0.18

            // Rotate and project vertices
            const projected = VERTS.map(v => {
                let r = rotateY(v, t)
                r = rotateX(r, t * 0.7)
                return project(r, cx, cy, scale)
            })

            // Draw edges
            for (const [a, b] of EDGES) {
                const pa = projected[a]
                const pb = projected[b]
                const avgZ = (pa[2] + pb[2]) / 2
                const alpha = Math.max(0.03, Math.min(0.2, (avgZ - 3) / 4))

                ctx.beginPath()
                ctx.moveTo(pa[0], pa[1])
                ctx.lineTo(pb[0], pb[1])
                ctx.strokeStyle = `rgba(124, 58, 237, ${alpha})`
                ctx.lineWidth = 0.6
                ctx.stroke()
            }

            // Draw vertices
            for (const p of projected) {
                const alpha = Math.max(0.05, Math.min(0.4, (p[2] - 3) / 3))
                const size = Math.max(0.5, (p[2] - 3) * 0.4)
                ctx.beginPath()
                ctx.arc(p[0], p[1], size, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(45, 212, 191, ${alpha})`
                ctx.fill()
            }

            animId = requestAnimationFrame(draw)
        }
        draw()

        return () => {
            cancelAnimationFrame(animId)
            window.removeEventListener('resize', resize)
        }
    }, [])

    return (
        <canvas ref={canvasRef} style={{
            position: 'fixed', inset: 0, zIndex: 0,
            pointerEvents: 'none', opacity: 0.6,
        }} />
    )
}
