import Page from './Page'
import TeachersSection from '../components/TeachersSection'

export default function Teachers() {
  return (
    <Page
      kicker="Faculty · PRD T-01"
      title="Meet Our Teachers"
      lead="Learn from experienced, dedicated subject teachers who make tough concepts simple."
    >
      <TeachersSection preview={false} showHeader={false} />
    </Page>
  )
}
