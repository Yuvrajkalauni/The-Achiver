import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, labApi } from '../api'
import { SUBJECTS, type AttemptPayload, type LabQuestion } from '../types'

const LETTERS = ['A', 'B', 'C', 'D'] as const

function fmt(s: number): string {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export default function TestScreen({
  initial,
  onSubmitted,
}: {
  initial: AttemptPayload
  onSubmitted: (attemptId: number) => void
}) {
  const [questions] = useState<LabQuestion[]>(initial.questions)
  const [answers, setAnswers] = useState<Record<number, number | null>>(() => {
    const map: Record<number, number | null> = {}
    for (const [k, v] of Object.entries(initial.answers)) map[Number(k)] = v
    return map
  })
  const [subject, setSubject] = useState<string>(SUBJECTS[0])
  const [currentId, setCurrentId] = useState<number>(initial.questions[0]?.id ?? 0)
  const [remaining, setRemaining] = useState<number>(initial.remaining_s)
  const [saving, setSaving] = useState<number | null>(null)
  const [saveError, setSaveError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submittedRef = useRef(false)

  const bySubject = useMemo(() => {
    const map = new Map<string, LabQuestion[]>()
    for (const s of SUBJECTS) map.set(s, [])
    for (const q of questions) map.get(q.subject)?.push(q)
    return map
  }, [questions])

  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== null).length,
    [questions, answers],
  )
  const unanswered = useMemo(
    () => questions.filter((q) => answers[q.id] === undefined || answers[q.id] === null),
    [questions, answers],
  )

  async function submit() {
    if (submittedRef.current || submitting) return
    submittedRef.current = true
    setSubmitting(true)
    try {
      await labApi.submit(initial.attemptId)
      onSubmitted(initial.attemptId)
    } catch (e) {
      submittedRef.current = false
      setSubmitting(false)
      setSaveError(e instanceof ApiError ? e.message : 'Submit failed. Try again.')
    }
  }

  useEffect(() => {
    if (remaining <= 0) {
      void submit()
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
      await labApi.saveAnswer(initial.attemptId, qid, value)
    } catch (e) {
      setAnswers((a) => ({ ...a, [qid]: prev }))
      if (e instanceof ApiError && e.status === 409) {
        void submit() // expired server-side: fall into submit flow
      } else {
        setSaveError(e instanceof ApiError ? e.message : 'Could not save. Check connection.')
      }
    } finally {
      setSaving(null)
    }
  }

  function jump(qid: number, subj: string) {
    setSubject(subj)
    setCurrentId(qid)
    document.getElementById(`lab-q-${qid}`)?.scrollIntoView({ block: 'start' })
    document.getElementById(`lab-q-${qid}-legend`)?.focus()
  }

  const list = bySubject.get(subject) ?? []

  return (
    <main className="ta-page ta-lab">
      <div className="ta-lab-topbar">
        <div className="ta-lab-topbar__inner">
          <strong>
            {answeredCount}/{questions.length} answered
          </strong>
          <span className={`ta-lab-timer${remaining < 300 ? ' is-low' : ''}`} role="timer" aria-label="Time remaining">
            {fmt(remaining)}
          </span>
          <span className="ta-lab-save" aria-live="polite">
            {saving !== null ? 'Saving…' : saveError ? 'Save error' : 'Saved'}
          </span>
          <button type="button" className="ta-btn ta-btn--gold ta-lab-submit" onClick={() => setConfirming(true)}>
            Submit
          </button>
        </div>
      </div>
      {saveError && (
        <p className="ta-notice" role="alert">
          {saveError}
        </p>
      )}

      <div className="ta-lab-layout">
        <div className="ta-lab-main">
          <div className="ta-lab-tabs" role="tablist" aria-label="Subjects">
            {SUBJECTS.map((s) => {
              const qs = bySubject.get(s) ?? []
              const done = qs.filter((q) => answers[q.id] !== undefined && answers[q.id] !== null).length
              return (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={subject === s}
                  className={subject === s ? 'is-active' : ''}
                  onClick={() => {
                    setSubject(s)
                    const first = (bySubject.get(s) ?? []).find(
                      (q) => answers[q.id] === undefined || answers[q.id] === null,
                    )
                    setCurrentId((first ?? (bySubject.get(s) ?? [])[0])?.id ?? 0)
                  }}
                >
                  {s} ({done}/{qs.length})
                </button>
              )
            })}
          </div>

          {list.map((q) => (
            <fieldset key={q.id} id={`lab-q-${q.id}`} className="ta-lab-q">
              <legend id={`lab-q-${q.id}-legend`} tabIndex={-1}>
                Q{indexOfQuestion(questions, q.id) + 1}. {q.text}
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
        </div>

        <aside className="ta-lab-nav" aria-label="Question navigator">
          <h2>Navigator</h2>
          <div className="ta-lab-grid">
            {(bySubject.get(subject) ?? []).map((q) => {
              const st =
                q.id === currentId ? 'is-current' : answers[q.id] !== undefined && answers[q.id] !== null ? 'is-done' : ''
              return (
                <button
                  key={q.id}
                  type="button"
                  className={st}
                  aria-label={`Question ${indexOfQuestion(questions, q.id) + 1}: ${st === 'is-done' ? 'answered' : st === 'is-current' ? 'current' : 'unanswered'}`}
                  onClick={() => jump(q.id, subject)}
                >
                  {indexOfQuestion(questions, q.id) + 1}
                </button>
              )
            })}
          </div>
          <ul className="ta-lab-legend" aria-hidden="true">
            <li><span className="is-done" /> answered</li>
            <li><span /> unanswered</li>
            <li><span className="is-current" /> current</li>
          </ul>
        </aside>
      </div>

      {confirming && (
        <div className="ta-lab-modal" role="dialog" aria-modal="true" aria-labelledby="lab-confirm-title">
          <div className="ta-lab-modal__box">
            <h2 id="lab-confirm-title">Submit test?</h2>
            <p>
              {answeredCount}/{questions.length} answered.
              {unanswered.length > 0 ? ` ${unanswered.length} unanswered:` : ' All questions answered.'}
            </p>
            {unanswered.length > 0 && (
              <ol className="ta-lab-unanswered">
                {unanswered.map((q) => (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirming(false)
                        jump(q.id, q.subject)
                      }}
                    >
                      Q{indexOfQuestion(questions, q.id) + 1} — {q.subject}
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <div className="ta-lab-modal__actions">
              <button type="button" className="ta-btn ta-btn--outline" onClick={() => setConfirming(false)}>
                Keep answering
              </button>
              <button
                type="button"
                className="ta-btn ta-btn--gold"
                disabled={submitting}
                onClick={() => {
                  setConfirming(false)
                  void submit()
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

function indexOfQuestion(questions: { id: number }[], id: number): number {
  return questions.findIndex((q) => q.id === id)
}
