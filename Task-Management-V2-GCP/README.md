# TaskFlow — Team Task Manager

A production-ready task management web app built with Firebase Auth, Supabase (PostgreSQL), and vanilla JS.

---

## Features

- Google login via Firebase Auth
- Add, edit, delete tasks
- Project / category grouping
- Priority levels (High / Medium / Low)
- Assign to / Assigned by fields
- Due dates with overdue detection
- Notes per task
- Search across tasks, assignees, projects
- Filter by: All / Pending / Done / Overdue
- Filter by project
- Progress bar (completion %)
- Dark mode (persisted in localStorage)
- Export all tasks to CSV
- Fully responsive (mobile friendly)

---

## File Structure

```
task-manager/
├── index.html          ← Main HTML, layout, modal
├── css/
│   └── style.css       ← All styles, dark mode, responsive
├── js/
│   ├── app.js          ← Firebase config, auth, shared utils
│   ├── tasks.js        ← CRUD: add, edit, delete, mark done
│   └── ui.js           ← Render table, stats, filters
├── .gitignore
└── README.md
```

---

## Setup

### 1. Supabase — Add new columns

Your existing `todos` table needs two new columns. Run this SQL in your Supabase SQL editor:

```sql
ALTER TABLE todos ADD COLUMN IF NOT EXISTS project     TEXT;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS notes       TEXT;
```

### 2. Firebase

Your Firebase config is already set in `js/app.js`. No changes needed.

### 3. Run locally

Just open `index.html` in a browser — no build step needed.

For a local dev server (optional):
```bash
npx serve .
```

---

## Deploy to Firebase Hosting

```bash
# Install Firebase CLI (once)
npm install -g firebase-tools

# Login
firebase login

# Init hosting in this folder
firebase init hosting
# → Public directory: .  (current folder)
# → Single-page app: No
# → Overwrite index.html: No

# Deploy
firebase deploy --only hosting
```

Your app will be live at: `https://YOUR-PROJECT-ID.web.app`

---

## Push to GitHub

```bash
# In your project folder
git init
git add .
git commit -m "Initial commit — TaskFlow"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/task-manager.git
git branch -M main
git push -u origin main
```

---

## Tech Stack

| Layer     | Technology                  |
|-----------|-----------------------------|
| Frontend  | HTML, CSS, Vanilla JS       |
| Auth      | Firebase Authentication     |
| Database  | Supabase (PostgreSQL)       |
| Hosting   | Firebase Hosting            |
| Fonts     | Plus Jakarta Sans, JetBrains Mono |
