import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, fmApi } from '../api'
import type { AdminOverview, AdminQuestion, Subject, UploadRecord } from '../types'
import { SUBJECTS, SUBJECT_LABELS } from '../types'

/** PRD Screen F — administrator login, inventory, CSV import and history. */
export default function AdminScreen() {
  const [authed, setAuthed] = useState(() => fmApi.adminHasToken())
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [uploads, setUploads] = useState<UploadRecord[]>([])
  const [questions, setQuestions] = useState<AdminQuestion[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [subjectFilter, setSubjectFilter] = useState('')
  const [search, setSearch] = useState('')

  const [file, setFile] = useState<File | null>(null)
  // keep the latest search term available to the load effect without
  // re-running it on every keystroke
  const searchRef = useRef(search)
  searchRef.current = search
  const [dryRun, setDryRun] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<
    { record: UploadRecord; message?: string } | { record: UploadRecord } | null
  >(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const loadAll = useCallback(async () => {
    try {
      const [summary, history] = await Promise.all([fmApi.adminOverview(), fmApi.adminUploads()])
      setOverview(summary)
      setUploads(history.uploads)
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        setAuthed(false)
      } else {
        setError(e instanceof ApiError ? e.message : 'Could not load the dashboard.')
      }
    }
  }, [])

  const loadQuestions = useCallback(async (nextPage: number, subject: string, term: string) => {
    try {
      const data = await fmApi.adminQuestions({ page: nextPage, subject, search: term })
      setQuestions(data.results)
      setCount(data.count)
    } catch {
      /* dashboard still usable without the inventory list */
    }
  }, [])

  useEffect(() => {
    if (authed) {
      void loadAll()
      void loadQuestions(1, subjectFilter, searchRef.current)
    }
  }, [authed, loadAll, loadQuestions, subjectFilter])

  const login = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await fmApi.adminLogin(username.trim(), password)
      setAuthed(true)
      setPassword('')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Login failed.')
    } finally {
      setBusy(false)
    }
  }

  const logout = () => {
    fmApi.adminLogout()
    setAuthed(false)
    setOverview(null)
    setUploads([])
    setQuestions([])
  }

  const runUpload = async (asDryRun: boolean) => {
    if (!file) return
    setUploading(true)
    setError(null)
    setUploadResult(null)
    try {
      const record = await fmApi.adminUpload(file, asDryRun)
      setUploadResult({
        record,
        message:
          record.status === 'DRY_RUN'
            ? 'Validation passed. No rows were written — review the counts below, then import.'
            : `Imported ${record.created} questions into the bank.`,
      })
      if (record.status === 'COMPLETED') {
        setFile(null)
        if (inputRef.current) inputRef.current.value = ''
      }
      await loadAll()
      await loadQuestions(1, subjectFilter, search)
    } catch (e) {
      if (e instanceof ApiError) {
        // a failed validation returns the partial CsvUpload record as its body
        const record = e.details as unknown as UploadRecord | undefined
        if (record && record.status === 'FAILED') {
          setUploadResult({ record })
        } else {
          setError(e.message)
        }
      } else {
        setError('Upload failed. Please try again.')
      }
    } finally {
      setUploading(false)
    }
  }

  const toggleQuestion = async (id: string) => {
    try {
      const updated = await fmApi.adminToggleQuestion(id)
      setQuestions((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_active: updated.is_active } : item)),
      )
      await loadAll()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update the question.')
    }
  }

  const onSearch = (event: React.FormEvent) => {
    event.preventDefault()
    setPage(1)
    void loadQuestions(1, subjectFilter, search)
  }

  const turnPage = (next: number) => {
    setPage(next)
    void loadQuestions(next, subjectFilter, search)
  }

  if (!authed) {
    return (
      <div className="fm-admin fm-admin--gate">
        <div className="fm-admin__card">
          <p className="fm-eyebrow">Administrator</p>
          <h1>Free Mock Test — admin login</h1>
          <p className="fm-hint">
            Sign in with a staff account to upload questions and monitor the question bank.
          </p>
          {error && (
            <p className="fm-banner fm-banner--error" role="alert">
              {error}
            </p>
          )}
          <form onSubmit={login} className="fm-form">
            <label className="fm-field">
              <span>Username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label className="fm-field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <div className="fm-actions">
              <Link className="fm-btn fm-btn--ghost" to="/mock-test/free">
                ← Back to test
              </Link>
              <button className="fm-btn fm-btn--primary" type="submit" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  const recentUploads = overview?.recent_uploads ?? uploads

  return (
    <div className="fm-admin">
      <header className="fm-topbar">
        <div className="fm-topbar__inner">
          <span className="fm-brand">
            <span className="fm-brand__mark" aria-hidden="true">
              FM
            </span>
            Admin · Question bank
          </span>
          <nav className="fm-topbar__nav" aria-label="Admin">
            <Link to="/mock-test/free">Test site</Link>
            <Link to="/mock-test">Mock tests</Link>
            <button type="button" className="fm-link-btn" onClick={logout}>
              Log out
            </button>
          </nav>
        </div>
      </header>

      <main className="fm-main">
        <p className="fm-eyebrow">Overview</p>
        <h1 className="fm-admin__title">Free Mock Test administration</h1>

        {error && (
          <div className="fm-banner fm-banner--error" role="alert">
            {error} <button type="button" onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {overview && (
          <>
            <ul className="fm-facts">
              <li>
                <span className="fm-facts__value">{overview.totals.active_questions}</span>
                <span className="fm-facts__label">Active questions</span>
              </li>
              <li>
                <span className="fm-facts__value">{overview.totals.inactive_questions}</span>
                <span className="fm-facts__label">Deactivated</span>
              </li>
              <li>
                <span className="fm-facts__value">{overview.totals.attempts}</span>
                <span className="fm-facts__label">Test attempts</span>
              </li>
              <li>
                <span className="fm-facts__value">{overview.totals.completed}</span>
                <span className="fm-facts__label">Completed</span>
              </li>
            </ul>

            <section className="fm-panel" aria-labelledby="fm-inventory-title">
              <h2 id="fm-inventory-title">Active questions by subject</h2>
              {overview.warnings.length > 0 && (
                <div className="fm-banner fm-banner--warn" role="alert">
                  <strong>Insufficient pool:</strong> {overview.warnings.length} subject
                  {overview.warnings.length > 1 ? 's have' : ' has'} fewer than 4 active questions.{' '}
                  {overview.warnings.map((s) => SUBJECT_LABELS[s]).join(', ')} — students will see
                  “question bank incomplete”.
                </div>
              )}
              <ul className="fm-subject-counts">
                {overview.subjects.map((row) => (
                  <li key={row.subject} className={row.minimum_met ? 'is-ok' : 'is-short'}>
                    <span className="fm-subject-counts__name">{SUBJECT_LABELS[row.subject]}</span>
                    <span className="fm-subject-counts__value">{row.active}</span>
                    <span className="fm-subject-counts__note">
                      {row.minimum_met ? 'ready' : `needs ${4 - row.active} more`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        <section className="fm-panel" aria-labelledby="fm-upload-title">
          <div className="fm-section-head">
            <h2 id="fm-upload-title">Bulk import questions</h2>
            <button type="button" className="fm-btn fm-btn--ghost" onClick={() => void fmApi.downloadTemplate()}>
              Download template CSV
            </button>
          </div>

          <p className="fm-hint">
            Required columns: <code>subject, question_text, option_a, option_b, option_c, option_d,
            correct_option, explanation, difficulty</code>. The whole file is validated first — if any
            row fails, nothing is written.
          </p>

          <div
            className={`fm-drop ${dragOver ? 'is-over' : ''} ${file ? 'has-file' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const dropped = e.dataTransfer.files?.[0]
              if (dropped) {
                setFile(dropped)
                setUploadResult(null)
              }
            }}
          >
            <input
              ref={inputRef}
              id="fm-csv"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setUploadResult(null)
              }}
            />
            <label htmlFor="fm-csv" className="fm-drop__label">
              {file ? (
                <span>
                  <strong>{file.name}</strong> · {(file.size / 1024).toFixed(1)} KB
                </span>
              ) : (
                <span>
                  Drag a CSV file here, or <u>browse</u> to choose one
                </span>
              )}
            </label>
          </div>

          <label className="fm-check">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
            <span>Dry run — validate only, write nothing</span>
          </label>

          <div className="fm-actions">
            <button
              type="button"
              className="fm-btn fm-btn--outline"
              disabled={!file || uploading}
              onClick={() => void runUpload(true)}
            >
              Validate only
            </button>
            <button
              type="button"
              className="fm-btn fm-btn--primary"
              disabled={!file || uploading}
              onClick={() => void runUpload(dryRun)}
            >
              {uploading ? 'Processing…' : dryRun ? 'Validate (dry run)' : 'Import questions'}
            </button>
          </div>

          {uploadResult && <UploadPreview result={uploadResult} />}
        </section>

        <section className="fm-panel" aria-labelledby="fm-history-title">
          <h2 id="fm-history-title">Upload history</h2>
          {recentUploads.length === 0 ? (
            <p className="fm-empty">No uploads yet.</p>
          ) : (
            <div className="fm-scroll">
              <table className="fm-table fm-table--compact">
                <thead>
                  <tr>
                    <th scope="col">File</th>
                    <th scope="col">Status</th>
                    <th scope="col">Rows</th>
                    <th scope="col">Created</th>
                    <th scope="col">Skipped</th>
                    <th scope="col">Failed</th>
                    <th scope="col">By</th>
                    <th scope="col">When</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUploads.map((row) => (
                    <tr key={row.id}>
                      <th scope="row">{row.filename}</th>
                      <td>
                        <span className={`fm-badge fm-badge--${row.status.toLowerCase()}`}>
                          {row.status}
                        </span>
                      </td>
                      <td>{row.total_rows}</td>
                      <td>{row.created}</td>
                      <td>{row.skipped}</td>
                      <td>{row.failed}</td>
                      <td>{row.uploaded_by ?? '—'}</td>
                      <td>{new Date(row.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="fm-panel" aria-labelledby="fm-bank-title">
          <div className="fm-section-head">
            <h2 id="fm-bank-title">Question inventory {count > 0 && `(${count})`}</h2>
            <form className="fm-filters" onSubmit={onSearch}>
              <input
                className="fm-input"
                placeholder="Search questions…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search questions"
              />
              <label className="fm-sr-only" htmlFor="fm-subject-filter">
                Filter by subject
              </label>
              <select
                id="fm-subject-filter"
                className="fm-input"
                value={subjectFilter}
                onChange={(e) => {
                  setSubjectFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">All subjects</option>
                {SUBJECTS.map((subject: Subject) => (
                  <option key={subject} value={subject}>
                    {SUBJECT_LABELS[subject]}
                  </option>
                ))}
              </select>
              <button className="fm-btn fm-btn--outline" type="submit">
                Search
              </button>
            </form>
          </div>

          {questions.length === 0 ? (
            <p className="fm-empty">No questions match.</p>
          ) : (
            <ul className="fm-bank">
              {questions.map((question) => (
                <li key={question.id} className={`fm-bank__row ${question.is_active ? '' : 'is-off'}`}>
                  <div className="fm-bank__body">
                    <span className="fm-chip fm-chip--subject">
                      {SUBJECT_LABELS[question.subject]}
                    </span>
                    <p className="fm-bank__text">{question.question_text}</p>
                    <span className="fm-bank__meta">
                      Answer: {question.correct_option}
                      {question.difficulty ? ` · difficulty ${question.difficulty}` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`fm-btn fm-btn--ghost ${question.is_active ? '' : 'is-warning'}`}
                    onClick={() => void toggleQuestion(question.id)}
                  >
                    {question.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {count > questions.length && (
            <div className="fm-actions">
              <button
                type="button"
                className="fm-btn fm-btn--ghost"
                disabled={page <= 1}
                onClick={() => turnPage(page - 1)}
              >
                ← Previous
              </button>
              <span className="fm-hint">
                Page {page} · {Math.ceil(count / 20)} pages
              </span>
              <button
                type="button"
                className="fm-btn fm-btn--ghost"
                disabled={page * 20 >= count}
                onClick={() => turnPage(page + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function UploadPreview({ result }: { result: { record: UploadRecord; message?: string } }) {
  const { record, message } = result
  const failed = record.status === 'FAILED'
  const dryRun = record.status === 'DRY_RUN'
  // A dry run writes nothing, so `created` stays 0 — show what WOULD be written.
  const imported = dryRun
    ? Math.max(0, record.total_rows - record.skipped - record.failed)
    : record.created
  return (
    <div className={`fm-preview ${failed ? 'is-failed' : 'is-ok'}`} role="status">
      <div className="fm-preview__counts">
        <div>
          <span className="fm-review__value">{record.total_rows}</span>
          <span className="fm-review__label">Rows read</span>
        </div>
        <div>
          <span className="fm-review__value">{imported}</span>
          <span className="fm-review__label">{failed ? 'Would import' : dryRun ? 'Would import' : 'Imported'}</span>
        </div>
        <div>
          <span className="fm-review__value">{record.skipped}</span>
          <span className="fm-review__label">Duplicates skipped</span>
        </div>
        <div>
          <span className="fm-review__value">{record.failed}</span>
          <span className="fm-review__label">Invalid rows</span>
        </div>
      </div>

      <p className="fm-preview__message">
        {message ??
          (failed
            ? `Validation failed — ${record.failed} row${record.failed === 1 ? '' : 's'} contain errors. Nothing was imported.`
            : 'Upload accepted.')}
      </p>

      {record.errors.length > 0 && (
        <div className="fm-scroll">
          <table className="fm-table fm-table--compact">
            <thead>
              <tr>
                <th scope="col">Row</th>
                <th scope="col">Column</th>
                <th scope="col">Problem</th>
                <th scope="col">Code</th>
              </tr>
            </thead>
            <tbody>
              {record.errors.map((err, i) => (
                <tr key={`${err.row}-${err.code}-${i}`}>
                  <td>{err.row}</td>
                  <td>{err.field ?? '—'}</td>
                  <td>{err.message}</td>
                  <td>
                    <code>{err.code}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
