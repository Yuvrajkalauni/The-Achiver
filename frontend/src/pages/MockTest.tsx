import Page from './Page'

export default function MockTest() {
  return (
    <Page
      kicker="PRD M-01 / M-02"
      title="Mock Test"
      lead="Real-exam CBT interface: palette, timer, mark-for-review, autosave and instant results. First test per series is free."
    >
      <div className="ta-cards">
        <div className="ta-card"><span className="ta-badge">120 min</span><h2>IOE 2083 Mock 1</h2><p>Free after register — 140 marks.</p></div>
        <div className="ta-card"><span className="ta-badge">180 min</span><h2>CEE Mock 1</h2><p>Free after register — 200 marks.</p></div>
        <div className="ta-card"><span className="ta-badge">120 min</span><h2>NEB Class 12 Mock 1</h2><p>Free after register — 100 marks.</p></div>
      </div>
    </Page>
  )
}
