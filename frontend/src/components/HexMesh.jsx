import { useEffect, useRef } from 'react'

/*
  HexMesh — full-page interactive hexagonal grid
  ────────────────────────────────────────────────
  • Canvas stays fixed (viewport-sized, memory efficient)
  • Hex centres live in document-space coords
  • Each frame: subtract scrollX/Y → grid scrolls with the page
  • Cursor brightens nearby hexes in viewport-space
*/

const HEX_R         = 22
const BASE_ALPHA    = 0.10     // subtle but visible on dark bg
const GLOW_ALPHA    = 0.45     // brightens near cursor
const CURSOR_RADIUS = 150      // px influence radius

// Pointy-top hex corners
function hexPts(cx, cy, r) {
    const pts = []
    for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
    }
    return pts
}

export default function HexMesh() {
    const canvasRef = useRef(null)
    const mouseRef  = useRef({ x: -9999, y: -9999 }) // viewport coords
    const scrollRef = useRef({ x: 0, y: 0 })          // document scroll
    const animRef   = useRef(null)

    useEffect(() => {
        const canvas = canvasRef.current
        const ctx    = canvas.getContext('2d')

        const resize = () => {
            canvas.width  = window.innerWidth
            canvas.height = window.innerHeight
        }
        resize()

        const onResize = ()  => resize()
        const onMove   = (e) => { mouseRef.current  = { x: e.clientX, y: e.clientY } }
        const onScroll = ()  => { scrollRef.current = { x: window.scrollX, y: window.scrollY } }

        window.addEventListener('resize',    onResize)
        window.addEventListener('mousemove', onMove)
        window.addEventListener('scroll',    onScroll, { passive: true })

        const draw = () => {
            const w   = canvas.width
            const h   = canvas.height
            const r   = HEX_R
            const mx  = mouseRef.current.x
            const my  = mouseRef.current.y
            const sx  = scrollRef.current.x   // horizontal scroll (usually 0)
            const sy  = scrollRef.current.y   // vertical scroll
            const cr2 = CURSOR_RADIUS * CURSOR_RADIUS

            ctx.clearRect(0, 0, w, h)
            ctx.lineWidth = 0.6

            // Pointy-top hex tile dimensions
            const hexW = Math.sqrt(3) * r   // column spacing
            const hexH = 1.5 * r            // row spacing

            // Compute which rows/cols fall inside viewport at current scroll
            const rowStart = Math.floor(sy / hexH) - 1
            const rowEnd   = Math.ceil((sy + h) / hexH) + 1
            const colStart = Math.floor(sx / hexW) - 2
            const colEnd   = Math.ceil((sx + w) / hexW) + 2

            for (let row = rowStart; row <= rowEnd; row++) {
                for (let col = colStart; col <= colEnd; col++) {
                    // Document-space centre (the hex's "real" position)
                    const offset = row % 2 === 0 ? 0 : hexW * 0.5
                    const docX   = col * hexW + offset
                    const docY   = row * hexH + r

                    // Viewport-space centre — subtract scroll offset
                    const vx = docX - sx
                    const vy = docY - sy

                    // Distance from cursor (both in viewport space)
                    const dx  = vx - mx
                    const dy  = vy - my
                    const d2  = dx * dx + dy * dy

                    let alpha
                    if (d2 > cr2) {
                        alpha = BASE_ALPHA
                    } else {
                        const t    = 1 - Math.sqrt(d2) / CURSOR_RADIUS
                        const ease = t * t   // quadratic — smooth falloff
                        alpha = BASE_ALPHA + (GLOW_ALPHA - BASE_ALPHA) * ease
                    }

                    const pts = hexPts(vx, vy, r - 1.2)
                    ctx.beginPath()
                    ctx.moveTo(pts[0][0], pts[0][1])
                    for (let i = 1; i < 6; i++) ctx.lineTo(pts[i][0], pts[i][1])
                    ctx.closePath()
                    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`
                    ctx.stroke()
                }
            }

            animRef.current = requestAnimationFrame(draw)
        }

        draw()

        return () => {
            cancelAnimationFrame(animRef.current)
            window.removeEventListener('resize',    onResize)
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('scroll',    onScroll)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            style={{
                position:      'fixed',
                inset:         0,
                zIndex:        0,
                pointerEvents: 'none',
            }}
        />
    )
}
