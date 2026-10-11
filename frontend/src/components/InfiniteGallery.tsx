import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import './InfiniteGallery.css'

export type InfiniteGalleryProps<T> = {
  items: T[]
  /** Render one card. `copy` is 0 for the live set, >0 for seamless-loop duplicates. */
  renderItem: (item: T, index: number, copy: number) => ReactNode
  /** Pixels per second. Sign sets direction. */
  speed?: number
  pauseOnHover?: boolean
  /** Accessible name for the region. */
  ariaLabel?: string
  /** True for decorative duplicate rows: hidden from assistive tech and tab order. */
  decorative?: boolean
  className?: string
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

/**
 * Endless 3D drift field (native equivalent of the Pro Infinite Gallery).
 * Three copies of the set loop seamlessly; cards tilt/scale with distance
 * from center (coverflow). Page scroll is never hijacked.
 */
const InfiniteGallery = <T,>({
  items,
  renderItem,
  speed = 45,
  pauseOnHover = true,
  ariaLabel = 'Infinite gallery',
  decorative = false,
  className = '',
}: InfiniteGalleryProps<T>) => {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const setRefs = useRef<Array<HTMLDivElement | null>>([])
  const cardRefs = useRef<Array<HTMLElement | null>>([])

  const offsetRef = useRef(0)
  const hoverRef = useRef(false)
  const visibleRef = useRef(true)
  const dragRef = useRef<{ startX: number; startOffset: number; moved: boolean; id: number } | null>(null)
  const cfgRef = useRef({ speed, pauseOnHover })
  cfgRef.current = { speed, pauseOnHover }

  const n = items.length
  const copies = n > 0 ? 3 : 0

  useEffect(() => {
    const root = rootRef.current
    const track = trackRef.current
    if (!root || !track || n === 0) return

    let setW = setRefs.current[0]?.offsetWidth ?? 0
    let viewW = root.clientWidth
    const measure = () => {
      setW = setRefs.current[0]?.offsetWidth ?? 0
      viewW = root.clientWidth
    }
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    measure()

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const io = new IntersectionObserver(([entry]) => (visibleRef.current = entry.isIntersecting), {
      threshold: 0.02,
    })
    io.observe(root)

    let raf = 0
    let last = performance.now()

    const paint = () => {
      const totalW = setW * copies
      if (!totalW) return
      const slotFull = setW / n
      const center = viewW / 2
      const cards = cardRefs.current
      for (let k = 0; k < copies; k++) {
        for (let i = 0; i < n; i++) {
          const el = cards[k * n + i]
          if (!el) continue
          const screenX = k * setW + i * slotFull + slotFull / 2 - offsetRef.current
          const dx = screenX - center
          const adx = Math.abs(dx)
          const ry = clamp(dx * 0.05, -26, 26)
          const s = 1 - Math.min(adx / (center * 1.6 || 1), 1) * 0.3
          const bright = 1 - Math.min(adx / (center * 1.8 || 1), 1) * 0.45
          el.style.transform = `rotateY(${ry.toFixed(2)}deg) scale(${s.toFixed(3)})`
          el.style.filter = `brightness(${bright.toFixed(3)})`
          el.style.zIndex = String(1000 - Math.round(adx))
        }
      }
    }

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const { speed: sp, pauseOnHover: poh } = cfgRef.current
      const totalW = setW * copies
      if (totalW > 0) {
        const paused = dragRef.current !== null || (poh && hoverRef.current)
        if (!reduced && visibleRef.current && !paused) {
          offsetRef.current += sp * dt
        }
        offsetRef.current = ((offsetRef.current % totalW) + totalW) % totalW
        track.style.transform = `translate3d(${-offsetRef.current.toFixed(2)}px, 0, 0)`
        paint()
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    }
  }, [n, copies])

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    dragRef.current = { startX: e.clientX, startOffset: offsetRef.current, moved: false, id: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.startX
    if (Math.abs(dx) > 6) drag.moved = true
    if (drag.moved) offsetRef.current = drag.startOffset - dx
  }

  const onPointerEnd = () => {
    dragRef.current = null
  }

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const totalW = (setRefs.current[0]?.offsetWidth ?? 0) * copies
    if (!totalW) return
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      offsetRef.current = (((offsetRef.current - 160) % totalW) + totalW) % totalW
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      offsetRef.current = (offsetRef.current + 160) % totalW
    }
  }

  if (n === 0) return null

  return (
    <div
      ref={rootRef}
      className={`ta-ig ${className}`.trim()}
      role="region"
      aria-label={ariaLabel}
      aria-hidden={decorative || undefined}
      tabIndex={decorative ? undefined : 0}
      onPointerDown={decorative ? undefined : onPointerDown}
      onPointerMove={decorative ? undefined : onPointerMove}
      onPointerUp={decorative ? undefined : onPointerEnd}
      onPointerCancel={decorative ? undefined : onPointerEnd}
      onKeyDown={decorative ? undefined : onKeyDown}
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => {
        hoverRef.current = false
        dragRef.current = null
      }}
      onClickCapture={(e) => {
        if (dragRef.current?.moved) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
    >
      <div ref={trackRef} className="ta-ig-track">
        {Array.from({ length: copies }).map((_, copy) => (
          <div
            key={copy}
            ref={(el) => {
              setRefs.current[copy] = el
            }}
            className="ta-ig-set"
            aria-hidden={copy !== 0 || decorative || undefined}
            {...(copy !== 0 || decorative ? { inert: true } : {})}
          >
            {items.map((item, i) => (
              <div key={i} className="ta-ig-slot">
                <div
                  ref={(el) => {
                    cardRefs.current[copy * n + i] = el
                  }}
                  className="ta-ig-card"
                >
                  {renderItem(item, i, copy)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default InfiniteGallery
