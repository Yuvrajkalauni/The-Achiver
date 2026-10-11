import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, labApi } from '../api'
import type { AttemptPayload, RoundResult } from '../types'

const LETTERS = ['A', 'B', 'C', 'D'] as const
const ROUNDS_TOTAL = 20

function fmt(s: number): string {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

type Phase = 'answer' | 'confirm' | 'roundResult' | 'genNext'

export default function TestScreen({
  initial,
  onSubmitted,
}: {
  initial: AttemptPayload
  onSubmitted: (attemptId: number) => void
}) {
  const [snapshot, setSnapshot] = useState<AttemptPayload>(initial)
  const [answers, setAnswers] = useState<Record<number, number | null>>(() => {
    const map: Record<number, number | null> = {}
    for (const [k, v] of Object.entries(initial.answers)) map[Number(k)] = v
    return map
  })
  const [round, setRound] = useState<number>(() => firstOpenRound(initial))
  const [phase, setPhase] = useState<Phase>('answer')
  const [remaining, setRemaining] = useState<number>(initial.remaining_s)
  const [saving, setSaving] = useState<number | null>(null)
  const [saveError, setSaveError] = useState('')
  const [genError, setGenError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submittedRef = useRef(false)

  const questions = snapshot.questions
  const roundQs = useMemo(() => questions.filter((q) => q.round_no === round), [questions, round])
  const roundSubject = roundQs[0]?.subject ?? ''
  const answeredTotal = useMemo(
    () => questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== null).length,
    [questions, answers],
  )
  const unansweredRound = useMemo(
    () => roundQs.filter((q) => answers[q.id] === undefined || answers[q.id] === null),
    [roundQs, answers],
  )
  const roundResult: RoundResult | null = snapshot.round_results[String(round)] ?? null
  const isLastRound = round >= ROUNDS_TOTAL - 1

  async function refresh() {
    const next = await labApi.attempt(snapshot.attemptId)
    setSnapshot(next)
    setAnswers((prev) => {
      const map = { ...prev }
      for (const [k, v] of Object.entries(next.answers)) {
        const id = Number(k)
        if (map[id] === undefined) map[id] = v
      }
      return map
    })
    return next
  }

  // If the current round has no questions yet, generate them.
  useEffect(() => {
    if (roundQs.length >= 5 || snapshot.test_complete) return
    let cancelled = false
    async function gen() {
      setPhase('genNext')
      setGenError('')
      try {
        await labApi.generateNext(snapshot.testId)
        for (let i = 0; i < 120; i++) {
          await new Promise((r) => setTimeout(r, 3000))
          if (cancelled) return
          const st = await labApi.status(snapshot.testId)
          if (st.status === 'failed') throw new ApiError(500, st.error || 'Generation failed.')
          if (st.generated > round * 5) break
        }
        if (cancelled) return
        const next = await refresh()
        if (next.questions.filter((q) => q.round_no === round).length >= 5) {
          setPhase('answer')
        } else {
          setGenError('The next 5 are taking longer than expected — retrying helps.')
          setPhase('answer')
        }
      } catch (e) {
        if (!cancelled) {
          setGenError(e instanceof ApiError ? `${e.message} ${e.fix}` : 'Generation failed.')
          setPhase('answer')
        }
      }
    }
    void gen()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  // Poll round explanations until ready.
  useEffect(() => {
    if (phase !== 'roundResult') return
    if (roundResult?.ready) return
    const id = window.setInterval(() => {
      refresh().catch(() => {})
    }, 3000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round])

  async function finalSubmit() {
    if (submittedRef.current || submitting) return
    submittedRef.current = true
    setSubmitting(true)
    try {
      await labApi.submit(snapshot.attemptId)
      onSubmitted(snapshot.attemptId)
    } catch (e) {
      submittedRef.current = false
      setSubmitting(false)
      setSaveError(e instanceof ApiError ? e.message : 'Submit failed. Try again.')
    }
  }

  useEffect(() => {
    if (remaining <= 0) {
      void finalSubmit()
      return
    }
    const id = window.setInterval(() => setRemaining((r) => r - 1), 1000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining <= 0])

  async function choose(qid: number, value: number | null) {
    const prev = answers[qid] ?? null
    setAnswers((a) => ({ ...a, [qid]: value }))
    setSaving(qid)
    setSaveError('')
    try {
      await labApi.saveAnswer(snapshot.attemptId, qid, value)
    } catch (e) {
      setAnswers((a) => ({ ...a, [qid]: prev }))
      if (e instanceof ApiError && e.status === 409) {
        void finalSubmit()
      } else {
        setSaveError(e instanceof ApiError ? e.message : 'Could not save. Check connection.')
      }
    } finally {
      setSaving(null)
    }
  }

  async function confirmRound() {
    setSubmitting(true)
    setSaveError('')
    try {
      await labApi.submitRound(snapshot.attemptId, round)
      await refresh()
      setPhase('roundResult')
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : 'Round submit failed.')
    } finally {
      setSubmitting(false)
    }
  }

  function nextRound() {
    setPhase('answer')
    setRound((r) => r + 1)
    window.scrollTo({ top: 0 })
  }

  const showQuestions = phase === 'answer' || phase === 'confirm'

  return (
    <main className="ta-page ta-lab">
      <div className="ta-lab-topbar">
        <div className="ta-lab-topbar__inner">
          <strong>
            Round {round + 1}/{ROUNDS_TOTAL} · {roundSubject}
          </strong>
          <span>{answeredTotal}/100 answered</span>
          <span className={`ta-lab-timer${remaining < 300 ? ' is-low' : ''}`} role="timer" aria-label="Time remaining">
            {fmt(remaining)}
          </span>
          <span className="ta-lab-save" aria-live="polite">
            {saving !== null ? 'Saving…' : saveError ? 'Save error' : 'Saved'}
          </span>
        </div>
      </div>
      {saveError && (
        <p className="ta-notice" role="alert">
          {saveError}
        </p>
      )}

      <div className="ta-lab-layout">
        <div className="ta-lab-main">
          {phase === 'genNext' && (
            <div role="status">
              <h2>Generating your next 5 questions…</h2>
              <div
                className="ta-lab-bar"
                role="progressbar"
                aria-label="Next round generation"
                aria-valuemin={round * 5}
                aria-valuemax={round * 5 + 5}
                aria-valuenow={questions.length}
              >
                <span style={{ width: `${Math.min(100, (100 * questions.length) / (round * 5 + 5))}%` }} />
              </div>
              {genError && (
                <p className="ta-notice" role="alert">
                  {genError}
                </p>
              )}
            </div>
          )}

          {showQuestions &&
            roundQs.map((q, i) => (
              <fieldset key={q.id} id={`lab-q-${q.id}`} className="ta-lab-q">
                <legend tabIndex={-1}>
                  Q{round * 5 + i + 1}. {q.text}
                </legend>
                <p className="ta-lab-qmeta">
                  {q.subject} · {q.difficulty}
                  {q.topic ? ` · ${q.topic}` : ''}
                </p>
                {q.options.map((opt, oi) => (
                  <label key={oi} className="ta-lab-opt">
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={answers[q.id] === oi}
                      onChange={() => choose(q.id, oi)}
                    />
                    <span className="ta-lab-letter" aria-hidden="true">
                      {LETTERS[oi]}
                    </span>
                    {opt}
                  </label>
                ))}
                <div className="ta-lab-qactions">
                  <span aria-live="polite">{saving === q.id ? 'Saving…' : ''}</span>
                  <button
                    type="button"
                    className="ta-lab-clear"
                    disabled={answers[q.id] === undefined || answers[q.id] === null}
                    onClick={() => choose(q.id, null)}
                  >
                    Clear selection
                  </button>
                </div>
              </fieldset>
            ))}

          {phase === 'answer' && roundQs.length > 0 && (
            <button type="button" className="ta-btn ta-btn--gold" onClick={() => setPhase('confirm')}>
              Submit these 5
            </button>
          )}

          {phase === 'roundResult' && roundResult && (
            <section aria-label={`Round ${round + 1} result`} className="ta-lab-roundresult">
              <h2>
                Round {round + 1}: {roundResult.score}/{roundResult.total}
              </h2>
              {!roundResult.ready && <p role="status">Writing AI explanations…</p>}
              <ol className="ta-lab-review">
                {roundQs.map((q) => {
                  const sel = answers[q.id] ?? null
                  const exp = roundResult.explanations?.[String(q.id)]
                  const key = q.correct_index ?? -1
                  const ok = sel !== null && sel === key
                  return (
                    <li key={q.id} className={`ta-lab-review__item is-${sel === null ? 'unanswered' : ok ? 'correct' : 'wrong'}`}>
                      <p className="ta-lab-qtext">{q.text}</p>
                      <p>
                        Yours: <strong>{sel === null ? '—' : LETTERS[sel]}</strong> · Correct:{' '}
                        <strong>{key >= 0 ? LETTERS[key] : '…'}</strong>{' '}
                        <span className={`ta-lab-verdict is-${sel === null ? 'unanswered' : ok ? 'correct' : 'wrong'}`}>
                          {sel === null ? 'Unanswered' : ok ? 'Correct' : 'Wrong'}
                        </span>
                      </p>
                      {exp ? (
                        <p className="ta-lab-explain">
                          {exp.text} <small>({exp.ai ? 'AI' : 'stored'} explanation)</small>
                        </p>
                      ) : (
                        <p className="ta-lab-explain" aria-hidden="true" />
                      )}
                    </li>
                  )
                })}
              </ol>
              {isLastRound ? (
                <button
                  type="button"
                  className="ta-btn ta-btn--gold"
                  disabled={submitting}
                  onClick={finalSubmit}
                >
                  {submitting ? 'Submitting…' : 'See final result (X/100)'}
                </button>
              ) : (
                <button type="button" className="ta-btn ta-btn--gold" onClick={nextRound}>
                  Next: 5 more questions
                </button>
              )}
            </section>
          )}
        </div>

        <aside className="ta-lab-nav" aria-label="Round navigator">
          <h2>
            Round {round + 1}/{ROUNDS_TOTAL}
          </h2>
          <div className="ta-lab-grid">
            {roundQs.map((q, i) => {
              const done = answers[q.id] !== undefined && answers[q.id] !== null
              return (
                <button
                  key={q.id}
                  type="button"
                  className={done ? 'is-done' : ''}
                  aria-label={`Question ${round * 5 + i + 1}: ${done ? 'answered' : 'unanswered'}`}
                  onClick={() => document.getElementById(`lab-q-${q.id}`)?.scrollIntoView({ block: 'start' })}
                >
                  {round * 5 + i + 1}
                </button>
              )
            })}
          </div>
          <p className="ta-lab-legend">{answeredTotal}/100 answered overall</p>
        </aside>
      </div>

      {phase === 'confirm' && (
        <div className="ta-lab-modal" role="dialog" aria-modal="true" aria-labelledby="lab-confirm-title">
          <div className="ta-lab-modal__box">
            <h2 id="lab-confirm-title">Submit these 5?</h2>
            <p>
              {5 - unansweredRound.length}/5 answered.
              {unansweredRound.length > 0
                ? ` ${unansweredRound.length} unanswered will count as wrong.`
                : ' All answered.'}
            </p>
            <div className="ta-lab-modal__actions">
              <button type="button" className="ta-btn ta-btn--outline" onClick={() => setPhase('answer')}>
                Keep answering
              </button>
              <button
                type="button"
                className="ta-btn ta-btn--gold"
                disabled={submitting}
                onClick={() => {
                  setPhase('answer')
                  void confirmRound()
                }}
              >
                {submitting ? 'Submitting…' : 'Confirm submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function firstOpenRound(a: AttemptPayload): number {
  const submitted = new Set(a.submitted_rounds ?? [])
  const rounds = [...new Set(a.questions.map((q) => q.round_no))].sort((x, y) => x - y)
  for (const r of rounds) {
    if (!submitted.has(r)) return r
  }
  return rounds.length > 0 ? rounds[rounds.length - 1] : 0
}
