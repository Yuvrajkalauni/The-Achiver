import Page from './Page'
import { revealDelay } from '../lib/motion'

const MOCKS = [
  { badge: '120 min', title: 'IOE 2083 Mock 1', note: 'Free after register — 140 marks.' },
  { badge: '180 min', title: 'CEE Mock 1', note: 'Free after register — 200 marks.' },
  { badge: '120 min', title: 'NEB Class 12 Mock 1', note: 'Free after register — 100 marks.' },
]

export default function MockTest() {
  return (
    <Page
      title="Mock Test"
      lead="Real-exam CBT interface: palette, timer, mark-for-review, autosave and instant results. First test per series is free."
    >
      <div className="ta-cards">
        {MOCKS.map((m, i) => (
          <div className="ta-card" key={m.title} data-reveal style={revealDelay(i)}>
            <span className="ta-badge">{m.badge}</span>
            <h2>{m.title}</h2>
            <p>{m.note}</p>
          </div>
        ))}
      </div>
    </Page>
  )
}
