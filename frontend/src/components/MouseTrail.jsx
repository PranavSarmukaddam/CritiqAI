import { useEffect, useRef } from 'react'

/*
  Mouse trail: spawns glowing particles at cursor position
  that fade out and shrink with physics-like motion.
*/

export default function MouseTrail() {
    const canvasRef = useRef(null)
    const particles = useRef([])
    const mouse = useRef({ x: -100, y: -100 })
    const prevMouse = useRef({ x: -100, y: -100 })

    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        let animId

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resize()
        window.addEventListener('resize', resize)

        const handleMove = (e) => {
            prevMouse.current = { ...mouse.current }
            mouse.current = { x: e.clientX, y: e.clientY }

            // Spawn trail particles based on mouse velocity
            const dx = mouse.current.x - prevMouse.current.x
            const dy = mouse.current.y - prevMouse.current.y
            const speed = Math.sqrt(dx * dx + dy * dy)

            if (speed > 2) {
                const count = Math.min(Math.floor(speed / 5), 4)
                for (let i = 0; i < count; i++) {
                    particles.current.push({
                        x: mouse.current.x + (Math.random() - 0.5) * 8,
                        y: mouse.current.y + (Math.random() - 0.5) * 8,
                        vx: dx * 0.1 * (Math.random() - 0.3),
                        vy: dy * 0.1 * (Math.random() - 0.3) - Math.random() * 0.5,
                        life: 1,
                        decay: 0.015 + Math.random() * 0.01,
                        size: Math.random() * 3 + 1.5,
                        hue: Math.random() > 0.5 ? 0 : 40, // violet or mint
                    })
                }
            }
        }
        window.addEventListener('mousemove', handleMove)

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            particles.current = particles.current.filter(p => p.life > 0)

            for (const p of particles.current) {
                p.x += p.vx
                p.y += p.vy
                p.vy += 0.02 // gravity
                p.vx *= 0.98
                p.life -= p.decay

                const alpha = p.life * 0.6
                const size = p.size * p.life

                // Glowing dot
                ctx.beginPath()
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2)

                if (p.hue === 0) {
                    ctx.fillStyle = `rgba(124, 58, 237, ${alpha})`
                    ctx.shadowColor = 'rgba(124, 58, 237, 0.5)'
                } else {
                    ctx.fillStyle = `rgba(45, 212, 191, ${alpha})`
                    ctx.shadowColor = 'rgba(45, 212, 191, 0.5)'
                }
                ctx.shadowBlur = 8
                ctx.fill()
                ctx.shadowBlur = 0
            }

            animId = requestAnimationFrame(draw)
        }
        draw()

        return () => {
            cancelAnimationFrame(animId)
            window.removeEventListener('resize', resize)
            window.removeEventListener('mousemove', handleMove)
        }
    }, [])

    return (
        <canvas ref={canvasRef} style={{
            position: 'fixed', inset: 0, zIndex: 2,
            pointerEvents: 'none',
        }} />
    )
}
