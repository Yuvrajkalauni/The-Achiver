import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, fmApi, getOwnerToken, setOwnerToken } from './api'
import LandingScreen from './screens/LandingScreen'
import InstructionsScreen from './screens/InstructionsScreen'
import TestScreen from './screens/TestScreen'
import ResultScreen from './screens/ResultScreen'
import type { AttemptMeta, ExamQuestion, ResultPayload } from './types'
import './freemock.css'

type Screen = 'loading' | 'landing' | 'instructions' | 'test' | 'result'

/**
 * App shell for /mock-test/free (PRD Screens A–E).
 * No site navbar/footer: this is a focused, distraction-reduced exam surface.
 */
export default function FreeMockApp() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [attempt, setAttempt] = useState<AttemptMeta | null>(null)
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [result, setResult] = useState<ResultPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const resume = useCallback(async () => {
    try {
      if (getOwnerToken()) {
        const active = await fmApi.active()
        if (active.attempt && active.questions.length) {
          setAttempt(active.attempt)
          setQuestions(active.questions)
          setScreen('landing') // FR-019: offer "Resume Test" on the landing page
          return
        }
        if (active.requires_result && active.attempt) {
          const payload = await fmApi.result(active.attempt.id)
          setResult(payload)
          setScreen('result')
          return
        }
      }
      setScreen('landing')
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'We could not reach the test service. Please try again.',
      )
      setScreen('landing')
    }
  }, [])

  useEffect(() => {
    void resume()
  }, [resume])

  const beginTest = async () => {
    setBusy(true)
    setError(null)
    try {
      const started = await fmApi.start()
      setOwnerToken(started.owner_token)
      setAttempt(started.attempt)
      setQuestions(started.questions)
      setScreen('test')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start the test. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleSubmitted = (payload: ResultPayload) => {
    setResult(payload)
    setAttempt(payload.attempt)
    setQuestions([])
    setScreen('result')
  }

  const takeAnother = () => {
    setResult(null)
    setAttempt(null)
    setScreen('instructions')
  }

  const goHome = () => {
    setResult(null)
    setAttempt(null)
    setQuestions([])
    setScreen('landing')
  }

  if (screen === 'loading') {
    return (
      <div className="fm-boot" role="status" aria-live="polite">
        <span className="fm-spinner" aria-hidden="true" />
        Preparing your test…
      </div>
    )
  }

  // Exam screen renders its own full-bleed header (PRD Screen C).
  if (screen === 'test' && attempt && questions.length > 0) {
    return (
      <TestScreen attempt={attempt} questions={questions} onSubmitted={handleSubmitted} />
    )
  }

  return (
    <div className="fm-app">
      <header className="fm-topbar">
        <div className="fm-topbar__inner">
          <span className="fm-brand">
            <span className="fm-brand__mark" aria-hidden="true">
              FM
            </span>
            Free Mock Test
          </span>
          <nav className="fm-topbar__nav" aria-label="Test">
            <a href="#help">Help</a>
            <Link to="/mock-test/admin">Admin</Link>
            <Link to="/mock-test" className="fm-topbar__exit">
              ← Back to site
            </Link>
          </nav>
        </div>
      </header>

      <main className="fm-main">
        {error && (
          <div className="fm-banner fm-banner--error" role="alert">
            <strong>Heads up:</strong> {error}{' '}
            <button type="button" onClick={() => void resume()}>
              Retry
            </button>
          </div>
        )}

        {screen === 'landing' && (
          <LandingScreen
            resumable={Boolean(attempt && questions.length)}
            onStart={() => setScreen('instructions')}
            onResume={() => setScreen('test')}
          />
        )}

        {screen === 'instructions' && (
          <InstructionsScreen busy={busy} onBegin={() => void beginTest()} onBack={() => setScreen('landing')} />
        )}

        {screen === 'result' && result && (
          <ResultScreen result={result} onRetake={takeAnother} onHome={goHome} />
        )}
      </main>

      <footer className="fm-footer">
        <p>
          Free Mock Test · 20 questions · 100 marks · 30 minutes ·{' '}
          <Link to="/mock-test">theachievers mock tests</Link>
        </p>
      </footer>
    </div>
  )
}
