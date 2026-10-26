import { useEffect } from 'react'

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Reveals every [data-reveal] element on the current route once it enters
 * the viewport (styles live in styles/animations.css).
 *
 * - one shared IntersectionObserver per route, unobserved after revealing,
 *   so elements never replay when scrolling back up
 * - re-runs on pathname change so route transitions start clean
 * - no IntersectionObserver or reduced motion requested → everything is
 *   shown immediately (content is never trapped behind a missing reveal)
 */
export default function useScrollReveal(pathname: string) {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (nodes.length === 0) return

    const revealAll = () => nodes.forEach((node) => node.classList.add('is-revealed'))

    if (!('IntersectionObserver' in window) || window.matchMedia(REDUCE_QUERY).matches) {
      revealAll()
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-revealed')
          observer.unobserve(entry.target)
        }
      },
      // fire slightly before the element is fully in view (skill: 'top 90%')
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )

    const observeTree = (root: Element) => {
      if (root.matches('[data-reveal]')) observer.observe(root)
      root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => observer.observe(el))
    }

    nodes.forEach((node) => observer.observe(node))

    // React can create new [data-reveal] nodes after a filter/search — pick
    // them up too, otherwise a re-created node would stay invisible.
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (node.nodeType === Node.ELEMENT_NODE) observeTree(node as Element)
        }
      }
    })
    mutations.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      mutations.disconnect()
    }
  }, [pathname])
}
