import Page from './Page'

export default function About() {
  return (
    <Page
      kicker="The Achievers"
      title="About"
      lead="Institute of Learning, Puspalal Chowk, Science Campus Road, Mahendranagar — online + physical batches, daily live classes and weekly mocks."
    >
      <div className="ta-cards">
        <div className="ta-card"><span className="ta-badge">Contact</span><h2>+977 9810686665</h2><p>Single primary number site-wide (PRD L-06).</p></div>
        <div className="ta-card"><span className="ta-badge">Email</span><h2>info.theachiever@gmail.com</h2><p>Counselling + support.</p></div>
        <div className="ta-card"><span className="ta-badge">Hours</span><h2>Sun–Fri</h2><p>Single source of truth (PRD L-03).</p></div>
      </div>
    </Page>
  )
}
