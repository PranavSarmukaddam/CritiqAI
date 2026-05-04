import { useEffect, useRef } from 'react'

/*
  Cursor glow: a smooth radial gradient that follows the mouse.
  Rendered as a div with CSS transitions for buttery movement.
*/

export default function CursorGlow() {
    const glowRef = useRef(null)

    useEffect(() => {
        const handleMove = (e) => {
            if (glowRef.current) {
                glowRef.current.style.transform = `translate(${e.clientX - 200}px, ${e.clientY - 200}px)`
                glowRef.current.style.opacity = '1'
            }
        }
        const handleLeave = () => {
            if (glowRef.current) glowRef.current.style.opacity = '0'
        }
        window.addEventListener('mousemove', handleMove)
        window.addEventListener('mouseleave', handleLeave)
        return () => {
            window.removeEventListener('mousemove', handleMove)
            window.removeEventListener('mouseleave', handleLeave)
        }
    }, [])

    return (
        <div
            ref={glowRef}
            style={{
                position: 'fixed',
                top: 0, left: 0,
                width: 400, height: 400,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, rgba(45,212,191,0.03) 40%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 1,
                opacity: 0,
                transition: 'transform 0.15s ease-out, opacity 0.4s',
                willChange: 'transform',
            }}
        />
    )
}
