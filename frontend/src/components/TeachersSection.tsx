import InfiniteGallery from './InfiniteGallery'
import ProfileCard from './ProfileCard'
import { revealDelay } from '../lib/motion'
import { TEACHERS, whatsappTeacher, type Teacher } from '../data/site'
import './HomeSections.css'

function TeacherGrid() {
  return (
    <div className="ta-teacher-grid">
      {TEACHERS.map((t, i) => (
        <article className="ta-teacher-card" key={t.name} data-reveal style={revealDelay(i)}>
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

function TeacherProfileCard({ teacher, intro }: { teacher: Teacher; intro: boolean }) {
  const openEnquiry = () => {
    window.open(whatsappTeacher(teacher.name), '_blank', 'noopener,noreferrer')
  }
  return (
    <ProfileCard
      avatarUrl={teacher.photo}
      miniAvatarUrl={teacher.photo}
      name={teacher.name}
      title={`${teacher.subject} · ${teacher.credential}`}
      handle={handleOf(teacher.name)}
      status={teacher.experience}
      contactText="Enquire"
      onContactClick={openEnquiry}
      theme="light"
      enableTilt
      intro={intro}
      showUserInfo
    />
  )
}

/** Home "Meet Our Teachers" — endless 3D drift field of ProfileCards.
 *  Row 1 is live; row 2 drifts the opposite way as pure decoration.
 *  The full /teachers page keeps the plain photo grid. */
export default function TeachersSection({ preview = true }: { preview?: boolean }) {
  return (
    <section className="ta-section" aria-labelledby="ta-teachers-title">
      <div className="ta-section__wrap">
        <p className="ta-section__kicker" data-reveal style={revealDelay(0, 60)}>
          Faculty · PRD T-01
        </p>
        <h2 id="ta-teachers-title" data-reveal style={revealDelay(1, 60)}>
          Meet Our Teachers
        </h2>
        <p className="ta-section__lead" data-reveal style={revealDelay(2, 60)}>
          Experienced, dedicated subject teachers who make tough concepts simple. Drift through
          the faculty — drag a row, hover to pause.
        </p>
        {preview ? (
          <div className="ta-ig-rows">
            <InfiniteGallery
              items={TEACHERS}
              renderItem={(t, _i, copy) => <TeacherProfileCard teacher={t} intro={copy === 0} />}
              speed={45}
              ariaLabel="Faculty gallery, row one"
            />
            <InfiniteGallery
              items={TEACHERS}
              renderItem={(t) => <TeacherProfileCard teacher={t} intro={false} />}
              speed={-30}
              ariaLabel="Faculty gallery, row two"
              decorative
            />
          </div>
        ) : (
          <TeacherGrid />
        )}
      </div>
    </section>
  )
}
