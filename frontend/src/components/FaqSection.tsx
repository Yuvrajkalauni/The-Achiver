import { Link } from 'react-router-dom'
import { FAQS } from '../data/site'
import './HomeSections.css'

export default function FaqSection({ preview = true }: { preview?: boolean }) {
  return (
    <section className="ta-section" aria-labelledby="ta-faq-title">
      <div className="ta-section__wrap ta-section__narrow">
        <p className="ta-section__kicker">Help · PRD H-03</p>
        <h2 id="ta-faq-title">Frequently Asked Questions</h2>
        <p className="ta-section__lead">Still unsure? Here&apos;s what students &amp; parents ask us most.</p>
        <div className="ta-faq">
          {FAQS.map((f) => (
            <details key={f.q} name="ta-faq">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
        {preview && (
          <p className="ta-section__more">
            <Link to="/faqs" className="ta-btn ta-btn--outline">
              View all FAQs
            </Link>
          </p>
        )}
      </div>
    </section>
  )
}
