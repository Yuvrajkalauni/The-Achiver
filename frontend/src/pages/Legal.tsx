import { useParams } from 'react-router-dom'
import Page from './Page'

// PRD §14 stubs — full copy managed in CMS (X-02); keeps footer links live.
const COPY: Record<string, { title: string; kicker: string; body: string[] }> = {
  privacy: {
    title: 'Privacy Policy',
    kicker: 'Legal · PRD §14',
    body: [
      'We collect account, enrolment, payment, learning-activity and basic technical data needed to run classes, tests and support.',
      'We never sell personal data. Data is shared only with payment, SMS and email providers, or when required by law.',
      'Write to info.theachiever@gmail.com to request access, correction or deletion of your account data.',
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    kicker: 'Legal · PRD §14',
    body: [
      'Accounts are for individual use. Prices are in NPR; access is granted after payment confirmation.',
      'Batches are non-refundable once activated, except where the law requires otherwise.',
      'Course content may not be copied or resold. Enrolment does not guarantee any exam result.',
    ],
  },
  cookies: {
    title: 'Cookies Policy',
    kicker: 'Legal · PRD §14',
    body: [
      'Essential cookies and local storage keep you logged in and remember theme and language.',
      'Performance cookies (analytics) run only after you consent via the cookie banner.',
      'You can change consent anytime from your browser settings.',
    ],
  },
}

export default function Legal() {
  const { page = 'privacy' } = useParams()
  const doc = COPY[page] ?? COPY.privacy
  return (
    <Page kicker={doc.kicker} title={doc.title} lead="Short R1 summary — full version ships with the CMS.">
      <div className="ta-cards">
        {doc.body.map((p) => (
          <div className="ta-card" key={p.slice(0, 24)}>
            <p>{p}</p>
          </div>
        ))}
      </div>
    </Page>
  )
}
