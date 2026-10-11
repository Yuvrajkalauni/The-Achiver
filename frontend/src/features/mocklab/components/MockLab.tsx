import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, labApi } from '../api'
import type { AttemptPayload, HealthState, TestStatus } from '../types'
import ProgressScreen from './ProgressScreen'
import TestScreen from './TestScreen'

type Mode =
  | { name: 'loading' }
  | { name: 'hub' }
  | { name: 'progress'; test: TestStatus }
  | { name: 'test'; attempt: AttemptPayload }

const ATTEMPT_KEY = 'mocklab_attempt'

function errText(e: unknown): { message: string; fix: string } {
  if (e instanceof ApiError) return { message: e.message, fix: e.fix }
  return { message: 'Something went wrong.', fix: '' }
}

export default function MockLab() {
  const [mode, setMode] = useState<Mode>({ name: 'loading' })
  const [health, setHealth] = useState<HealthState | null>(null)
  const [latest, setLatest] = useState<(TestStatus & { created_at?: string }) | null>(null)
  const [minutes, setMinutes] = useState(100)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ message: string; fix: string } | null>(null)
  const navigate = useNavigate()

  const params = new URLSearchParams(window.location.search)
  const attemptParam = params.get('attemptId')

  useEffect(() => {
    let cancelled = false
    async function boot() {
      try {
        const [h, l] = await Promise.all([labApi.health().catch(() => null), labApi.latest()])
        if (cancelled) return
        setHealth(h)
        setLatest(l.test)
        const stored = attemptParam ?? window.localStorage.getItem(ATTEMPT_KEY)
        if (stored) {
          try {
            const attempt = await labApi.attempt(Number(stored))
            if (cancelled) return
            if (attempt.status === 'in_progress') {
              setMode({ name: 'test', attempt })
              return
            }
            window.localStorage.removeItem(ATTEMPT_KEY)
          } catch {
            window.localStorage.removeItem(ATTEMPT_KEY)
          }
        }
        const fresh = (await labApi.latest().catch(() => ({ test: null }))).test
        if (cancelled) return
        setLatest(fresh)
        if (fresh && (fresh.status === 'generating' || fresh.status === 'queued')) {
          setMode({ name: 'progress', test: fresh })
        } else {
          setMode({ name: 'hub' })
        }
      } catch (e) {
        if (!cancelled) {
          setError(errText(e))
          setMode({ name: 'hub' })
        }
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function generate() {
    setBusy(true)
    setError(null)
    try {
      const { testId } = await labApi.generate()
      const test = await labApi.status(testId)
      setLatest(test)
      setMode({ name: 'progress', test })
    } catch (e) {
      setError(errText(e))
    } finally {
      setBusy(false)
    }
  }

  async function start(testId: number) {
    setBusy(true)
    setError(null)
    try {
      const { attemptId } = await labApi.startAttempt(testId, minutes)
      window.localStorage.setItem(ATTEMPT_KEY, String(attemptId))
      const attempt = await labApi.attempt(attemptId)
      navigate(`/mock-test?attemptId=${attemptId}`, { replace: true })
      setMode({ name: 'test', attempt })
    } catch (e) {
      setError(errText(e))
    } finally {
      setBusy(false)
    }
  }

  function submitted(attemptId: number) {
    window.localStorage.removeItem(ATTEMPT_KEY)
    navigate(`/mock-test/result/${attemptId}`)
  }

  if (mode.name === 'loading') {
    return (
      <main className="ta-page">
        <section className="ta-page__hero">
          <div className="ta-page__wrap">
            <p className="ta-page__kicker">Mock Test · AI Lab</p>
            <h1>Loading…</h1>
          </div>
        </section>
      </main>
    )
  }

  if (mode.name === 'progress') {
    return (
      <ProgressScreen
        test={mode.test}
        onReady={(test) => setMode({ name: 'progress', test })}
        onStart={() => start(mode.test.testId)}
        onFailed={() => setMode({ name: 'hub' })}
      />
    )
  }

  if (mode.name === 'test') {
    return <TestScreen initial={mode.attempt} onSubmitted={submitted} />
  }

  return (
    <main className="ta-page">
      <section className="ta-page__hero">
        <div className="ta-page__wrap">
          <p className="ta-page__kicker">Mock Test · AI Lab</p>
          <h1>AI MCQ Test Lab</h1>
          <p className="ta-page__lead">
            100 questions — 25 each of Mathematics, Physics, Chemistry and English — written
            live by a local AI, then marked with AI feedback.
          </p>
        </div>
      </section>
      <div className="ta-page__wrap ta-page__body">
        {health && !health.ok && (
          <p className="ta-notice" role="alert">
            {health.message} Fix: run <code>ollama serve</code> then{' '}
            <code>ollama pull qwen2.5:3b</code>.
          </p>
        )}
        {error && (
          <p className="ta-notice" role="alert">
            {error.message} {error.fix}
          </p>
        )}
        <div className="ta-cards">
          <div className="ta-card">
            <span className="ta-badge">100 questions</span>
            <h2>Take a full test</h2>
            <p>Timed, autosaved, instant deterministic marking plus AI explanations.</p>
            <label className="ta-lab-field">
              Timer (minutes)
              <input
                type="number"
                min={5}
                max={300}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
              />
            </label>
            {latest?.status === 'ready' ? (
              <button type="button" className="ta-btn ta-btn--gold" disabled={busy} onClick={() => start(latest.testId)}>
                {busy ? 'Starting…' : 'Start test'}
              </button>
            ) : (
              <button type="button" className="ta-btn ta-btn--gold" disabled={busy} onClick={generate}>
                {busy ? 'Starting…' : 'Generate 100 questions'}
              </button>
            )}
          </div>
          <div className="ta-card">
            <span className="ta-badge">Fresh set</span>
            <h2>New AI test</h2>
            <p>Generate a brand-new set of 100 questions (avoids earlier tests). Takes a few minutes.</p>
            <button type="button" className="ta-btn ta-btn--outline" disabled={busy} onClick={generate}>
              {busy ? 'Starting…' : 'Generate new set'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
