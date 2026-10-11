import Page from './Page'
import CourseCard from '../components/CourseCard'
import { COURSES } from '../data/site'

export default function Courses() {
  return (
    <Page
      kicker="Catalog · PRD C-01"
      title="Courses"
      lead="Online and physical batches with limited seats — live prices from the institute catalogue."
    >
      <div className="ta-course-grid">
        {COURSES.map((c) => (
          <CourseCard key={c.slug} course={c} />
        ))}
      </div>
    </Page>
  )
}
