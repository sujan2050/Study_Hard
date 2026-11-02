# Quiet Study (Study Hard)

> **A living study guide where the AI proposes, the source stays visible, and you decide what enters your library.**

Quiet Study is an active recall learning platform designed for absolute academic trust. Instead of generating ungrounded flashcards, Quiet Study partitions your study notes, textbooks, and lecture transcripts into cognitive passages, generates concept flashcards, and strictly anchors every single card to a **verbatim quote** from the original text.

---

## ✨ Features

- **Source Quote Verification**: Every proposed card quotes an exact sentence from the source passage. Hallucinated or misattributed cards are blocked before reaching your inbox.
- **Human-in-the-Loop Review**: Cards land as drafts in your **Review Inbox**. Approve, edit front/back questions, or discard. Nothing is auto-approved.
- **Active Recall Quizzes**: Test your knowledge in the Study mode. Tap to reveal answers and view the original passage context at any time.
- **MySQL & PostgreSQL Support**: Backed by a persistent MySQL engine (`study_hard`) with connection pooling, and automatic fallback to PostgreSQL or local JSON storage.
- **JWT User Authentication**: Built-in signup, login, password hashing with `bcryptjs`, and seamless guest-to-account data migration.
- **Near-Duplicate Suppression**: Automatically detects and prevents repetitive cards across study sessions.
- **Progress & Accuracy Analytics**: Tracks quiz accuracy percentages and your most missed cards to optimize exam review.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Lucide Icons, Vanilla CSS design system
- **Backend**: Express.js, TypeScript, TSX
- **Database**: MySQL (`mysql2/promise`), PostgreSQL (`pg`), JSON persistence fallback
- **Authentication**: JSON Web Tokens (JWT) & `bcryptjs`

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your database credentials:
```bash
cp .env.example .env
```

Example configuration:
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=study_hard
JWT_SECRET=your_jwt_secret_key
PORT=3001
```

### 3. Start Backend & Frontend
In one terminal, start the Express backend server:
```bash
npm run server
```

In another terminal, start the Vite frontend development server:
```bash
npm run dev
```

Open your browser at **http://localhost:5173**.

---

## 🧪 Testing

Run the formal acceptance verification suite (tests quote verification, empty passage handling, library scoping, near-duplicate detection, and data migration):
```bash
npx tsx acceptance_tests.ts
```

---

## 🌐 Deployment Guide

### Option 1: Render / Railway / Fly.io (Single Full-Stack Service)

1. Connect your GitHub repository to [Render](https://render.com) or [Railway](https://railway.app).
2. Set the build and start commands:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start` (or `tsx server/index.ts`)
3. The Express server is already configured to automatically serve the compiled frontend (`dist/index.html`) when `dist` exists.
4. Set the environment variables in your deployment dashboard:
   - `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` (or `DATABASE_URL` if using managed PostgreSQL)
   - `JWT_SECRET`
   - `PORT=3001` (or whatever the platform assigns)

### Option 2: Split Deployment (Vercel Frontend + Render/Railway Backend)

- **Frontend (Vercel)**:
  - Framework Preset: `Vite`
  - Build Command: `npm run build`
  - Output Directory: `dist`
  - Configure `VITE_API_URL` or proxy settings.
- **Backend (Render / Railway / Render Web Service)**:
  - Run `npm run start`
  - Connect to managed MySQL or PostgreSQL instance.

---

## 📄 License

MIT
