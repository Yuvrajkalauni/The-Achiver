import { TESTIMONIALS } from '../data/site'
import './HomeSections.css'

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function TestimonialsSection({ preview = true }: { preview?: boolean }) {
  const list = preview ? TESTIMONIALS.slice(0, 6) : TESTIMONIALS
  return (
    <section className="ta-section ta-section--tint" aria-labelledby="ta-testimonials-title">
      <div className="ta-section__wrap">
        <p className="ta-section__kicker">Social proof · PRD H-04</p>
        <h2 id="ta-testimonials-title">What Our Students Say</h2>
        <p className="ta-section__lead">Loved by Class 11 &amp; 12 students across Nepal.</p>
        <div className="ta-cards">
          {list.map((t) => (
            <figure className="ta-card ta-quote" key={t.name}>
              <span className="ta-stars" aria-label="5 out of 5 stars">★★★★★</span>
              <blockquote>
                <p>{t.quote}</p>
              </blockquote>
              <figcaption>
                <span className="ta-avatar" aria-hidden="true">
                  {initials(t.name)}
                </span>
                <span>
                  <strong>{t.name}</strong>
                  <br />
                  <small>{t.meta}</small>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
