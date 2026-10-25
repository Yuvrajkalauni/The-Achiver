/**
 * Free Mock Test API client (TRD §6).
 *
 * Identity: the student is anonymous — the server issues a bearer token on
 * test start which we persist in localStorage and send as `X-FM-Owner`.
 * That is what lets refresh / multi-tab resume work without an account.
 */
import type {
  ActiveResponse,
  AdminOverview,
  AdminQuestion,
  AnswerInput,
  AttemptMeta,
  ResultPayload,
  StartResponse,
  UploadRecord,
} from './types'

const API_BASE: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://127.0.0.1:8000'
const ROOT = `${API_BASE}/api/v1/freemock`

const OWNER_KEY = 'fm-owner'
const ADMIN_KEY = 'fm-admin'

export class ApiError extends Error {
  code: string
  status: number
  details: Record<string, unknown>

  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function getOwnerToken(): string | null {
  try {
    return window.localStorage.getItem(OWNER_KEY)
  } catch {
    return null
  }
}

export function setOwnerToken(token: string) {
  try {
    window.localStorage.setItem(OWNER_KEY, token)
  } catch {
    /* private mode — resume within this session still works via memory */
  }
}

export function clearOwnerToken() {
  try {
    window.localStorage.removeItem(OWNER_KEY)
  } catch {
    /* ignore */
  }
}

function getAdminToken(): string | null {
  try {
    return window.localStorage.getItem(ADMIN_KEY)
  } catch {
    return null
  }
}

export function setAdminToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(ADMIN_KEY, token)
    else window.localStorage.removeItem(ADMIN_KEY)
  } catch {
    /* ignore */
  }
}

async function request<T>(
  path: string,
  options: {
    method?: string
    body?: unknown
    owner?: boolean
    admin?: boolean
    signal?: AbortSignal
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  const method = options.method || 'GET'

  if (options.owner !== false) {
    const token = getOwnerToken()
    if (token) headers['X-FM-Owner'] = token
  }
  if (options.admin) {
    const token = getAdminToken()
    if (token) headers.Authorization = `Token ${token}`
  }

  let body: BodyInit | undefined
  if (options.body instanceof FormData) {
    body = options.body
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  let response: Response
  try {
    response = await fetch(`${ROOT}${path}`, {
      method,
      headers,
      body,
      signal: options.signal,
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Connection failed. We will keep retrying — check your network.')
  }

  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    const envelope = (payload as { error?: { code?: string; message?: string; details?: Record<string, unknown> } })
      ?.error
    // A failed CSV validation returns the partial CsvUpload record as the body
    // (HTTP 422) instead of an error envelope — keep it accessible as details.
    const fallback =
      payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
    throw new ApiError(
      response.status,
      envelope?.code || 'REQUEST_FAILED',
      envelope?.message || `Request failed (${response.status}).`,
      envelope?.details || fallback,
    )
  }
  return payload as T
}

export const fmApi = {
  /** POST /test/start — creates or resumes the single active attempt. */
  start: () => request<StartResponse>('/test/start', { method: 'POST', body: {} }),

  /** GET /test/active — used on load to recover after refresh. */
  active: () => request<ActiveResponse>('/test/active'),

  attempt: (id: string) => request<ActiveResponse>(`/test/attempts/${id}`),

  saveAnswers: (id: string, answers: AnswerInput[]) =>
    request<{ saved: number; answered_questions: number; server_time: string }>(
      `/test/attempts/${id}/answers`,
      { method: 'PATCH', body: { answers } },
    ),

  submit: (id: string, answers: AnswerInput[]) =>
    request<ResultPayload>('/test/submit', { method: 'POST', body: { attempt_id: id, answers } }),

  result: (id: string) => request<ResultPayload>(`/test/attempts/${id}/result`),

  history: () => request<{ attempts: AttemptMeta[] }>('/test/history'),

  // ---- Admin ----
  adminLogin: async (username: string, password: string) => {
    const data = await request<{ token: string; username: string }>('/admin/login', {
      method: 'POST',
      body: { username, password },
      owner: false,
    })
    setAdminToken(data.token)
    return data
  },

  adminLogout: () => setAdminToken(null),

  adminHasToken: () => Boolean(getAdminToken()),

  adminOverview: () => request<AdminOverview>('/admin/overview', { admin: true, owner: false }),

  adminUpload: (file: File, dryRun: boolean) => {
    const form = new FormData()
    form.append('file', file)
    form.append('dry_run', dryRun ? 'true' : 'false')
    return request<UploadRecord>('/admin/upload', {
      method: 'POST',
      body: form,
      admin: true,
      owner: false,
    })
  },

  adminUploads: () => request<{ uploads: UploadRecord[] }>('/admin/uploads', { admin: true, owner: false }),

  adminQuestions: (params: { subject?: string; search?: string; page?: number }) => {
    const query = new URLSearchParams()
    if (params.subject) query.set('subject', params.subject)
    if (params.search) query.set('search', params.search)
    if (params.page) query.set('page', String(params.page))
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return request<{ count: number; page: number; results: AdminQuestion[] }>(
      `/admin/questions${suffix}`,
      { admin: true, owner: false },
    )
  },

  adminToggleQuestion: (id: string) =>
    request<{ id: string; is_active: boolean }>(`/admin/questions/${id}/toggle`, {
      method: 'POST',
      admin: true,
      owner: false,
    }),

  templateUrl: () => `${ROOT}/admin/template`,

  /** The template download needs the auth header, so fetch it as a blob. */
  downloadTemplate: async () => {
    const token = getAdminToken()
    const response = await fetch(`${ROOT}/admin/template`, {
      headers: token ? { Authorization: `Token ${token}` } : {},
    })
    if (!response.ok) throw new ApiError(response.status, 'TEMPLATE_FAILED', 'Could not download the template.')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'free_mock_test_template.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  },
}
