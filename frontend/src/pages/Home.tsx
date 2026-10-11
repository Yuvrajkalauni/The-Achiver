import Page from './Page'

export default function Home() {
  return (
    <Page
      kicker="Nepal's online tuition platform"
      title="AI Powered Online Tuition Classes Platform"
      lead="Daily live classes, recordings, notes and CBT mock tests for Class 11 & 12, SEE, CEE, IOE and CSIT — online and in-centre."
    >
      <div className="ta-cards">
        <div className="ta-card"><span className="ta-badge">H-01 Hero</span><h2>Explore Courses</h2><p>Online + physical batches with real prices and seats.</p></div>
        <div className="ta-card"><span className="ta-badge">M-03 Free mock</span><h2>Try a free mock</h2><p>First test of each series is free after register.</p></div>
        <div className="ta-card"><span className="ta-badge">L-02 Counselling</span><h2>Free counselling</h2><p>1-on-1 session, callback within 24 hours.</p></div>
      </div>
    </Page>
  )
}
