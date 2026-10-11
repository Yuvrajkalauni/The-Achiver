import { useEffect, useState } from 'react'
import './LoadingScreen.css'

type Props = {
  /** Called once the exit animation finishes */
  onDone?: () => void
  /** Minimum visible time so the brand mark is readable (ms) */
  minVisibleMs?: number
}

/**
 * Brand loader (PRD H-01, TRD 4.7).
 * Replaces Assets/loading/loading.svg pink gradient with theme gradient
 * (emerald -> polar -> gold) on heroDark background.
 * Shows before Navbar / page content on first load.
 */
export default function LoadingScreen({ onDone, minVisibleMs = 1800 }: Props) {
  const [progress, setProgress] = useState(8)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const start = Date.now()
    // Fake staged progress: fast start, ease to 90%, jump to 100 on window load
    const tick = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p
        const next = p + Math.max(1, (90 - p) * 0.08)
        return Math.min(90, Math.round(next))
      })
    }, 120)

    const finish = () => {
      const elapsed = Date.now() - start
      const wait = Math.max(0, minVisibleMs - elapsed)
      window.setTimeout(() => {
        window.clearInterval(tick)
        setProgress(100)
        // brief hold at 100% then fade out
        window.setTimeout(() => {
          setLeaving(true)
          window.setTimeout(() => onDone?.(), 450)
        }, 350)
      }, wait)
    }

    if (document.readyState === 'complete') {
      finish()
    } else {
      window.addEventListener('load', finish, { once: true })
      // Safety: never trap user on loader
      const fallback = window.setTimeout(finish, 4500)
      return () => {
        window.clearInterval(tick)
        window.clearTimeout(fallback)
        window.removeEventListener('load', finish)
      }
    }
    return () => window.clearInterval(tick)
  }, [minVisibleMs, onDone])

  return (
    <div
      className={`ta-loader${leaving ? ' is-leaving' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Loading The Achievers website"
    >
      <div className="ta-loader__card">
        <div className="ta-loader__mark" aria-hidden="true">
          <img
            src="/logo.jpg"
            alt=""
            className="ta-loader__logo"
            width={120}
            height={120}
          />
          <span className="ta-loader__ring" />
        </div>
        <p className="ta-loader__brand">The Achievers</p>
        <p className="ta-loader__tag">AI Powered Online Tuition Classes Platform</p>

        <div
          className="ta-loader__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label="Page loading progress"
        >
          <div className="ta-loader__bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="ta-loader__pct">{progress}%</p>
      </div>
    </div>
  )
}
