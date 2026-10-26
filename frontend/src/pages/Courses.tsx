import Page from './Page'
import CourseCard from '../components/CourseCard'
import { COURSES } from '../data/site'

export default function Courses() {
  return (
    <Page
      title="Courses"
      lead="Online and physical batches with limited seats — live prices from the institute catalogue."
    >
      <div className="ta-course-grid">
        {COURSES.map((c, i) => (
          <CourseCard key={c.slug} course={c} index={i} />
        ))}
      </div>
    </Page>
  )
}
