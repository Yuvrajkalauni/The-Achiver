import { Link } from 'react-router-dom'
import { revealDelay } from '../lib/motion'
import { FAQS } from '../data/site'
import './HomeSections.css'

export default function FaqSection({
  preview = true,
  showHeader = true,
}: {
  preview?: boolean
  /** False when a parent page already prints this kicker/title (e.g. /faqs). */
  showHeader?: boolean
}) {
  return (
    <section
      className="ta-section"
      aria-labelledby={showHeader ? 'ta-faq-title' : undefined}
      aria-label={showHeader ? undefined : 'Frequently Asked Questions'}
    >
      <div className="ta-section__wrap ta-section__narrow">
        {showHeader && (
          <>
            <p className="ta-section__kicker" data-reveal style={revealDelay(0, 60)}>
              Help · PRD H-03
            </p>
            <h2 id="ta-faq-title" data-reveal style={revealDelay(1, 60)}>
              Frequently Asked Questions
            </h2>
            <p className="ta-section__lead" data-reveal style={revealDelay(2, 60)}>
              Still unsure? Here&apos;s what students &amp; parents ask us most.
            </p>
          </>
        )}
        <div className="ta-faq">
          {FAQS.map((f, i) => (
            <details key={f.q} name="ta-faq" data-reveal style={revealDelay(i, 50)}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
        {preview && (
          <p className="ta-section__more" data-reveal>
            <Link to="/faqs" className="ta-btn ta-btn--outline">
              View all FAQs
            </Link>
          </p>
        )}
      </div>
    </section>
  )
}
