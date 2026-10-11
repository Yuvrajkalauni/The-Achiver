import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError, labApi } from '../api'
import { SUBJECTS, type ResultPayload } from '../types'

const LETTERS = ['A', 'B', 'C', 'D'] as const

type StatusFilter = 'all' | 'correct' | 'wrong' | 'unanswered'

function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  return `${m} min ${s % 60} s`
}

export default function ResultScreen() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState<ResultPayload | null>(null)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [busy, setBusy] = useState(false)
  const [minutes, setMinutes] = useState(100)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await labApi.result(Number(attemptId))
        if (!cancelled) setResult(r)
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'Could not load result.')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [attemptId])

  useEffect(() => {
    if (!result || result.evaluation_ready) return
    const id = window.setInterval(async () => {
      try {
        const r = await labApi.result(Number(attemptId))
        setResult(r)
      } catch {
        /* keep showing deterministic scores; AI follows when ready */
      }
    }, 4000)
    return () => window.clearInterval(id)
  }, [result, attemptId])

  async function repeat() {
    if (!result) return
    setBusy(true)
    try {
      const r = await labApi.repeat(result.testId, minutes)
      navigate(`/mock-test?attemptId=${r.attemptId}`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start repeat attempt.')
      setBusy(false)
    }
  }

  async function newTest() {
    setBusy(true)
    try {
      await labApi.generate()
      navigate('/mock-test')
    } catch (e) {
      setError(e instanceof ApiError ? `${e.message} ${e.fix}` : 'Could not generate.')
      setBusy(false)
    }
  }

  if (error && !result) {
    return (
      <main className="ta-page">
        <section className="ta-page__hero">
          <div className="ta-page__wrap">
            <p className="ta-page__kicker">Result</p>
            <h1>Could not load result</h1>
            <p className="ta-page__lead">{error}</p>
          </div>
        </section>
      </main>
    )
  }
  if (!result) {
    return (
      <main className="ta-page">
        <section className="ta-page__hero">
          <div className="ta-page__wrap">
            <p className="ta-page__kicker">Result</p>
            <h1>Loading…</h1>
          </div>
        </section>
      </main>
    )
  }

  const filtered = result.review.filter(
    (r) =>
      (statusFilter === 'all' || r.verdict === statusFilter) &&
      (subjectFilter === 'all' || r.subject === subjectFilter),
  )

  return (
    <main className="ta-page">
      <section className="ta-page__hero">
        <div className="ta-page__wrap">
          <p className="ta-page__kicker">Result · Attempt {result.attemptId}</p>
          <h1>
            {result.score}/{result.total} ({result.percentage}%)
          </h1>
          <p className="ta-page__lead">
            {result.passed ? 'Passed' : 'Not passed'} (pass mark {Math.round(result.pass_mark * 100)}%) · Time
            taken {fmtTime(result.time_taken_s)}
          </p>
        </div>
      </section>
      <div className="ta-page__wrap ta-page__body">
        {!result.evaluation_ready && (
          <p className="ta-notice" role="status">
            Evaluating your answers… AI explanations appear below as they are ready. Scores above
            are final (computed exactly).
          </p>
        )}
        {error && (
          <p className="ta-notice" role="alert">
            {error}
          </p>
        )}

        <div className="ta-cards">
          {SUBJECTS.map((s) => {
            const cell = result.per_subject[s] ?? { score: 0, total: 0 }
            const pct = cell.total ? Math.round((100 * cell.score) / cell.total) : 0
            return (
              <div className="ta-card" key={s}>
                <h2>{s}</h2>
                <p>
                  {cell.score}/{cell.total} · {pct}%
                </p>
                <div className="ta-lab-bar" role="img" aria-label={`${s} score ${pct} percent`}>
                  <span style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        <section aria-label="AI performance summary" className="ta-lab-summary">
          <h2>Performance summary</h2>
          <p>{result.ai_summary || 'Summary is being written…'}</p>
          {result.ai_summary_fallback && <small>Computed from your scores (AI was unavailable).</small>}
        </section>

        <div className="ta-lab-actions">
          <label className="ta-lab-field">
            Timer for next attempt
            <input type="number" min={5} max={300} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
          </label>
          <button type="button" className="ta-btn ta-btn--gold" disabled={busy} onClick={repeat}>
            Repeat Test
          </button>
          <button type="button" className="ta-btn ta-btn--outline" disabled={busy} onClick={newTest}>
            New Test
          </button>
        </div>

        <div className="ta-lab-filters">
          <div role="group" aria-label="Filter by verdict">
            {(['all', 'correct', 'wrong', 'unanswered'] as const).map((f) => (
              <button
                key={f}
                type="button"
                className={`ta-chip${statusFilter === f ? ' is-active' : ''}`}
                aria-pressed={statusFilter === f}
                onClick={() => setStatusFilter(f)}
              >
                {f[0].toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Filter by subject">
            {['all', ...SUBJECTS].map((s) => (
              <button
                key={s}
                type="button"
                className={`ta-chip${subjectFilter === s ? ' is-active' : ''}`}
                aria-pressed={subjectFilter === s}
                onClick={() => setSubjectFilter(s)}
              >
                {s === 'all' ? 'All subjects' : s}
              </button>
            ))}
          </div>
        </div>

        <ol className="ta-lab-review">
          {filtered.map((r, i) => (
            <li key={r.question_id} className={`ta-lab-review__item is-${r.verdict}`}>
              <p className="ta-lab-qmeta">
                Q{i + 1} · {r.subject} · {r.difficulty}
              </p>
              <p className="ta-lab-qtext">{r.text}</p>
              <ul>
                {r.options.map((opt, oi) => {
                  const mine = r.selected === oi
                  const key = r.correct_index === oi
                  return (
                    <li key={oi} className={key ? 'is-key' : mine ? 'is-mine' : ''}>
                      <strong>{LETTERS[oi]}.</strong> {opt}
                      {key && <span className="ta-lab-tag">correct</span>}
                      {mine && !key && <span className="ta-lab-tag">yours</span>}
                    </li>
                  )
                })}
              </ul>
              <p>
                <span className={`ta-lab-verdict is-${r.verdict}`}>
                  {r.verdict === 'correct' ? 'Correct' : r.verdict === 'wrong' ? 'Wrong' : 'Unanswered'}
                </span>{' '}
                <small>{r.explanation_ai ? 'AI explanation' : 'Stored explanation'}</small>
              </p>
              <p className="ta-lab-explain">{r.explanation}</p>
            </li>
          ))}
        </ol>
      </div>
    </main>
  )
}
