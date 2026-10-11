import { useState } from 'react'
import { Link } from 'react-router-dom'
import DepthCarousel from './DepthCarousel'
import { TEACHERS } from '../data/site'
import './HomeSections.css'

function TeacherGrid() {
  return (
    <div className="ta-teacher-grid">
      {TEACHERS.map((t) => (
        <article className="ta-teacher-card" key={t.name}>
          <div className="ta-teacher-photo">
            <img src={t.photo} alt={`Portrait of ${t.name}`} loading="lazy" />
            {t.featured && <span className="ta-badge ta-badge--gold">Featured</span>}
          </div>
          <div className="ta-teacher-body">
            <span className="ta-badge">{t.subject}</span>
            <h3>{t.name}</h3>
            <p className="ta-teacher-cred">{t.credential}</p>
            <p className="ta-teacher-meta">
              {t.qualification} · {t.experience}
            </p>
          </div>
        </article>
      ))}
    </div>
  )
}

export default function TeachersSection({ preview = true }: { preview?: boolean }) {
  const [active, setActive] = useState(0)
  const current = TEACHERS[active] ?? TEACHERS[0]

  return (
    <section className="ta-section" aria-labelledby="ta-teachers-title">
      <div className="ta-section__wrap">
        <p className="ta-section__kicker">Faculty · PRD T-01</p>
        <h2 id="ta-teachers-title">Meet Our Teachers</h2>
        <p className="ta-section__lead">
          Experienced, dedicated subject teachers who make tough concepts simple. Drag, use arrows
          or dots to browse all {TEACHERS.length} faculty.
        </p>
        {preview ? (
          <>
            <div className="ta-carousel-wrap">
              <DepthCarousel
                items={TEACHERS.map((t) => ({
                  image: t.photo,
                  alt: `Portrait of ${t.name}, ${t.subject} teacher`,
                }))}
                cardWidth={280}
                cardHeight={360}
                autoplay
                autoplayDelay={3000}
                loop
                onChange={(i) => setActive(i)}
              />
            </div>
            <p className="ta-teacher-caption" aria-live="polite">
              <strong>{current.name}</strong> — {current.subject} · {current.credential}
            </p>
            <p className="ta-section__more">
              <Link to="/teachers" className="ta-btn ta-btn--outline">
                View all {TEACHERS.length} teachers as grid
              </Link>
            </p>
          </>
        ) : (
          <TeacherGrid />
        )}
      </div>
    </section>
  )
}
