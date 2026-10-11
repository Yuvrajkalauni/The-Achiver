import Page from './Page'

export default function Courses() {
  return (
    <Page
      kicker="PRD C-01 / C-02"
      title="Courses"
      lead="Catalogue with online / physical filter and goal filter (SEE, Class 11, Class 12, CEE, IOE). Full cards land with the course build."
    >
      <div className="ta-cards">
        <div className="ta-card"><span className="ta-badge">Online</span><h2>SEE Online — NPR 500</h2><p>Placeholder — wired to /api/v1/courses next.</p></div>
        <div className="ta-card"><span className="ta-badge">Online</span><h2>CEE Neuron — NPR 15,000</h2><p>Tutors: D. Thapa, S. Airi, P. Saud.</p></div>
        <div className="ta-card"><span className="ta-badge">Physical</span><h2>IOE Pragati — NPR 15,000</h2><p>Physical batch, 100 seats.</p></div>
      </div>
    </Page>
  )
}
