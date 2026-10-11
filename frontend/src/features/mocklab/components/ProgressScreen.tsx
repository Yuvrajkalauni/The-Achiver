import { useEffect, useState } from 'react'
import { labApi } from '../api'
import { SUBJECTS, type TestStatus } from '../types'

export default function ProgressScreen({
  test,
  onReady,
  onStart,
  onFailed,
}: {
  test: TestStatus
  onReady: (t: TestStatus) => void
  onStart: () => void
  onFailed: () => void
}) {
  const [state, setState] = useState<TestStatus>(test)
  const pct = Math.min(100, Math.round((100 * state.generated) / Math.max(state.total, 1)))

  useEffect(() => {
    if (state.status === 'ready' || state.status === 'failed') return
    const id = window.setInterval(async () => {
      try {
        const next = await labApi.status(state.testId)
        setState(next)
        onReady(next)
      } catch {
        /* keep polling; server may be busy */
      }
    }, 3000)
    return () => window.clearInterval(id)
  }, [state.testId, state.status, onReady])

  return (
    <main className="ta-page">
      <section className="ta-page__hero">
        <div className="ta-page__wrap">
          <p className="ta-page__kicker">Generating your test</p>
          <h1>
            {state.generated} / {state.total} questions
          </h1>
          <p className="ta-page__lead">
            The local AI writes in batches of 5 and double-checks each answer. This takes a few
            minutes — you can close this page and come back; progress is saved.
          </p>
        </div>
      </section>
      <div className="ta-page__wrap ta-page__body">
        <div
          className="ta-lab-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={state.total}
          aria-valuenow={state.generated}
          aria-label="Question generation progress"
        >
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="ta-lab-pct">{pct}%</p>
        <ul className="ta-lab-subject-progress">
          {SUBJECTS.map((s) => (
            <li key={s}>
              <strong>{s}</strong>
              <span>
                {state.per_subject[s] ?? 0} / 25
              </span>
            </li>
          ))}
        </ul>
        {state.status === 'ready' && (
          <button type="button" className="ta-btn ta-btn--gold" onClick={onStart}>
            Start test
          </button>
        )}
        {state.status === 'failed' && (
          <>
            <p className="ta-notice" role="alert">
              Generation failed: {state.error || 'unknown error'}
            </p>
            <button type="button" className="ta-btn ta-btn--outline" onClick={onFailed}>
              Back
            </button>
          </>
        )}
      </div>
    </main>
  )
}
