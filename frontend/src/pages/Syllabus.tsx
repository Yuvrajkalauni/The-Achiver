import { Link } from 'react-router-dom'
import Page from './Page'
import { revealDelay } from '../lib/motion'
import { SYLLABUS_TRACKS, trackCounts } from '../data/syllabus'
import '../components/Syllabus.css'

export default function Syllabus() {
  return (
    <Page
      kicker="Exam tracks · PRD S-01"
      title="Syllabus"
      lead="Five exam tracks with subjects, chapters, topics and weightage — live data from the institute catalogue."
    >
      <div className="ta-track-grid">
        {SYLLABUS_TRACKS.map((t, i) => {
          const c = trackCounts(t)
          return (
            <article className="ta-track-card" key={t.slug} data-reveal style={revealDelay(i)}>
              <div className="ta-track-body">
                <h3>{t.title}</h3>
                {t.description && <p className="ta-track-desc">{t.description}</p>}
                <ul className="ta-count-row" aria-label={`${t.title} contents`}>
                  <li>
                    <strong>{c.subjects}</strong> subjects
                  </li>
                  <li>
                    <strong>{c.chapters}</strong> chapters
                  </li>
                  <li>
                    <strong>{c.topics}</strong> topics
                  </li>
                </ul>
                <Link to={`/syllabus/${t.slug}`} className="ta-btn ta-btn--outline">
                  Open track
                </Link>
              </div>
            </article>
          )
        })}
      </div>
      <p className="ta-track-note">
        NEB Class 11 track follows once the academic team finalises its chapters (PRD S-05).
      </p>
    </Page>
  )
}
