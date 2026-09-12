# 🎓 AI-Enabled Browser-Based Online Examination System

A **Final Year Project** featuring an intelligent online examination platform with **automated proctoring**, **adaptive testing**, and an **analytics dashboard** powered by AI.

## ✨ Features

### 🧑‍🎓 Student Module

- Secure login (JWT + Email OTP verification)
- Timed exams with auto-submit on expiry
- Randomized questions & options
- Resume exam after internet interruption
- Question bookmarking
- Dark mode & fully mobile-responsive UI

### 🧑‍🏫 Faculty / Admin Module

- Question bank management
- Import questions from Excel/CSV
- Create & schedule multiple exams
- Student management
- Result publishing & notifications
- AI analytics dashboard

### 🤖 AI Features

- AI-generated quiz questions from uploaded PDFs
- Difficulty prediction (Easy/Medium/Hard)
- Personalized question recommendations
- Automatic evaluation of subjective answers
- AI feedback after exams
- Adaptive testing (difficulty adjusts to performance)

### 🛡️ Security / Proctoring

- Webcam monitoring & face detection
- Tab-switch detection
- Copy-paste blocking
- Full-screen enforcement
- Multiple-login detection
- Detailed activity logs

### 📊 Analytics

- Student performance graphs
- Topic-wise strengths & weaknesses
- Time spent per question
- Pass/fail prediction
- Class leaderboard
- Export results to PDF/Excel
- Certificate generation

## 🏗️ Tech Stack

| Layer          | Technology                                                    |
| -------------- | ------------------------------------------------------------- |
| **Frontend**   | React.js, Tailwind CSS, Chart.js                              |
| **Backend**    | Node.js, Express.js                                           |
| **Database**   | MongoDB (Mongoose)                                            |
| **Auth**       | JWT + Email OTP                                               |
| **AI**         | OpenAI API (with mock fallback) + Python FastAPI              |
| **Deployment** | Docker, GitHub Actions, Vercel, Render/Railway, MongoDB Atlas |

## 📁 Project Structure

```
NTCC Project/
├── client/          # React.js frontend (Vite + Tailwind + Chart.js)
├── server/          # Node.js + Express backend (JWT, MongoDB)
├── ai-service/      # Python FastAPI AI service (OpenAI + fallback)
├── docker-compose.yml
├── render.yaml      # Render deployment config
├── vercel.json      # Vercel SPA config
├── .github/workflows/ci-cd.yml
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- MongoDB (local or Atlas)

### 1. Backend Setup

```bash
cd server
npm install
cp .env.example .env   # Configure your env
npm run seed           # Seed demo data
npm run dev            # Start on http://localhost:5000
```

### 2. AI Service Setup

```bash
cd ai-service
pip install -r requirements.txt
cp .env.example .env   # Add GEMINI_API_KEY and GEMINI_MODEL
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd client
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:5000/api
npm run dev            # Start on http://localhost:5173
```

### 🌐 Open in Browser

```
http://localhost:5173
```

## 🔑 Demo Accounts

| Role        | Email            | Password   |
| ----------- | ---------------- | ---------- |
| **Admin**   | admin@exam.com   | admin123   |
| **Faculty** | faculty@exam.com | faculty123 |
| **Student** | student@exam.com | student123 |

## 🐳 Docker Deployment

```bash
# Set environment variables
cp .env.example .env

# Build & run all services
docker compose up --build
```

| Service     | URL                       |
| ----------- | ------------------------- |
| Frontend    | http://localhost:5173     |
| Backend API | http://localhost:5000/api |
| AI Service  | http://localhost:8000     |

## ☁️ Cloud Deployment

### Frontend → Vercel

```bash
cd client
npm run build
vercel deploy
```

### Backend & AI → Render/Railway

Use the provided `render.yaml` blueprint or deploy manually:

- **Server**: `cd server && npm start`, set `MONGO_URI`, `JWT_SECRET`
- **AI Service**: uvicorn main:app --port 8000, set `GEMINI_API_KEY` and `GEMINI_MODEL`

### Database → MongoDB Atlas

Create a free cluster and set `MONGODB_URI` in your backend env.

## 🔄 CI/CD (GitHub Actions)

`.github/workflows/ci-cd.yml` runs on every push to `main`:

1. Installs & tests backend dependencies
2. Builds the React frontend
3. Compiles the Python AI service
4. Builds & pushes Docker images
5. Triggers deployment to Render/Railway

## 📡 API Overview

| Method   | Endpoint                               | Description              |
| -------- | -------------------------------------- | ------------------------ |
| POST     | `/api/auth/register`                   | Register + send OTP      |
| POST     | `/api/auth/login`                      | Login (JWT)              |
| POST     | `/api/auth/verify-otp`                 | Verify email OTP         |
| GET      | `/api/student/exams`                   | Get assigned exams       |
| GET      | `/api/student/exams/:id/start`         | Start/resume exam        |
| POST     | `/api/student/attempts/:id/answer`     | Save answer              |
| POST     | `/api/student/attempts/:id/submit`     | Submit exam              |
| POST     | `/api/student/attempts/:id/proctoring` | Report proctoring event  |
| GET/POST | `/api/faculty/questions`               | Question bank CRUD       |
| POST     | `/api/faculty/questions/import`        | Import Excel/CSV         |
| GET/POST | `/api/faculty/exams`                   | Exam management          |
| GET      | `/api/admin/stats`                     | Dashboard stats          |
| GET      | `/api/admin/leaderboard`               | Class leaderboard        |
| POST     | `/api/ai/questions/generate-text`      | AI question generation   |
| POST     | `/api/ai/evaluate/subjective`          | AI subjective evaluation |

## 📜 License

MIT
