# The Achievers — Institute of Learning

React + Vite front end and Django REST Framework back end for the Achievers
institute website, with a **Free Mock Test** assessment platform built to the
project's PRD (`Free_Mock_Test_PRD.docx`) and TRD
(`Technical Requirements Document (TRD).docx`).

## Stack

| Layer     | Technology                                              |
| --------- | ------------------------------------------------------- |
| Front end | React 19 + TypeScript + Vite, react-router, custom `ta-`/`fm-` design tokens |
| Back end  | Django 5 + Django REST Framework + SQLite (PostgreSQL-ready models) |
| Auth      | DRF token auth for admins; anonymous bearer token for test takers |
| Styling   | Theme tokens in `frontend/src/styles/` (light-first, dark mode via `data-theme`) |

## Running locally

```bash
# backend (terminal 1)
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000

# frontend (terminal 2)
cd frontend
npm install
npm run dev -- --port 5173 --host
```

- Front end: <http://localhost:5173>
- API health: <http://127.0.0.1:8000/api/v1/health/>
- Front end API base URL comes from `VITE_API_BASE_URL` in `frontend/.env`.

Useful commands:

```bash
python manage.py test apps.freemock      # Free Mock Test test suite (25 tests)
python manage.py seed_freemock_demo      # 25 demo questions so the flow can be tried
python manage.py seed_freemock_demo --clear
python manage.py freemock_expire         # background job: finalize expired attempts
```

## Free Mock Test

Student-facing app at **`/mock-test/free`** and admin console at
**`/mock-test/admin`**. Both render outside the site navbar/footer (the exam
surface must be distraction-free) and open in a new tab from the
"Try Free Mock" CTAs.

### Test rules (PRD §9)

- 20 questions per test: 4 each from English, Mathematics, Physics, Chemistry, Biology
- 5 marks per question, **100 marks** total, no negative marking
- 30 minutes; the **server** owns the deadline, the browser only displays it
- Correct answers are never sent to the browser before submission
- Anonymous start — no sign-up; a bearer token issued at start keeps the
  attempt resumable after refresh (one active attempt per student)

### Student flow

1. Landing (facts + Start / Resume Test)
2. Instructions (format table, rules, explicit confirmation)
3. Live exam — subject tabs, answer palette, debounced autosave, countdown
   with 10/5/1-minute warnings, auto-submit at zero
4. Review & submit — answered/unanswered counts, per-subject completion,
   list of unanswered questions, final confirmation
5. Result — score, subject-wise marks, filterable answer review with
   correct/incorrect/unanswered states and explanations

### API (base `/api/v1/freemock`)

| Method | Path                                        | Purpose                             |
| ------ | ------------------------------------------- | ----------------------------------- |
| POST   | `/test/start`                               | Create or resume the active attempt |
| GET    | `/test/active`                              | Recover an attempt after refresh    |
| GET    | `/test/attempts/{id}`                       | Resume attempt with saved answers   |
| PATCH  | `/test/attempts/{id}/answers`               | Autosave answers                    |
| POST   | `/test/submit`                              | Score and finalize (idempotent)     |
| GET    | `/test/attempts/{id}/result`                | Score + subject summary + review    |
| GET    | `/test/history`                             | Previous attempts for this student  |
| POST   | `/admin/login`                              | Staff login → DRF token             |
| GET    | `/admin/overview`                           | Counts by subject + warnings        |
| POST   | `/admin/upload`                             | Validated CSV import (`dry_run`)    |
| GET    | `/admin/uploads`                            | Upload history                      |
| GET    | `/admin/template`                           | CSV template download               |
| GET    | `/admin/questions`                          | Paginated question inventory        |
| POST   | `/admin/questions/{id}/toggle`              | Soft activate / deactivate          |

Errors always use the TRD envelope:

```json
{ "error": { "code": "INSUFFICIENT_QUESTION_POOL", "message": "...", "details": {}, "request_id": "req_ab12cd34ef56" } }
```

Student requests send `X-FM-Owner: <token>`; admin requests send
`Authorization: Token <token>` (both are in `CORS_ALLOW_HEADERS`).

### Question bank CSV

Required header (exact names, UTF-8):

```csv
subject,question_text,option_a,option_b,option_c,option_d,correct_option,explanation,difficulty
```

- `subject` must be one of `ENGLISH`, `MATHEMATICS`, `PHYSICS`, `CHEMISTRY`, `BIOLOGY`
  (case-insensitive; `math`/`maths`/`bio` are accepted)
- `correct_option` must be `A`, `B`, `C` or `D`
- `difficulty` is `1`–`5` or empty
- Limit: 10 MB / 10 000 rows
- **All-or-nothing**: one invalid row rejects the whole file with row-level
  errors; duplicate questions (in the file or already in the bank) are skipped
  and counted

### Creating an admin account

```bash
cd backend
python manage.py createsuperuser
```

### Backend layout

```
backend/apps/freemock/
  models.py         Question, TestAttempt, AttemptQuestion, UserAnswer, CsvUpload
  services.py       test generation, autosave, scoring, expiry worker, CSV validation
  views.py          student + admin endpoints
  serializers.py    pre-submit vs post-submit payload separation (no answer leak)
  errors.py         TRD error envelope + request IDs
  tests.py          25 tests: lifecycle, scoring, expiry, ownership, CSV, security
  management/commands/   freemock_expire, seed_freemock_demo
```

### Frontend layout

```
frontend/src/features/freemock/
  FreeMockApp.tsx        route shell + screen state machine
  api.ts                 API client, owner/admin token storage
  freemock.css           app styles (theme-token driven, light + dark)
  screens/               Landing, Instructions, Test, Result
  admin/AdminScreen.tsx  login, overview, CSV upload, history, inventory
```
