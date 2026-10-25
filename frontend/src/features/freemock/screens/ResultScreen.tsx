import { useMemo, useState } from 'react'
import type { OptionCode, ResultPayload } from '../types'
import { SUBJECT_LABELS } from '../types'

type Filter = 'all' | 'correct' | 'incorrect' | 'unanswered'

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All questions' },
  { key: 'correct', label: 'Correct' },
  { key: 'incorrect', label: 'Incorrect' },
  { key: 'unanswered', label: 'Unanswered' },
]

function formatStamp(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const LETTERS: OptionCode[] = ['A', 'B', 'C', 'D']

/** PRD Screen E — score, subject breakdown and full answer review. */
export default function ResultScreen({
  result,
  onRetake,
  onHome,
}: {
  result: ResultPayload
  onRetake: () => void
  onHome: () => void
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const { attempt, summary_by_subject: summary, review } = result

  const counts = useMemo(() => {
    const correct = review.filter((item) => item.state === 'correct').length
    const incorrect = review.filter((item) => item.state === 'incorrect').length
    const unanswered = review.filter((item) => item.state === 'unanswered').length
    return { correct, incorrect, unanswered }
  }, [review])

  const visible = review.filter((item) => filter === 'all' || item.state === filter)
  const autoSubmitted = attempt.submission_reason === 'TIME_EXPIRED'
  const percent = attempt.score != null ? Math.round((attempt.score / attempt.total_marks) * 100) : 0

  const verdict =
    percent >= 80
      ? 'Excellent — you are well prepared.'
      : percent >= 60
        ? 'Good attempt — a little more practice will sharpen it.'
        : percent >= 40
          ? 'A reasonable start — focus on the weak subjects below.'
          : 'Keep practising — review every answer and try again.'

  return (
    <section className="fm-result" aria-labelledby="fm-result-title">
      <header className="fm-result__hero">
        <p className="fm-eyebrow">
          {autoSubmitted ? 'Auto-submitted — time expired' : 'Submitted successfully'}
        </p>
        <h1 id="fm-result-title" className="fm-result__title">
          Your result
        </h1>

        <div className="fm-score">
          <span className="fm-score__value">{attempt.score ?? 0}</span>
          <span className="fm-score__total">/ {attempt.total_marks}</span>
        </div>
        <p className="fm-verdict">{verdict}</p>

        <ul className="fm-facts fm-facts--inline">
          <li>
            <span className="fm-facts__value">{counts.correct}</span>
            <span className="fm-facts__label">Correct</span>
          </li>
          <li>
            <span className="fm-facts__value">{attempt.answered_questions}</span>
            <span className="fm-facts__label">Answered</span>
          </li>
          <li>
            <span className="fm-facts__value">{counts.unanswered}</span>
            <span className="fm-facts__label">Skipped</span>
          </li>
          <li>
            <span className="fm-facts__value">{percent}%</span>
            <span className="fm-facts__label">Score</span>
          </li>
        </ul>

        <p className="fm-result__meta">
          Status: <strong>{attempt.status === 'EXPIRED' ? 'Expired' : 'Submitted'}</strong> ·{' '}
          {formatStamp(attempt.submitted_at)}
        </p>
      </header>

      <div className="fm-panel">
        <h2>Subject-wise performance</h2>
        <table className="fm-table">
          <caption className="fm-sr-only">Marks by subject</caption>
          <thead>
            <tr>
              <th scope="col">Subject</th>
              <th scope="col">Correct</th>
              <th scope="col">Total</th>
              <th scope="col">Marks</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((row) => (
              <tr key={row.subject}>
                <th scope="row">{SUBJECT_LABELS[row.subject]}</th>
                <td>{row.correct}</td>
                <td>{row.total}</td>
                <td>
                  {row.marks} / {row.total * 5}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="fm-hint">
          Subject totals add up to your overall score: {summary.reduce((sum, row) => sum + row.marks, 0)}{' '}
          marks.
        </p>
      </div>

      <section className="fm-review" aria-labelledby="fm-review-heading">
        <div className="fm-review__head">
          <h2 id="fm-review-heading">Detailed review</h2>
          <div className="fm-filters" role="group" aria-label="Filter review">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`fm-chip fm-chip--filter ${filter === item.key ? 'is-active' : ''}`}
                onClick={() => setFilter(item.key)}
                aria-pressed={filter === item.key}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="fm-empty">No questions match this filter.</p>
        ) : (
          <ol className="fm-review__list">
            {visible.map((item) => (
              <li key={item.question_id} className={`fm-card fm-card--${item.state}`}>
                <div className="fm-card__head">
                  <span className="fm-card__seq">Q{item.sequence_no}</span>
                  <span className="fm-chip fm-chip--subject">{SUBJECT_LABELS[item.subject]}</span>
                  <span className={`fm-badge fm-badge--${item.state}`}>
                    {item.state === 'correct'
                      ? `Correct +${item.marks_awarded}`
                      : item.state === 'incorrect'
                        ? 'Incorrect · 0'
                        : 'Unanswered · 0'}
                  </span>
                </div>

                <p className="fm-card__question">{item.question_text}</p>

                <ul className="fm-card__options">
                  {LETTERS.map((code) => {
                    const isCorrect = code === item.correct_option
                    const isSelected = code === item.selected_option
                    const state = isCorrect ? 'correct' : isSelected ? 'wrong' : 'plain'
                    return (
                      <li key={code} className={`fm-card__option is-${state}`}>
                        <span className="fm-option__key" aria-hidden="true">
                          {code}
                        </span>
                        <span>{item.options[code]}</span>
                        <span className="fm-card__tag">
                          {isCorrect ? 'Correct answer' : isSelected ? 'Your answer' : ''}
                        </span>
                      </li>
                    )
                  })}
                </ul>

                {item.explanation && (
                  <details className="fm-card__explain">
                    <summary>Why?</summary>
                    <p>{item.explanation}</p>
                  </details>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="fm-actions">
        <button type="button" className="fm-btn fm-btn--ghost" onClick={onHome}>
          Back to Home
        </button>
        <button type="button" className="fm-btn fm-btn--primary" onClick={onRetake}>
          Take Another Test
        </button>
      </div>
    </section>
  )
}
