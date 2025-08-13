'use client'
import { useEffect, useRef } from 'react'

type Props = {
  colors?: string[]
  density?: number // number of particles per ~80k px²
  opacity?: number
}

export default function Particles({
  colors = ['#265966', '#49C3AC', '#DC9807'],
  density = 1.1,
  opacity = 0.6,
}: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; r: number; c: string }[]>([])

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.scale(dpr, dpr)
      // (re)seed
      const area = width * height
      const count = Math.max(30, Math.floor((area / 80000) * density))
      const parts = new Array(count).fill(0).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 2.2 + 0.6,
        c: colors[Math.floor(Math.random() * colors.length)],
      }))
      particlesRef.current = parts
    }

    const tick = () => {
      const { width, height } = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, width, height)
      for (const p of particlesRef.current) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < -10) p.x = width + 10
        if (p.x > width + 10) p.x = -10
        if (p.y < -10) p.y = height + 10
        if (p.y > height + 10) p.y = -10

        ctx.globalAlpha = opacity
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.c
        ctx.fill()
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    const onResize = () => {
      // reset canvas state
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      resize()
    }

    resize()
    tick()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [colors, density, opacity])

  return (
    <canvas
      ref={ref}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        mixBlendMode: 'soft-light',
      }}
    />
  )
}
