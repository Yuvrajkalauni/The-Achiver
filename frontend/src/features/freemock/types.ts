/** Shared types for the Free Mock Test app (mirrors TRD §6 API shapes). */

export type Subject =
  | 'ENGLISH'
  | 'MATHEMATICS'
  | 'PHYSICS'
  | 'CHEMISTRY'
  | 'BIOLOGY'

export type OptionCode = 'A' | 'B' | 'C' | 'D'

export const SUBJECTS: Subject[] = [
  'ENGLISH',
  'MATHEMATICS',
  'PHYSICS',
  'CHEMISTRY',
  'BIOLOGY',
]

export const SUBJECT_LABELS: Record<Subject, string> = {
  ENGLISH: 'English',
  MATHEMATICS: 'Mathematics',
  PHYSICS: 'Physics',
  CHEMISTRY: 'Chemistry',
  BIOLOGY: 'Biology',
}

export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'CANCELLED'

export interface AttemptMeta {
  id: string
  status: AttemptStatus
  started_at: string
  expires_at: string
  submitted_at: string | null
  submission_reason: 'USER_SUBMITTED' | 'TIME_EXPIRED' | null
  server_time: string
  duration_seconds: number
  total_marks: number
  marks_per_question: number
  question_count: number
  answered_questions: number
  correct_answers: number | null
  score: number | null
}

export interface ExamQuestion {
  id: string
  sequence_no: number
  subject: Subject
  question_text: string
  options: Record<OptionCode, string>
  selected_option?: OptionCode | null
}

export interface StartResponse {
  owner_token: string
  created: boolean
  attempt: AttemptMeta
  questions: ExamQuestion[]
}

export interface ActiveResponse {
  attempt: AttemptMeta | null
  questions: ExamQuestion[]
  requires_result?: boolean
}

export interface SubjectSummary {
  subject: Subject
  correct: number
  total: number
  marks: number
}

export interface ReviewItem {
  question_id: string
  sequence_no: number
  subject: Subject
  question_text: string
  options: Record<OptionCode, string>
  selected_option: OptionCode | null
  correct_option: OptionCode
  is_correct: boolean
  marks_awarded: number
  explanation: string
  state: 'correct' | 'incorrect' | 'unanswered'
}

export interface ResultPayload {
  attempt: AttemptMeta
  summary_by_subject: SubjectSummary[]
  review: ReviewItem[]
}

export interface AnswerInput {
  question_id: string
  selected_option: OptionCode | null
}

export interface UploadRecord {
  id: string
  filename: string
  status: 'COMPLETED' | 'DRY_RUN' | 'FAILED'
  total_rows: number
  created: number
  skipped: number
  failed: number
  errors: Array<{ row: number; code: string; field?: string; message: string }>
  uploaded_by: string | null
  created_at: string
}

export interface AdminOverview {
  subjects: Array<{ subject: Subject; active: number; inactive: number; minimum_met: boolean }>
  warnings: Subject[]
  totals: {
    active_questions: number
    inactive_questions: number
    attempts: number
    in_progress: number
    completed: number
  }
  recent_uploads: UploadRecord[]
}

export interface AdminQuestion {
  id: string
  subject: Subject
  question_text: string
  correct_option: OptionCode
  difficulty: number | null
  is_active: boolean
  created_at: string
}
