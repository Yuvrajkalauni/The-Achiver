import { useState } from 'react'

const DISTRIBUTION = [
  ['English', 4, 20],
  ['Mathematics', 4, 20],
  ['Physics', 4, 20],
  ['Chemistry', 4, 20],
  ['Biology', 4, 20],
] as const

/** PRD Screen B — pre-test instructions with explicit confirmation. */
export default function InstructionsScreen({
  busy,
  onBegin,
  onBack,
}: {
  busy: boolean
  onBegin: () => void
  onBack: () => void
}) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <section className="fm-instructions" aria-labelledby="fm-instructions-title">
      <p className="fm-eyebrow">Before you begin</p>
      <h1 id="fm-instructions-title" className="fm-instructions__title">
        Free Mock Test — instructions
      </h1>
      <p className="fm-instructions__lead">
        This mock test contains 20 multiple-choice questions across five subjects. You will receive
        4 questions each from English, Mathematics, Physics, Chemistry and Biology. Each question
        carries 5 marks, for a total of 100 marks. You have 30 minutes. Your test will be submitted
        automatically when the time expires. You can review your answers before submitting.
      </p>

      <div className="fm-grid-2">
        <div className="fm-panel">
          <h2>Test format</h2>
          <table className="fm-table">
            <caption className="fm-sr-only">Subject distribution</caption>
            <thead>
              <tr>
                <th scope="col">Subject</th>
                <th scope="col">Questions</th>
                <th scope="col">Marks</th>
              </tr>
            </thead>
            <tbody>
              {DISTRIBUTION.map(([subject, count, marks]) => (
                <tr key={subject}>
                  <th scope="row">{subject}</th>
                  <td>{count}</td>
                  <td>{marks}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td>20</td>
                <td>100</td>
              </tr>
            </tfoot>
          </table>
          <dl className="fm-facts fm-facts--inline">
            <div>
              <dt>Duration</dt>
              <dd>30 minutes</dd>
            </div>
            <div>
              <dt>Marks per question</dt>
              <dd>5</dd>
            </div>
            <div>
              <dt>Negative marking</dt>
              <dd>None</dd>
            </div>
          </dl>
        </div>

        <div className="fm-panel">
          <h2>Rules</h2>
          <ul className="fm-rules">
            <li>One correct answer per question (A–D).</li>
            <li>The timer starts when the test begins — the server controls the deadline.</li>
            <li>The test auto-submits when time expires.</li>
            <li>Answers are saved automatically as you work.</li>
            <li>Refreshing the page does not restart the test; it resumes with your answers.</li>
            <li>Results are shown immediately after submission.</li>
          </ul>

          <label className="fm-check">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>I understand the instructions.</span>
          </label>
        </div>
      </div>

      <div className="fm-actions">
        <button type="button" className="fm-btn fm-btn--ghost" onClick={onBack} disabled={busy}>
          Back
        </button>
        <button
          type="button"
          className="fm-btn fm-btn--primary fm-btn--lg"
          onClick={onBegin}
          disabled={!confirmed || busy}
          aria-disabled={!confirmed || busy}
        >
          {busy ? 'Starting…' : 'Begin Test'}
        </button>
      </div>
      {!confirmed && (
        <p className="fm-hint">Tick the box above to enable “Begin Test”.</p>
      )}
    </section>
  )
}
