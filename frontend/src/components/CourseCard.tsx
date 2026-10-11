import { Link } from 'react-router-dom'
import type { Course } from '../data/site'
import { whatsappEnquiry } from '../data/site'
import './Courses.css'

const npr = (n: number) => `NPR ${n.toLocaleString('en-NP')}`

export default function CourseCard({ course }: { course: Course }) {
  const minPrice = Math.min(...course.batches.map((b) => b.price))
  return (
    <article className="ta-course-card">
      <div className="ta-course-media">
        <img src={course.banner} alt={`${course.title} banner`} loading="lazy" />
        <span className="ta-badge ta-badge--gold">{course.goal}</span>
      </div>
      <div className="ta-course-body">
        <h3>{course.title}</h3>
        <p className="ta-course-sub">{course.subtitle}</p>
        <p className="ta-course-from">
          From <strong>{npr(minPrice)}</strong>
        </p>
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
        <Link to="/teachers" className="ta-course-faculty">
          View faculty →
        </Link>
      </div>
    </article>
  )
}
