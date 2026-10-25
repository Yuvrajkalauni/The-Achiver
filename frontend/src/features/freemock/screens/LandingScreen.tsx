const SUBJECT_NAMES = ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology']

const FACTS = [
  { value: '20', label: 'Questions' },
  { value: '100', label: 'Total marks' },
  { value: '30', label: 'Minutes' },
  { value: '4', label: 'Per subject' },
]

/** PRD Screen A — landing page. */
export default function LandingScreen({
  resumable,
  onStart,
  onResume,
}: {
  resumable: boolean
  onStart: () => void
  onResume: () => void
}) {
  return (
    <section className="fm-landing">
      <p className="fm-eyebrow">Free Mock Test</p>
      <h1 className="fm-landing__title">Test your readiness across five subjects</h1>
      <p className="fm-landing__lead">
        20 questions, five subjects, 30 minutes, instant result — practise under real exam
        conditions and review every answer the moment you submit.
      </p>

      <ul className="fm-facts" aria-label="Test facts">
        {FACTS.map((fact) => (
          <li key={fact.label}>
            <span className="fm-facts__value">{fact.value}</span>
            <span className="fm-facts__label">{fact.label}</span>
          </li>
        ))}
      </ul>

      <div className="fm-landing__cta">
        <button type="button" className="fm-btn fm-btn--primary fm-btn--lg" onClick={resumable ? onResume : onStart}>
          {resumable ? 'Resume Test' : 'Start Mock Test'}
        </button>
        <a className="fm-btn fm-btn--ghost fm-btn--lg" href="#how">
          How it works
        </a>
      </div>

      <p className="fm-landing__note">
        {resumable
          ? 'You have an attempt in progress — your saved answers and remaining time are waiting exactly where you left them.'
          : 'No sign-up needed. Your progress is saved as you go, so a refresh never restarts your test.'}
      </p>

      <div className="fm-subjects" aria-label="Subjects covered">
        {(SUBJECT_NAMES as string[]).map((name) => (
          <span key={name} className="fm-chip">
            {name}
          </span>
        ))}
      </div>

      <section className="fm-panel" id="how">
        <h2>How it works</h2>
        <ol className="fm-steps">
          <li>
            <strong>Read the instructions.</strong> 4 questions from each subject, 5 marks each, no
            negative marking.
          </li>
          <li>
            <strong>Start the clock.</strong> The 30-minute timer begins the moment the server
            creates your test — it keeps running even if you refresh.
          </li>
          <li>
            <strong>Answer and navigate freely.</strong> Jump between questions with the palette;
            answers save automatically.
          </li>
          <li>
            <strong>Submit or let it auto-submit.</strong> Your score, subject breakdown and full
            answer review appear instantly.
          </li>
        </ol>
      </section>

      <section className="fm-panel fm-panel--muted" id="help">
        <h2>Rules at a glance</h2>
        <ul className="fm-rules">
          <li>Exactly 20 questions — 4 each from English, Mathematics, Physics, Chemistry and Biology.</li>
          <li>Each question carries 5 marks; maximum score 100 marks.</li>
          <li>One correct answer per question. Wrong and unanswered answers both score 0.</li>
          <li>The test submits automatically when the timer reaches zero.</li>
          <li>Results and explanations are shown only after you submit.</li>
        </ul>
      </section>
    </section>
  )
}
