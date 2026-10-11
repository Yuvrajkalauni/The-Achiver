import { Link, useParams } from 'react-router-dom'
import Page from './Page'
import { COURSES, whatsappEnquiry } from '../data/site'

const npr = (n: number) => `NPR ${n.toLocaleString('en-NP')}`

export default function CourseDetail() {
  const { slug } = useParams()
  const course = COURSES.find((c) => c.slug === slug)

  if (!course) {
    return (
      <Page kicker="Catalog" title="Course not found" lead="This course does not exist.">
        <p>
          <Link to="/courses">← Back to all courses</Link>
        </p>
      </Page>
    )
  }

  return (
    <Page kicker={course.goal} title={course.title} lead={course.subtitle}>
      <p>
        <Link to="/courses">← Back to all courses</Link>
      </p>
      <div className="ta-detail-grid">
        <img
          src={course.banner}
          alt={`${course.title} banner`}
          className="ta-detail-banner"
        />
        <ul className="ta-batch-list">
          {course.batches.map((b) => {
            const off = Math.round((1 - b.price / b.was) * 100)
            const left = b.capacity - b.taken
            return (
              <li key={b.name} className="ta-batch">
                <div className="ta-batch-top">
                  <span className={`ta-mode ta-mode--${b.mode.toLowerCase()}`}>{b.mode}</span>
                  <span className="ta-off">{off}% off</span>
                </div>
                <p className="ta-batch-name">{b.name}</p>
                <p className="ta-batch-price">
                  <strong>{npr(b.price)}</strong> <s>{npr(b.was)}</s>
                </p>
                <p className="ta-batch-meta">
                  {left} of {b.capacity} seats left ·{' '}
                  {b.refundable ? 'Refundable' : 'Non-refundable once activated'}
                </p>
                <a
                  className="ta-batch-cta"
                  href={whatsappEnquiry(course.title, b.name)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Enquire on WhatsApp
                </a>
              </li>
            )
          })}
        </ul>
      </div>
      <p className="ta-detail-faculty">
        <Link to="/teachers">View faculty →</Link>
      </p>
    </Page>
  )
}
