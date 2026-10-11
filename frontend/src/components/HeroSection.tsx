import { useEffect, useState } from 'react'
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

/**
 * Two-column hero with social proof (Hero-1 pattern, theme-adapted).
 * Left: badge + H1 + CTAs + proof. Right: 1.5s rotating banners.
 * Uses edu-theme tokens only — no Pro/shadcn dependency.
 */
export default function HeroSection() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length)
    }, ROTATE_MS)
    return () => window.clearInterval(id)
  }, [paused])

  return (
    <section className="ta-hero" aria-labelledby="ta-hero-title">
      <div className="ta-hero__inner">
        <div className="ta-hero__copy">
          <p className="ta-hero__eyebrow">Admissions open — SEE • Class 11/12 • IOE • CEE</p>
          <h1 id="ta-hero-title">
            AI Powered Online Tuition Classes Platform
          </h1>
          <p className="ta-hero__lead">
            Daily live classes, recordings, chapterwise notes and CBT mock tests —
            online and in-centre at Mahendranagar.
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
              <p className="ta-proof__sub">
                Daily live classes • Weekly mocks • Doubt support
              </p>
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
                src={s.src}
                alt={s.alt}
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : 'auto'}
                className={`ta-hero__img${i === index ? ' is-active' : ''}`}
                aria-hidden={i === index ? undefined : true}
              />
            ))}
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
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
