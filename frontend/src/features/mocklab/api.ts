import type { AttemptPayload, HealthState, ResultPayload, TestStatus } from './types'

const BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://127.0.0.1:8000'
const ROOT = `${BASE}/api/v1/mocklab`

export class ApiError extends Error {
  status: number
  fix: string
  constructor(status: number, message: string, fix = '') {
    super(message)
    this.status = status
    this.fix = fix
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${ROOT}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    throw new ApiError(0, 'Backend is unreachable. Is Django running on :8000?', 'Start it: cd backend && python manage.py runserver 0.0.0.0:8000')
  }
  let body: { error?: string; fix?: string } & Record<string, unknown> = {}
  try {
    body = (await res.json()) as typeof body
  } catch {
    throw new ApiError(res.status, `Backend returned non-JSON (HTTP ${res.status}).`)
  }
  if (!res.ok) {
    throw new ApiError(res.status, (body.error as string) || `Request failed (HTTP ${res.status}).`, (body.fix as string) || '')
  }
  return body as T
}

export const labApi = {
  health: () => req<HealthState>('/health/'),
  generate: () => req<{ testId: number }>('/tests/generate', { method: 'POST', body: '{}' }),
  status: (id: number) => req<TestStatus>(`/tests/${id}/status`),
  latest: () => req<{ test: (TestStatus & { created_at: string }) | null }>('/tests/latest'),
  startAttempt: (testId: number, minutes: number) =>
    req<{ attemptId: number }>(`/tests/${testId}/attempts`, { method: 'POST', body: JSON.stringify({ minutes }) }),
  repeat: (testId: number, minutes: number) =>
    req<{ attemptId: number }>(`/tests/${testId}/repeat`, { method: 'POST', body: JSON.stringify({ minutes }) }),
  attempt: (id: number) => req<AttemptPayload>(`/attempts/${id}`),
  saveAnswer: (attemptId: number, questionId: number, selected: number | null) =>
    req<{ selected: number | null }>(`/attempts/${attemptId}/answers/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify({ selected }),
    }),
  submit: (attemptId: number) =>
    req<{ score: number; total: number; time_taken_s: number; evaluation_ready: boolean }>(
      `/attempts/${attemptId}/submit`,
      { method: 'POST', body: '{}' },
    ),
  generateNext: (testId: number) =>
    req<{ testId: number; round?: number; complete?: boolean }>(`/tests/${testId}/generate-next`, {
      method: 'POST',
      body: '{}',
    }),
  submitRound: (attemptId: number, round: number) =>
    req<{ attemptId: number; round: number; score: number; total: number; ready: boolean }>(
      `/attempts/${attemptId}/submit-round`,
      { method: 'POST', body: JSON.stringify({ round }) },
    ),
  result: (attemptId: number) => req<ResultPayload>(`/attempts/${attemptId}/result`),
}
