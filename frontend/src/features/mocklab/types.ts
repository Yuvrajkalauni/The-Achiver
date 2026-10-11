export interface LabQuestion {
  id: number
  subject: string
  topic: string
  text: string
  options: string[]
  difficulty: string
  order: number
}

export interface AttemptPayload {
  attemptId: number
  testId: number
  status: 'in_progress' | 'submitted'
  duration_minutes: number
  remaining_s: number
  answered: number
  total: number
  questions: LabQuestion[]
  answers: Record<string, number | null>
  pass_mark: number
}

export interface TestStatus {
  testId: number
  status: 'queued' | 'generating' | 'ready' | 'failed'
  generated: number
  total: number
  per_subject: Record<string, number>
  error: string
}

export interface HealthState {
  ok: boolean
  model: string
  message: string
}

export interface ReviewItem {
  question_id: number
  subject: string
  topic: string
  text: string
  options: string[]
  difficulty: string
  selected: number | null
  correct_index: number
  verdict: 'correct' | 'wrong' | 'unanswered'
  explanation: string
  explanation_ai: boolean
}

export interface ResultPayload {
  attemptId: number
  testId: number
  score: number
  total: number
  percentage: number
  passed: boolean
  pass_mark: number
  time_taken_s: number
  per_subject: Record<string, { score: number; total: number }>
  ai_summary: string
  ai_summary_fallback: boolean
  evaluation_ready: boolean
  review: ReviewItem[]
}

export const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'English'] as const
