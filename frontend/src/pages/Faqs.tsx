import Page from './Page'
import FaqSection from '../components/FaqSection'

export default function Faqs() {
  return (
    <Page
      title="Frequently Asked Questions"
      lead="What students and parents ask us most."
    >
      <FaqSection preview={false} showHeader={false} />
    </Page>
  )
}
