import { Link } from 'react-router-dom'
import type { Course } from '../data/site'
import './Courses.css'

const npr = (n: number) => `NPR ${n.toLocaleString('en-NP')}`

/** Catalogue card mirroring the live site: banner, online-batch price,
// refund + seat lines, green View Details button (PRD C-01). */
export default function CourseCard({ course }: { course: Course }) {
  const online = course.batches.find((b) => b.mode === 'ONLINE') ?? course.batches[0]
  return (
    <article className="ta-course-card">
      <div className="ta-course-media">
        <img src={course.banner} alt={`${course.title} banner`} loading="lazy" />
      </div>
      <div className="ta-course-body">
        <h3>{course.title}</h3>
        <p className="ta-course-price">
          <s>{npr(online.was)}</s> <strong>{npr(online.price)}</strong>
        </p>
        <p className="ta-course-note">
          ({online.refundable ? 'refundable' : 'non refundable'})
        </p>
        <p className="ta-course-note">Only for first {online.capacity} students</p>
        <Link to={`/courses/${course.slug}`} className="ta-course-btn">
          View Details
        </Link>
      </div>
    </article>
  )
}
