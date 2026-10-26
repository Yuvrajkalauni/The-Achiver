import type { CSSProperties } from 'react'

/**
 * Stagger helper for grouped reveals: `style={revealDelay(index)}` on any
 * [data-reveal] element makes cards cascade in ~70ms apart (styles/animations.css).
 */
export const revealDelay = (index: number, step = 70): CSSProperties =>
  ({ '--reveal-delay': `${index * step}ms` }) as CSSProperties
