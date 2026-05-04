import { useEffect, useRef } from 'react'

/*
  Interactive particle canvas:
  - Dots float and drift slowly
  - Lines connect nearby particles
  - Mouse creates a glow spotlight + attracts nearby particles
  - Particles gently repel when cursor gets too close
*/

export default function ParticleCanvas() {
    const canvasRef = useRef(null)
    const mouse = useRef({ x: -500, y: -500 })

    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        let animId
        let particles = []

        const PARTICLE_COUNT = 70
        const CONNECT_DIST = 120
        const MOUSE_RADIUS = 150

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resize()
        window.addEventListener('resize', resize)

        const handleMouse = (e) => {
            mouse.current = { x: e.clientX, y: e.clientY }
        }
        const handleLeave = () => {
            mouse.current = { x: -500, y: -500 }
        }
        window.addEventListener('mousemove', handleMouse)
        window.addEventListener('mouseleave', handleLeave)

        // Init particles
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                r: Math.random() * 1.5 + 0.5,
                opacity: Math.random() * 0.3 + 0.1,
            })
        }

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            const mx = mouse.current.x
            const my = mouse.current.y

            // Draw mouse spotlight
            if (mx > 0 && my > 0) {
                const grad = ctx.createRadialGradient(mx, my, 0, mx, my, MOUSE_RADIUS * 1.5)
                grad.addColorStop(0, 'rgba(124, 58, 237, 0.06)')
                grad.addColorStop(0.5, 'rgba(244, 63, 94, 0.02)')
                grad.addColorStop(1, 'transparent')
                ctx.fillStyle = grad
                ctx.fillRect(0, 0, canvas.width, canvas.height)
            }

            // Update & draw particles
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i]

                // Mouse interaction: gentle push
                const dx = p.x - mx
                const dy = p.y - my
                const dist = Math.sqrt(dx * dx + dy * dy)
                if (dist < MOUSE_RADIUS && dist > 0) {
                    const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS * 0.02
                    p.vx += (dx / dist) * force
                    p.vy += (dy / dist) * force
                }

                // Damping
                p.vx *= 0.99
                p.vy *= 0.99

                p.x += p.vx
                p.y += p.vy

                // Wrap
                if (p.x < 0) p.x = canvas.width
                if (p.x > canvas.width) p.x = 0
                if (p.y < 0) p.y = canvas.height
                if (p.y > canvas.height) p.y = 0

                // Draw dot
                ctx.beginPath()
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(124, 58, 237, ${p.opacity})`
                ctx.fill()

                // Connect to nearby particles
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j]
                    const ddx = p.x - p2.x
                    const ddy = p.y - p2.y
                    const d = Math.sqrt(ddx * ddx + ddy * ddy)
                    if (d < CONNECT_DIST) {
                        const alpha = (1 - d / CONNECT_DIST) * 0.08
                        ctx.beginPath()
                        ctx.moveTo(p.x, p.y)
                        ctx.lineTo(p2.x, p2.y)
                        ctx.strokeStyle = `rgba(124, 58, 237, ${alpha})`
                        ctx.lineWidth = 0.5
                        ctx.stroke()
                    }
                }

                // Connect to mouse
                if (dist < MOUSE_RADIUS * 1.2 && mx > 0) {
                    const alpha = (1 - dist / (MOUSE_RADIUS * 1.2)) * 0.15
                    ctx.beginPath()
                    ctx.moveTo(p.x, p.y)
                    ctx.lineTo(mx, my)
                    ctx.strokeStyle = `rgba(45, 212, 191, ${alpha})`
                    ctx.lineWidth = 0.4
                    ctx.stroke()
                }
            }

            animId = requestAnimationFrame(draw)
        }

        draw()

        return () => {
            cancelAnimationFrame(animId)
            window.removeEventListener('resize', resize)
            window.removeEventListener('mousemove', handleMouse)
            window.removeEventListener('mouseleave', handleLeave)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 0,
                pointerEvents: 'none',
            }}
        />
    )
}
