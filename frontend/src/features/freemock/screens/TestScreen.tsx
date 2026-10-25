import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, fmApi } from '../api'
import type { AnswerInput, AttemptMeta, ExamQuestion, OptionCode, ResultPayload, Subject } from '../types'
import { SUBJECTS, SUBJECT_LABELS } from '../types'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const OPTION_CODES: OptionCode[] = ['A', 'B', 'C', 'D']
const SAVE_DEBOUNCE_MS = 700
const RETRY_MS = 2500
const MAX_RETRIES = 10

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000)
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

/** PRD Screen C (live exam) + Screen D (review & submit). */
export default function TestScreen({
  attempt,
  questions,
  onSubmitted,
}: {
  attempt: AttemptMeta
  questions: ExamQuestion[]
  onSubmitted: (payload: ResultPayload) => void
}) {
  const [answers, setAnswers] = useState<Record<string, OptionCode | null>>(() => {
    const initial: Record<string, OptionCode | null> = {}
    for (const question of questions) initial[question.id] = question.selected_option ?? null
    return initial
  })
  const [index, setIndex] = useState(0)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [showReview, setShowReview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const serverOffset = useMemo(
    () => Date.parse(attempt.server_time) - Date.now(),
    [attempt.server_time],
  )
  const expiresAt = useMemo(() => Date.parse(attempt.expires_at), [attempt.expires_at])
  const remaining = Math.max(0, expiresAt - (now + serverOffset))
  const expired = remaining === 0

  const answersRef = useRef(answers)
  answersRef.current = answers
  const pendingRef = useRef<Set<string>>(new Set())
  const debounceRef = useRef<number | null>(null)
  const retryRef = useRef<number>(0)
  const finalizedRef = useRef(false)
  const retrySubmitRef = useRef<number | null>(null)

  const current = questions[Math.min(index, questions.length - 1)]
  const answeredCount = questions.filter((q) => answers[q.id] != null).length
  const unanswered = questions.filter((q) => answers[q.id] == null)

  const bySubject = useMemo(() => {
    const groups: Array<{ subject: Subject; items: ExamQuestion[] }> = SUBJECTS.map((subject) => ({
      subject,
      items: [],
    }))
    for (const question of questions) {
      const group = groups.find((g) => g.subject === question.subject)
      group?.items.push(question)
    }
    return groups
  }, [questions])

  const answeredInSubject = useCallback(
    (items: ExamQuestion[]) => items.filter((q) => answers[q.id] != null).length,
    [answers],
  )

  // ---- timer tick (display only; the server owns the deadline) ----
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(timer)
  }, [])

  // ---- autosave ----
  const flushSave = useCallback(async () => {
    const ids = [...pendingRef.current]
    if (!ids.length || finalizedRef.current) return
    pendingRef.current.clear()
    const payload: AnswerInput[] = ids.map((id) => ({
      question_id: id,
      selected_option: answersRef.current[id] ?? null,
    }))
    setSaveState('saving')
    try {
      await fmApi.saveAnswers(attempt.id, payload)
      retryRef.current = 0
      setSaveState('saved')
    } catch (e) {
      if (e instanceof ApiError && e.code === 'ATTEMPT_EXPIRED') {
        void submitRef.current?.(true)
        return
      }
      // keep the change queued and retry automatically (PRD §10.3)
      for (const id of ids) pendingRef.current.add(id)
      setSaveState('error')
      if (retryRef.current < MAX_RETRIES) {
        retryRef.current += 1
        window.setTimeout(() => void flushSave(), RETRY_MS)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt.id])

  const scheduleSave = useCallback(
    (questionId: string) => {
      pendingRef.current.add(questionId)
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      debounceRef.current = window.setTimeout(() => void flushSave(), SAVE_DEBOUNCE_MS)
    },
    [flushSave],
  )

  // ---- submission ----
  const submit = useCallback(
    async (auto: boolean) => {
      if (finalizedRef.current) return
      finalizedRef.current = true
      setSubmitting(true)
      setShowReview(false)
      setError(null)
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      const payload: AnswerInput[] = questions.map((q) => ({
        question_id: q.id,
        selected_option: answersRef.current[q.id] ?? null,
      }))
      try {
        const result = await fmApi.submit(attempt.id, payload)
        onSubmitted(result)
      } catch (e) {
        // idempotent server: a retry returns the same finalized result
        finalizedRef.current = false
        setSubmitting(false)
        const message = e instanceof ApiError ? e.message : 'Submission failed. Retrying…'
        setError(message)
        if (auto) {
          retrySubmitRef.current = window.setTimeout(() => void submit(true), 2000)
        }
      }
    },
    [attempt.id, onSubmitted, questions],
  )

  // always call the newest submit implementation (avoids stale closures)
  const submitRef = useRef(submit)
  submitRef.current = submit

  // auto-submit when the countdown reaches zero (PRD FR-005)
  useEffect(() => {
    if (expired && !finalizedRef.current) void submitRef.current?.(true)
  }, [expired])

  useEffect(
    () => () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
      if (retrySubmitRef.current) window.clearTimeout(retrySubmitRef.current)
    },
    [],
  )

  // ---- answer interactions ----
  const selectOption = (option: OptionCode) => {
    if (expired || submitting) return
    setAnswers((prev) => ({ ...prev, [current.id]: option }))
    scheduleSave(current.id)
  }

  const clearAnswer = () => {
    if (expired || submitting) return
    setAnswers((prev) => ({ ...prev, [current.id]: null }))
    scheduleSave(current.id)
  }

  const goTo = (next: number) => {
    if (next < 0 || next >= questions.length) return
    setIndex(next)
  }

  // ---- timer warnings (PRD §7.4) ----
  const warning =
    remaining === 0
      ? 'Time is up — submitting your test…'
      : remaining <= 60_000
        ? '1 minute remaining — submit now.'
        : remaining <= 300_000
          ? '5 minutes remaining — review unanswered questions.'
          : remaining <= 600_000
            ? '10 minutes remaining.'
            : null

  const saveLabel: Record<SaveState, string> = {
    idle: 'Ready',
    saving: 'Saving…',
    saved: 'Saved',
    error: 'Not saved — retrying',
  }

  return (
    <div className="fm-exam">
      <header className="fm-exam__top">
        <div className="fm-exam__top-inner">
          <span className="fm-brand fm-brand--exam">
            <span className="fm-brand__mark" aria-hidden="true">
              FM
            </span>
            Free Mock Test
          </span>

          <span
            className={`fm-save fm-save--${saveState}`}
            role="status"
            aria-live="polite"
            title={saveState === 'error' ? 'We keep retrying automatically' : undefined}
          >
            <span className="fm-save__dot" aria-hidden="true" />
            {saveLabel[saveState]}
          </span>

          <div className="fm-timer" aria-label="Time remaining">
            <span className="fm-timer__label">Time left</span>
            <span
              className={`fm-timer__value ${
                remaining <= 60_000 ? 'is-critical' : remaining <= 300_000 ? 'is-warn' : ''
              }`}
            >
              {formatClock(remaining)}
            </span>
          </div>
        </div>
      </header>

      <div className="fm-exam__warnzone" role="status" aria-live="polite">
        {warning && (
          <p className={`fm-banner ${remaining <= 60_000 ? 'fm-banner--critical' : 'fm-banner--warn'}`}>
            {warning}
          </p>
        )}
        {error && <p className="fm-banner fm-banner--error">{error}</p>}
      </div>

      <nav className="fm-tabs" aria-label="Subjects">
        {bySubject.map((group) => {
          const done = answeredInSubject(group.items)
          const active = current.subject === group.subject
          const firstIndex = questions.findIndex((q) => q.id === group.items[0]?.id)
          return (
            <button
              key={group.subject}
              type="button"
              className={`fm-tab ${active ? 'is-active' : ''} ${done === group.items.length ? 'is-done' : ''}`}
              onClick={() => goTo(firstIndex)}
              aria-current={active ? 'true' : undefined}
            >
              <span className="fm-tab__name">{SUBJECT_LABELS[group.subject]}</span>
              <span className="fm-tab__progress">
                {done}/{group.items.length}
                {done < group.items.length && <span className="fm-sr-only"> answered, more remaining</span>}
              </span>
            </button>
          )
        })}
      </nav>

      <div className="fm-exam__body">
        <aside className="fm-palette" aria-label="Question palette">
          <p className="fm-palette__title">Questions</p>
          {bySubject.map((group) => (
            <div key={group.subject} className="fm-palette__group">
              <p className="fm-palette__subject">{SUBJECT_LABELS[group.subject]}</p>
              <div className="fm-palette__grid">
                {group.items.map((question) => {
                  const position = questions.findIndex((q) => q.id === question.id)
                  const answered = answers[question.id] != null
                  const isCurrent = position === index
                  return (
                    <button
                      key={question.id}
                      type="button"
                      className={`fm-palette__btn ${isCurrent ? 'is-current' : ''} ${
                        answered ? 'is-answered' : 'is-unanswered'
                      }`}
                      onClick={() => goTo(position)}
                      aria-label={`Question ${question.sequence_no}, ${
                        answered ? 'answered' : 'not answered'
                      }${isCurrent ? ', current' : ''}`}
                      aria-current={isCurrent ? 'true' : undefined}
                    >
                      {question.sequence_no}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          <ul className="fm-legend">
            <li>
              <span className="fm-legend__swatch is-current" aria-hidden="true" /> Current
            </li>
            <li>
              <span className="fm-legend__swatch is-answered" aria-hidden="true" /> Answered
            </li>
            <li>
              <span className="fm-legend__swatch is-unanswered" aria-hidden="true" /> Unanswered
            </li>
          </ul>
        </aside>

        <main className="fm-question" aria-label={`Question ${current.sequence_no} of ${questions.length}`}>
          <div className="fm-question__meta">
            <span className="fm-question__count">
              Question {current.sequence_no} of {questions.length}
            </span>
            <span className="fm-chip fm-chip--subject">{SUBJECT_LABELS[current.subject]}</span>
          </div>

          <h1 className="fm-question__text">{current.question_text}</h1>

          <fieldset className="fm-options" disabled={expired || submitting}>
            <legend className="fm-sr-only">Select one answer</legend>
            {OPTION_CODES.map((code) => {
              const text = current.options[code]
              const selected = answers[current.id] === code
              return (
                <label key={code} className={`fm-option ${selected ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name={`question-${current.id}`}
                    value={code}
                    checked={selected}
                    onChange={() => selectOption(code)}
                  />
                  <span className="fm-option__key" aria-hidden="true">
                    {code}
                  </span>
                  <span className="fm-option__text">{text}</span>
                </label>
              )
            })}
          </fieldset>

          <div className="fm-question__actions">
            <button
              type="button"
              className="fm-btn fm-btn--ghost"
              onClick={clearAnswer}
              disabled={answers[current.id] == null || expired || submitting}
            >
              Clear answer
            </button>
            <div className="fm-question__nav">
              <button
                type="button"
                className="fm-btn fm-btn--ghost"
                onClick={() => goTo(index - 1)}
                disabled={index === 0}
              >
                ← Previous
              </button>
              <button
                type="button"
                className="fm-btn fm-btn--outline"
                onClick={() => goTo(index + 1)}
                disabled={index === questions.length - 1}
              >
                Next →
              </button>
            </div>
          </div>
        </main>
      </div>

      <footer className="fm-exam__footer">
        <p className="fm-exam__count">
          <strong>{answeredCount}</strong> of {questions.length} answered
          {unanswered.length > 0 && (
            <span className="fm-exam__count-note"> · {unanswered.length} remaining</span>
          )}
        </p>
        <button
          type="button"
          className="fm-btn fm-btn--primary"
          onClick={() => setShowReview(true)}
          disabled={submitting}
        >
          Review &amp; Submit
        </button>
      </footer>

      {showReview && (
        <ReviewDialog
          questions={questions}
          answers={answers}
          submitting={submitting}
          onCancel={() => setShowReview(false)}
          onSubmit={() => void submit(false)}
        />
      )}
    </div>
  )
}

/** PRD Screen D — review counts, unanswered list and final confirmation. */
function ReviewDialog({
  questions,
  answers,
  submitting,
  onCancel,
  onSubmit,
}: {
  questions: ExamQuestion[]
  answers: Record<string, OptionCode | null>
  submitting: boolean
  onCancel: () => void
  onSubmit: () => void
}) {
  const unanswered = questions.filter((q) => answers[q.id] == null)
  const answered = questions.length - unanswered.length
  const ref = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    ref.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, submitting])

  const subjectRows = SUBJECTS.map((subject) => {
    const items = questions.filter((q) => q.subject === subject)
    return {
      subject,
      total: items.length,
      answered: items.filter((q) => answers[q.id] != null).length,
    }
  })

  return (
    <div className="fm-modal" role="dialog" aria-modal="true" aria-labelledby="fm-review-title">
      <div className="fm-modal__card">
        <h2 id="fm-review-title">Review &amp; submit</h2>

        <div className="fm-review__counts">
          <div>
            <span className="fm-review__value">{answered}</span>
            <span className="fm-review__label">Answered</span>
          </div>
          <div>
            <span className="fm-review__value">{unanswered.length}</span>
            <span className="fm-review__label">Unanswered</span>
          </div>
          <div>
            <span className="fm-review__value">{questions.length}</span>
            <span className="fm-review__label">Total</span>
          </div>
        </div>

        <table className="fm-table fm-table--compact">
          <caption className="fm-sr-only">Completion by subject</caption>
          <thead>
            <tr>
              <th scope="col">Subject</th>
              <th scope="col">Answered</th>
            </tr>
          </thead>
          <tbody>
            {subjectRows.map((row) => (
              <tr key={row.subject}>
                <th scope="row">{SUBJECT_LABELS[row.subject]}</th>
                <td>
                  {row.answered}/{row.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {unanswered.length > 0 ? (
          <div className="fm-review__unanswered">
            <p>
              <strong>{unanswered.length}</strong> unanswered question
              {unanswered.length > 1 ? 's' : ''} — these receive{' '}
              <strong>zero marks</strong>:
            </p>
            <ul>
              {unanswered.map((q) => (
                <li key={q.id}>Q{q.sequence_no}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="fm-review__all-done">All 20 questions answered. Nice work!</p>
        )}

        <p className="fm-review__warning">
          Submission is final. Your score and answer review are generated immediately and cannot be
          changed afterwards.
        </p>

        <div className="fm-actions">
          <button
            type="button"
            className="fm-btn fm-btn--ghost"
            onClick={onCancel}
            disabled={submitting}
          >
            Return to Test
          </button>
          <button
            ref={ref}
            type="button"
            className="fm-btn fm-btn--danger"
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit Test'}
          </button>
        </div>
      </div>
    </div>
  )
}
