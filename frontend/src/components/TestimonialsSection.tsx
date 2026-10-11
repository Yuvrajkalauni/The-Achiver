import InfiniteSpiral from './InfiniteSpiral'
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
        <p className="ta-section__lead">
          Loved by Class 11 &amp; 12 students across Nepal. Drag the helix or just scroll — it
          flows with the page and pauses on hover.
        </p>
        <div className="ta-spiral-wrap">
          <InfiniteSpiral
            items={list.map((t, i) => ({ id: `t-${i}`, alt: `${t.name}, ${t.meta}` }))}
            renderItem={(_item, i) => {
              const t = list[i]
              return (
                <figure className="ta-spiral-quote">
                  <span className="ta-stars" aria-label="5 out of 5 stars">
                    ★★★★★
                  </span>
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
              )
            }}
            ariaLabel="Student testimonials spiral"
            animationMode="all"
            speed={0.55}
            cardWidth={260}
            cardHeight={300}
            verticalSpacing={140}
            cardRadius={20}
            centerScale={1.15}
            edgeBlur={6}
            cardsPerTurn={7}
            pauseOnHover
          />
        </div>
      </div>
    </section>
  )
}
