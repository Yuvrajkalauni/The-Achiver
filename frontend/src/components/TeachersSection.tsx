import ProfileCard from './ProfileCard'
import { TEACHERS, whatsappTeacher } from '../data/site'
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

const handleOf = (name: string) =>
  name
    .toLowerCase()
    .replace(/^(mr|mrs|ms)\.\s*/, '')
    .replace(/[^a-z]+/g, '')

/** Home "Meet Our Teachers" — holographic ProfileCards (React Bits).
 *  The full /teachers page keeps the plain photo grid. */
export default function TeachersSection({ preview = true }: { preview?: boolean }) {
  const openEnquiry = (name: string) => {
    window.open(whatsappTeacher(name), '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="ta-section" aria-labelledby="ta-teachers-title">
      <div className="ta-section__wrap">
        <p className="ta-section__kicker">Faculty · PRD T-01</p>
        <h2 id="ta-teachers-title">Meet Our Teachers</h2>
        <p className="ta-section__lead">
          Experienced, dedicated subject teachers who make tough concepts simple. Hover a card —
          it tilts, catches the light and shows the holo foil.
        </p>
        {preview ? (
          <div className="ta-profile-grid">
            {TEACHERS.map((t) => (
              <ProfileCard
                key={t.name}
                avatarUrl={t.photo}
                miniAvatarUrl={t.photo}
                name={t.name}
                title={`${t.subject} · ${t.credential}`}
                handle={handleOf(t.name)}
                status={t.experience}
                contactText="Enquire"
                onContactClick={() => openEnquiry(t.name)}
                theme="light"
                enableTilt
                intro
                showUserInfo
              />
            ))}
          </div>
        ) : (
          <TeacherGrid />
        )}
      </div>
    </section>
  )
}
