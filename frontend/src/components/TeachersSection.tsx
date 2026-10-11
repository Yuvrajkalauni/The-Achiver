import { Link } from 'react-router-dom'
import { TEACHERS } from '../data/site'
import './HomeSections.css'

export default function TeachersSection({ preview = true }: { preview?: boolean }) {
  const list = preview ? TEACHERS.filter((t) => t.featured) : TEACHERS
  return (
    <section className="ta-section" aria-labelledby="ta-teachers-title">
      <div className="ta-section__wrap">
        <p className="ta-section__kicker">Faculty · PRD T-01</p>
        <h2 id="ta-teachers-title">Meet Our Teachers</h2>
        <p className="ta-section__lead">
          Experienced, dedicated subject teachers who make tough concepts simple.
        </p>
        <div className="ta-teacher-grid">
          {list.map((t) => (
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
        {preview && (
          <p className="ta-section__more">
            <Link to="/teachers" className="ta-btn ta-btn--outline">
              Meet all {TEACHERS.length} teachers
            </Link>
          </p>
        )}
      </div>
    </section>
  )
}
