import { useEffect, useRef, useState } from 'react'

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'
const immediate = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia(REDUCE_QUERY).matches || !('IntersectionObserver' in window))

/**
 * Animated statistic — counts 0 → value the first time it scrolls into
 * view (power3-out easing, one shot). Reduced motion or a missing
 * IntersectionObserver shows the final number immediately, so the value
 * is never trapped behind an animation.
 */
export default function CountUp({
  value,
  duration = 1000,
}: {
  value: number
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const [display, setDisplay] = useState(() => (immediate() ? value : 0))

  useEffect(() => {
    const el = ref.current
    if (!el || immediate()) return

    let raf = 0
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration)
          const eased = 1 - Math.pow(1 - t, 3)
          setDisplay(Math.round(value * eased))
          if (t < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )

    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value, duration])

  return <span ref={ref}>{display.toLocaleString('en-NP')}</span>
}
