import { useState } from 'react'
import Page from './Page'
import CourseCard from '../components/CourseCard'
import { COURSES } from '../data/site'

const MODES = ['All', 'ONLINE', 'PHYSICAL'] as const

export default function Courses() {
  const [mode, setMode] = useState<(typeof MODES)[number]>('All')
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const list = COURSES.filter((c) => {
    const modeOk = mode === 'All' || c.batches.some((b) => b.mode === mode)
    const qOk =
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.subtitle.toLowerCase().includes(q) ||
      c.goal.toLowerCase().includes(q) ||
      c.batches.some((b) => b.name.toLowerCase().includes(q))
    return modeOk && qOk
  })

  return (
    <Page
      kicker="Catalog · PRD C-01 / C-02"
      title="Courses"
      lead="Online and physical batches with limited seats — live prices from the institute catalogue."
    >
      <div className="ta-filters" role="group" aria-label="Filter by mode">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            className={`ta-chip${mode === m ? ' is-active' : ''}`}
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
          >
            {m === 'All' ? 'All modes' : m === 'ONLINE' ? 'Online' : 'Physical'}
          </button>
        ))}
      </div>
      <input
        type="search"
        className="ta-search"
        placeholder="Search courses or batches…"
        aria-label="Search courses"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {list.length === 0 ? (
        <p className="ta-empty">No courses match your search.</p>
      ) : (
        <div className="ta-course-grid">
          {list.map((c) => (
            <CourseCard key={c.slug} course={c} />
          ))}
        </div>
      )}
    </Page>
  )
}
