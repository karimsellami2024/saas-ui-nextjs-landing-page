'use client'
import { useEffect } from 'react'

type Theme = { tealBlue: string; gold: string }

export function useLandingAnimations(theme: Theme) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    let io: IntersectionObserver | null = null
    const cleanupFns: Array<() => void> = []
    let cancelled = false

    ;(async () => {
      const mod: any = await import('animejs')
      const anime: any = mod?.default ?? mod?.anime ?? mod
      if (cancelled || typeof anime !== 'function') return

      // --- HERO intro (initial state via 0-duration anims)
      anime({ targets: '[data-hero-item]', opacity: 0, translateY: 24, duration: 0 })
      anime
        .timeline({ easing: 'easeOutQuad', duration: 700 })
        .add({
          targets: '[data-hero-item]',
          opacity: [0, 1],
          translateY: [24, 0],
          delay: anime.stagger(80),
        })
        .add(
          {
            targets: '[data-cta-item]',
            opacity: [0, 1],
            translateY: [16, 0],
            delay: anime.stagger(90),
          },
          '-=350'
        )

      // --- Aurora blobs pulse/float
      anime({
        targets: '[data-aurora]',
        translateY: [
          { value: -20, duration: 4000 },
          { value: 0, duration: 4000 },
        ],
        translateX: [
          { value: 12, duration: 5000 },
          { value: 0, duration: 5000 },
        ],
        scale: [
          { value: 1.1, duration: 3500 },
          { value: 1.0, duration: 3500 },
        ],
        rotateZ: [{ value: 8, duration: 7000 }, { value: 0, duration: 7000 }],
        easing: 'easeInOutSine',
        loop: true,
        delay: anime.stagger(400),
        opacity: [{ value: 0.65, duration: 3000 }, { value: 0.45, duration: 3000 }],
      })

      // --- Floating hero image
      anime({
        targets: '#hero-image',
        translateY: [0, 10],
        duration: 3200,
        easing: 'easeInOutSine',
        direction: 'alternate',
        loop: true,
      })

      // --- Highlight tags bob
      anime({
        targets: '[data-tag]',
        translateY: [0, -4],
        duration: 2200,
        delay: anime.stagger(80, { start: 300 }),
        easing: 'easeInOutSine',
        direction: 'alternate',
        loop: true,
      })

      // --- Magnetic buttons
      const magnetics = Array.from(document.querySelectorAll('[data-magnetic]')) as HTMLElement[]
      magnetics.forEach((btn) => {
        const strength = parseFloat(btn.dataset.magnetic || '12')
        const onMove = (e: PointerEvent) => {
          const rect = btn.getBoundingClientRect()
          const mx = e.clientX - (rect.left + rect.width / 2)
          const my = e.clientY - (rect.top + rect.height / 2)
          anime({
            targets: btn,
            translateX: Math.max(Math.min(mx / 6, strength), -strength),
            translateY: Math.max(Math.min(my / 6, strength), -strength),
            duration: 180,
            easing: 'easeOutQuad',
          })
        }
        const onLeave = () =>
          anime({ targets: btn, translateX: 0, translateY: 0, duration: 200, easing: 'easeOutQuad' })
        btn.addEventListener('pointermove', onMove)
        btn.addEventListener('pointerleave', onLeave)
        cleanupFns.push(() => {
          btn.removeEventListener('pointermove', onMove)
          btn.removeEventListener('pointerleave', onLeave)
        })
      })

      // --- 3D tilt (cards, hero frame)
      const tilts = Array.from(document.querySelectorAll('[data-tilt]')) as HTMLElement[]
      tilts.forEach((el) => {
        const max = parseFloat(el.dataset.tiltMax || '10') // deg
        const scale = parseFloat(el.dataset.tiltScale || '1.02')
        let raf = 0
        const onMove = (e: PointerEvent) => {
          cancelAnimationFrame(raf)
          raf = requestAnimationFrame(() => {
            const rect = el.getBoundingClientRect()
            const px = (e.clientX - rect.left) / rect.width - 0.5
            const py = (e.clientY - rect.top) / rect.height - 0.5
            anime({
              targets: el,
              rotateY: px * max,
              rotateX: -py * max,
              scale,
              duration: 220,
              easing: 'easeOutQuad',
            })
          })
        }
        const onLeave = () =>
          anime({
            targets: el,
            rotateX: 0,
            rotateY: 0,
            scale: 1,
            duration: 260,
            easing: 'easeOutQuad',
          })
        el.addEventListener('pointermove', onMove)
        el.addEventListener('pointerleave', onLeave)
        cleanupFns.push(() => {
          el.removeEventListener('pointermove', onMove)
          el.removeEventListener('pointerleave', onLeave)
        })
      })

      // --- Scroll-reveals
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            const el = entry.target as HTMLElement
            const items = el.querySelectorAll('[data-reveal-item]')
            anime({ targets: items, opacity: 0, translateY: 24, duration: 0 })
            anime({
              targets: items,
              opacity: [0, 1],
              translateY: [24, 0],
              duration: 600,
              delay: anime.stagger(70),
              easing: 'easeOutCubic',
            })
            io?.unobserve(el)
          })
        },
        { threshold: 0.15 }
      )
      document.querySelectorAll('[data-reveal]').forEach((el) => io!.observe(el))

      // --- Parallax layers
      const parallax = () => {
        const scY = window.scrollY || 0
        const h = window.innerHeight
        document.querySelectorAll('[data-parallax]').forEach((el) => {
          const speed = parseFloat((el as HTMLElement).dataset.parallax || '0.12')
          const rect = (el as HTMLElement).getBoundingClientRect()
          const center = rect.top + scY - h * 0.5
          const delta = scY - center
          ;(el as HTMLElement).style.transform = `translate3d(0, ${-delta * speed}px, 0)`
        })
      }
      parallax()
      window.addEventListener('scroll', parallax, { passive: true })
      cleanupFns.push(() => window.removeEventListener('scroll', parallax))
    })()

    return () => {
      cancelled = true
      io?.disconnect()
      cleanupFns.forEach((fn) => fn())
    }
  }, [theme.tealBlue, theme.gold])
}
