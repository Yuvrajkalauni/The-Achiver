import Page from './Page'

export default function Syllabus() {
  return (
    <Page
      kicker="PRD S-01 / S-02"
      title="Syllabus"
      lead="Five tracks: IOE, BSc CSIT, IOE MSc, NEB Grade XII, CEE Medical — subjects, chapters, topics and weightage."
    >
      <div className="ta-cards">
        <div className="ta-card"><span className="ta-badge">IOE</span><h2>IOE Entrance</h2><p>4 subjects · 15 chapters · 105 topics.</p></div>
        <div className="ta-card"><span className="ta-badge">NEB</span><h2>NEB Grade XII</h2><p>5 subjects · 32 chapters · 145 topics.</p></div>
        <div className="ta-card"><span className="ta-badge">CEE</span><h2>CEE Medical</h2><p>5 subjects · 30 chapters · 174 topics.</p></div>
      </div>
    </Page>
  )
}
