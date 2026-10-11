import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './HeroSection.css'

const SLIDES = [
  {
    src: '/hero/hero-1.jpg',
    alt: 'IOE and CEE preparation faculty lineup — Experience, Excellence, Expertise',
    badge: 'IOE & CEE Faculty',
  },
  {
    src: '/hero/hero-2.jpg',
    alt: 'The Achievers team — Together We Achieve, Together We Inspire',
    badge: 'Together We Achieve',
  },
  {
    src: '/hero/hero-3.jpg',
    alt: 'The Achievers Institute of Learning — entrance, academic tuition and Loksewa courses',
    badge: 'Entrance • Tuition • Loksewa',
  },
] as const

const ROTATE_MS = 3000
const DETENT = 120 // degrees per banner on the shutter dial

const mod = (v: number, m: number) => ((v % m) + m) % m

/**
 * Hero-32-style shutter-dial hero (native equivalent — the Pro block needs a
 * paid licence + shadcn/Tailwind, none of which this project uses).
 * Spin the dial and cursor velocity stretches emerald/gold light trails
 * across the banners; release snaps to the nearest banner.
 */
export default function HeroSection() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hold, setHold] = useState(false)

  const indexRef = useRef(0)
  const dialPos = useRef(0)
  const dialTarget = useRef(0)
  const dragging = useRef(false)
  const lastAngle = useRef(0)
  const lastT = useRef(0)
  const vel = useRef(0) // deg/s, smoothed
  const energy = useRef(0) // 0..1 trail intensity
  const trailX = useRef(0)
  const raf = useRef(0)
  const lastFrame = useRef(0)
  const resumeTimer = useRef<number | null>(null)
  const reduced = useRef(false)

  const knobRef = useRef<HTMLDivElement | null>(null)
  const dialRef = useRef<HTMLDivElement | null>(null)
  const trailsRef = useRef<HTMLDivElement | null>(null)
  const imgRefs = useRef<Array<HTMLImageElement | null>>([])

  const frame = useCallback((now: number) => {
    const dt = Math.min((now - lastFrame.current) / 1000, 0.05)
    lastFrame.current = now

    if (!dragging.current) {
      const d = dialTarget.current - dialPos.current
      dialPos.current += d * Math.min(1, dt * 10)
      if (Math.abs(d) < 0.05) dialPos.current = dialTarget.current
    }

    const target = reduced.current ? 0 : Math.min(1, Math.abs(vel.current) / 900)
    energy.current += (target - energy.current) * Math.min(1, dt * 6)
    vel.current -= vel.current * Math.min(1, dt * 3.5)
    trailX.current += vel.current * dt * 0.6

    if (knobRef.current) {
      knobRef.current.style.transform = `rotate(${dialPos.current.toFixed(1)}deg)`
    }
    const e = energy.current
    if (trailsRef.current) {
      trailsRef.current.style.opacity = reduced.current ? '0' : e.toFixed(3)
      trailsRef.current.style.backgroundPosition = `${trailX.current.toFixed(1)}px 0, ${(-trailX.current * 0.6).toFixed(1)}px 0`
    }
    imgRefs.current.forEach((img, i) => {
      if (!img) return
      img.style.filter =
        !reduced.current && i === indexRef.current && e > 0.02
          ? `blur(${(e * 5).toFixed(2)}px) saturate(1.25)`
          : ''
    })

    const alive =
      dragging.current ||
      energy.current > 0.01 ||
      Math.abs(dialTarget.current - dialPos.current) > 0.05
    raf.current = alive ? requestAnimationFrame(frame) : 0
  }, [])

  const ensureLoop = useCallback(() => {
    if (!raf.current) {
      lastFrame.current = performance.now()
      raf.current = requestAnimationFrame(frame)
    }
  }, [frame])

  // Explicit jump (dots, keys, autoplay): ease the dial to the nearest detent.
  const goExplicit = useCallback(
    (i: number) => {
      const idx = mod(i, SLIDES.length)
      const delta = mod(idx * DETENT - dialPos.current + 540, 360) - 180
      dialTarget.current = dialPos.current + delta
      indexRef.current = idx
      setIndex(idx)
      ensureLoop()
    },
    [ensureLoop],
  )

  // Release the dial: snap to the nearest banner.
  const snapDial = useCallback(() => {
    const k = Math.round(dialPos.current / DETENT)
    dialTarget.current = k * DETENT
    const idx = mod(k, SLIDES.length)
    indexRef.current = idx
    setIndex(idx)
    ensureLoop()
  }, [ensureLoop])

  const kickTrails = useCallback(
    (amount: number) => {
      if (reduced.current) return
      energy.current = Math.max(energy.current, amount)
      ensureLoop()
    },
    [ensureLoop],
  )

  useEffect(() => {
    reduced.current =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
    }
  }, [])

  useEffect(() => {
    if (reduced.current || paused || hold) return
    const id = window.setInterval(() => {
      if (!document.hidden) goExplicit(indexRef.current + 1)
    }, ROTATE_MS)
    return () => window.clearInterval(id)
  }, [paused, hold, goExplicit])

  const angleOf = (clientX: number, clientY: number) => {
    const r = dialRef.current?.getBoundingClientRect()
    if (!r) return 0
    return (Math.atan2(clientY - (r.top + r.height / 2), clientX - (r.left + r.width / 2)) * 180) / Math.PI
  }

  const onDialDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = true
    setHold(true)
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
    lastAngle.current = angleOf(e.clientX, e.clientY)
    lastT.current = performance.now()
    vel.current = 0
    ensureLoop()
  }

  const onDialMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    const a = angleOf(e.clientX, e.clientY)
    const now = performance.now()
    const d = mod(a - lastAngle.current + 540, 360) - 180
    const dt = Math.max((now - lastT.current) / 1000, 0.008)
    dialPos.current += d
    const inst = Math.max(-3000, Math.min(3000, d / dt))
    vel.current = vel.current * 0.65 + inst * 0.35
    lastAngle.current = a
    lastT.current = now
  }

  const onDialUp = () => {
    if (!dragging.current) return
    dragging.current = false
    snapDial()
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current)
    resumeTimer.current = window.setTimeout(() => setHold(false), 4000)
  }

  const onDialKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      goExplicit(indexRef.current + 1)
      kickTrails(0.5)
      vel.current = 400
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      goExplicit(indexRef.current - 1)
      kickTrails(0.5)
      vel.current = -400
    } else if (e.key === 'Home') {
      e.preventDefault()
      goExplicit(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      goExplicit(SLIDES.length - 1)
    }
  }

  return (
    <section className="ta-hero" aria-labelledby="ta-hero-title">
      <div className="ta-hero__inner">
        <div className="ta-hero__copy">
          <p className="ta-hero__eyebrow">Admissions open — SEE • Class 11/12 • IOE • CEE</p>
          <h1 id="ta-hero-title">AI Powered Online Tuition Classes Platform</h1>
          <p className="ta-hero__lead">
            Daily live classes, recordings, chapterwise notes and CBT mock tests — online and
            in-centre at Mahendranagar.
          </p>
          <div className="ta-hero__ctas">
            <Link to="/mock-test" className="ta-btn ta-btn--gold">
              Try Free Mock
            </Link>
            <Link to="/courses" className="ta-btn ta-btn--outline">
              Explore Courses
            </Link>
          </div>
          <div className="ta-hero__proof" aria-label="Social proof">
            <div className="ta-avatars" aria-hidden="true">
              <span>DT</span>
              <span>PS</span>
              <span>CC</span>
              <span>+</span>
            </div>
            <div>
              <p className="ta-stars" aria-label="Rated 4.8 out of 5 by students">
                ★★★★★ <strong>4.8/5</strong>
              </p>
              <p className="ta-proof__sub">Daily live classes • Weekly mocks • Doubt support</p>
            </div>
          </div>
        </div>

        <div
          className="ta-hero__media"
          role="region"
          aria-roledescription="carousel"
          aria-label="Campus and faculty banners, rotating every 3 seconds"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div className="ta-hero__frame">
            {SLIDES.map((s, i) => (
              <img
                key={s.src}
                ref={(el) => {
                  imgRefs.current[i] = el
                }}
                src={s.src}
                alt={s.alt}
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : 'auto'}
                className={`ta-hero__img${i === index ? ' is-active' : ''}`}
                aria-hidden={i === index ? undefined : true}
              />
            ))}
            <div ref={trailsRef} className="ta-trails" aria-hidden="true" />
            <span className="ta-hero__float" aria-hidden="true">
              {SLIDES[index].badge}
            </span>
          </div>
          <div className="ta-hero__dots" role="tablist" aria-label="Choose banner">
            {SLIDES.map((s, i) => (
              <button
                key={s.src}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Show banner ${i + 1}: ${s.badge}`}
                className={`ta-hero__dot${i === index ? ' is-active' : ''}`}
                onClick={() => {
                  goExplicit(i)
                  kickTrails(0.35)
                }}
              />
            ))}
          </div>
          <div className="ta-dial-row">
            <div
              ref={dialRef}
              className="ta-dial"
              role="slider"
              tabIndex={0}
              aria-label="Shutter dial: spin to browse banners"
              aria-valuemin={1}
              aria-valuemax={SLIDES.length}
              aria-valuenow={index + 1}
              aria-valuetext={SLIDES[index].badge}
              onPointerDown={onDialDown}
              onPointerMove={onDialMove}
              onPointerUp={onDialUp}
              onPointerCancel={onDialUp}
              onKeyDown={onDialKey}
            >
              <div ref={knobRef} className="ta-dial__knob" aria-hidden="true">
                <span className="ta-dial__pointer" />
              </div>
              <span className="ta-dial__hub" aria-hidden="true" />
            </div>
            <p className="ta-dial-hint">
              Shutter dial — drag to spin the banners. Spin fast for light trails.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
