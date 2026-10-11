import { Link } from 'react-router-dom'
import Page from './Page'
import { COURSES, TEACHERS } from '../data/site'
import { SYLLABUS_TRACKS, trackCounts } from '../data/syllabus'
import './Page.css'

const UNIQUE = [
  {
    title: 'Authentic questions',
    text: 'Syllabus-aligned questions curated and reviewed by top mentors.',
  },
  {
    title: 'HD video lectures',
    text: 'Watch anytime, on web and mobile — live classes plus recordings.',
  },
  {
    title: 'Exam tricks & shortcuts',
    text: 'Techniques to solve faster under real exam pressure.',
  },
  {
    title: 'Live expert sessions',
    text: 'Learn directly from subject teachers with instant clarification.',
  },
  {
    title: 'Performance analytics',
    text: 'Track progress, scores and weak areas week by week.',
  },
  {
    title: '24/7 doubt support',
    text: 'Submit questions anytime so you are never stuck for long.',
  },
]

const PROGRAMS = [
  {
    title: 'Class 11 & 12 Tuition',
    text: 'Complete, syllabus-aligned coaching for NEB Class 11 & 12 — live classes, weekly mocks and progress tracking.',
  },
  {
    title: 'Premium Study Materials',
    text: 'HD lectures, chapterwise notes and authentic question banks built by top mentors.',
  },
  {
    title: 'Advanced Practice Sets',
    text: 'Thousands of practice questions and full-length CBT mock tests modelled on the real exam.',
  },
  {
    title: 'Active Community',
    text: 'A supportive peer community and mentors available around the clock to keep you motivated.',
  },
]

export default function About() {
  // Verifiable figures only (PRD H-02, open question 4): computed from our own data files.
  const topics = SYLLABUS_TRACKS.reduce((a, t) => a + trackCounts(t).topics, 0)
  const stats = [
    { value: String(TEACHERS.length), label: 'Expert teachers' },
    { value: String(COURSES.length), label: 'Live courses' },
    { value: String(SYLLABUS_TRACKS.length), label: 'Exam tracks' },
    { value: topics.toLocaleString('en-NP'), label: 'Syllabus topics' },
  ]

  return (
    <Page
      kicker="About The Achievers"
      title="Empowering Students, Building Futures"
      lead="The Achievers Institute of Learning is a technology-driven online tuition platform for Class 11 & 12 (Science & Management), plus Medical (CEE) and entrance preparation — pairing expert mentorship with a deep repository of practice and mock tests."
    >
      <section aria-labelledby="ta-about-unique">
        <h2 id="ta-about-unique" className="ta-section-title">
          What Makes Us Unique?
        </h2>
        <div className="ta-cards">
          {UNIQUE.map((u) => (
            <div className="ta-card" key={u.title}>
              <h2>{u.title}</h2>
              <p>{u.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="ta-about-programs" className="ta-about-block">
        <h2 id="ta-about-programs" className="ta-section-title">
          Comprehensive Programs
        </h2>
        <ol className="ta-steps">
          {PROGRAMS.map((p, i) => (
            <li key={p.title}>
              <span className="ta-step-n" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="ta-stats-band" role="region" aria-label="Institute at a glance">
        {stats.map((s) => (
          <div key={s.label}>
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      <section aria-labelledby="ta-about-visit" className="ta-about-block">
        <h2 id="ta-about-visit" className="ta-section-title">
          Visit or Talk to Us
        </h2>
        <div className="ta-cards">
          <div className="ta-card">
            <span className="ta-badge">Centre</span>
            <h2>Mahendranagar</h2>
            <p>Puspalal Chowk, Science Campus Road. Counselling Sun–Fri.</p>
          </div>
          <div className="ta-card">
            <span className="ta-badge">Call</span>
            <h2>+977 9810686665</h2>
            <p>Primary line. Secondaries: 9747968501 · 9747968502.</p>
          </div>
          <div className="ta-card">
            <span className="ta-badge">Online</span>
            <h2>WhatsApp &amp; Email</h2>
            <p>Chat for instalments and enquiries, or write to info.theachiever@gmail.com.</p>
          </div>
        </div>
      </section>

      <div className="ta-cta-band">
        <h2>Join The Achievers today</h2>
        <p>Start with a free mock test or explore the course catalogue.</p>
        <div className="ta-hero__ctas">
          <Link to="/mock-test" className="ta-btn ta-btn--gold">
            Try Free Mock
          </Link>
          <Link to="/courses" className="ta-btn ta-btn--outline ta-btn--on-dark">
            Explore Courses
          </Link>
        </div>
      </div>
    </Page>
  )
}
