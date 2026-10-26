import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Page from './Page'
import { revealDelay } from '../lib/motion'
import { SYLLABUS_TRACKS, trackCounts } from '../data/syllabus'
import '../components/Syllabus.css'

// Tracks with a matching free-mock series (PRD §7.4) get chapter practice links (S-04).
const WITH_MOCK_SERIES = new Set(['ioe-entrance', 'neb-xii', 'cee-medical'])

export default function SyllabusTrack() {
  const { slug } = useParams()
  const [query, setQuery] = useState('')
  const track = SYLLABUS_TRACKS.find((t) => t.slug === slug)

  if (!track) {
    return (
      <Page kicker="Syllabus" title="Track not found" lead="This syllabus track does not exist.">
        <p>
          <Link to="/syllabus">← Back to all tracks</Link>
        </p>
      </Page>
    )
  }

  const counts = trackCounts(track)
  const hasWeightage = track.subjects.some((s) => s.weightage > 0)
  const q = query.trim().toLowerCase()

  const subjects = track.subjects
    .map((s) => ({
      ...s,
      chapters: s.chapters
        .map((c) => ({
          ...c,
          topics: c.topics.filter((t) => !q || t.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)),
        }))
        .filter((c) => !q || c.topics.length > 0),
    }))
    .filter((s) => !q || s.chapters.length > 0 || s.title.toLowerCase().includes(q))

  return (
    <Page
      kicker={`${track.title} · PRD S-02`}
      title={track.title}
      lead={
        track.description ??
        `${counts.subjects} subjects · ${counts.chapters} chapters · ${counts.topics} topics`
      }
    >
      <p>
        <Link to="/syllabus">← Back to all tracks</Link>
      </p>
      {track.notice && (
        <p className="ta-notice" role="note">
          {track.notice}
        </p>
      )}
      <input
        type="search"
        className="ta-search"
        placeholder="Search chapters or topics…"
        aria-label={`Search ${track.title} syllabus`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {subjects.length === 0 ? (
        <p className="ta-empty">No chapters or topics match your search.</p>
      ) : (
        <div className="ta-subject-list">
          {subjects.map((s, si) => {
            const topicCount = s.chapters.reduce((a, c) => a + c.topics.length, 0)
            return (
              <details
                key={s.title}
                open={si === 0 && !q}
                name={`syl-${track.slug}`}
                data-reveal
                style={revealDelay(si, 60)}
              >
                <summary>
                  <span>
                    <strong>{s.title}</strong>
                    <small>
                      {s.chapters.length} chapters · {topicCount} topics
                    </small>
                  </span>
                  {hasWeightage && s.weightage > 0 && (
                    <span className="ta-weight" aria-label={`Weightage ${s.weightage} percent`}>
                      {s.weightage}%
                    </span>
                  )}
                </summary>
                {hasWeightage && s.weightage > 0 && (
                  <div
                    className="ta-weight-bar"
                    role="img"
                    aria-label={`${s.title} weightage ${s.weightage} percent`}
                  >
                    <span style={{ width: `${s.weightage}%` }} />
                  </div>
                )}
                <div className="ta-chapter-list">
                  {s.chapters.map((c) => (
                    <details key={c.title} name={`syl-${track.slug}-${si}`}>
                      <summary>
                        {c.title}
                        <small>
                          {c.topics.length} topic{c.topics.length === 1 ? '' : 's'}
                        </small>
                      </summary>
                      <ol>
                        {c.topics.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ol>
                      {WITH_MOCK_SERIES.has(track.slug) && (
                        <p className="ta-practice">
                          <Link to="/mock-test">Practice with mock tests →</Link>
                        </p>
                      )}
                    </details>
                  ))}
                </div>
              </details>
            )
          })}
        </div>
      )}
    </Page>
  )
}
