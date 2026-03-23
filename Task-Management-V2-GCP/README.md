# TaskFlow Management 🚀
> A production-grade full-stack task management system built with Firebase, Cloud Run, Cloud SQL PostgreSQL, and Looker Studio.

---

## 🌐 Live URLs

**Frontend App**
https://task-flow-management-2e519.web.app

**Backend API**
https://taskflow-api-280656063253.asia-south1.run.app

**Looker Studio Dashboard**
https://lookerstudio.google.com/u/0/reporting/950862ae-7c6b-4e43-ab95-5abd7ff3efb8/page/9yhsF

**Firebase Console**
https://console.firebase.google.com/project/task-flow-management-2e519

**GCP Console**
https://console.cloud.google.com/home/dashboard?project=task-flow-management-2e519

**Cloud SQL**
https://console.cloud.google.com/sql/instances/taskflow-db/overview?project=task-flow-management-2e519

**Cloud Run**
https://console.cloud.google.com/run/detail/asia-south1/taskflow-api/metrics?project=task-flow-management-2e519

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML / CSS / Vanilla JS |
| Hosting | Firebase Hosting |
| Authentication | Firebase Google Auth |
| Backend API | Node.js + Express |
| Containerization | Docker + Cloud Run |
| Database | Cloud SQL PostgreSQL 18 |
| Analytics | Looker Studio |

---

## ✨ Features

- ✅ Google Sign-In via Firebase Auth
- ✅ Add, Edit, Delete, Mark tasks as Done
- ✅ Priority levels — High / Medium / Low
- ✅ Project/category grouping
- ✅ Assign tasks to team members with due dates
- ✅ Search across tasks, assignees, projects, notes
- ✅ Filter by — All / Pending / Done / Overdue
- ✅ Progress bar showing completion %
- ✅ Dark mode with localStorage persistence
- ✅ Export tasks to CSV
- ✅ Fully responsive — mobile friendly
- ✅ Live Looker Studio analytics dashboard

---

## 📁 Project Structure

```
Task_Management_system/
├── public/                  ← Firebase Hosting (Frontend)
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── app.js           ← Firebase config, auth, utils
│       ├── tasks.js         ← CRUD operations
│       └── ui.js            ← Render table, stats, filters
├── api/                     ← Cloud Run Backend
│   ├── routes/
│   │   ├── tasks.js
│   │   ├── projects.js
│   │   └── users.js
│   ├── server.js
│   ├── db.js
│   ├── Dockerfile
│   └── .env
├── firebase.json
└── .firebaserc
```

---

## 🗄 Database Schema

```sql
-- Users
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  name       TEXT,
  photo_url  TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  owner_email TEXT REFERENCES users(email),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Tasks
CREATE TABLE tasks (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  notes       TEXT,
  priority    TEXT DEFAULT 'medium',
  status      TEXT DEFAULT 'pending',
  project_id  INT REFERENCES projects(id),
  assign_to   TEXT,
  assigned_by TEXT,
  assign_date DATE,
  due_date    DATE,
  user_email  TEXT REFERENCES users(email),
  created_at  TIMESTAMP DEFAULT NOW()
);
```

---

## 🔌 API Endpoints

Base URL: `https://taskflow-api-280656063253.asia-south1.run.app/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/api/users` | Upsert user on login |
| GET | `/api/tasks?email=` | Get all tasks for user |
| POST | `/api/tasks` | Create new task |
| PATCH | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| GET | `/api/projects?email=` | Get all projects |
| POST | `/api/projects` | Create project |
| DELETE | `/api/projects/:id` | Delete project |

---

## 🚀 Deployment

### Frontend — Firebase Hosting
```bash
cd Task_Management_system
firebase deploy --only hosting
```

### Backend — Cloud Run
```bash
cd api
gcloud builds submit --tag gcr.io/task-flow-management-2e519/taskflow-api

gcloud run deploy taskflow-api \
  --image gcr.io/task-flow-management-2e519/taskflow-api \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars DB_HOST=35.244.39.100,DB_PORT=5432,DB_NAME=taskflow,DB_USER=taskflow_user,DB_PASSWORD=TaskFlow@123
```

---

## ☁️ GCP Configuration

| Setting | Value |
|---------|-------|
| Project ID | `task-flow-management-2e519` |
| Region | `asia-south1` (Mumbai) |
| Cloud SQL Instance | `taskflow-db` |
| Database | `taskflow` |
| Public IP | `35.244.39.100` |
| Connection Name | `task-flow-management-2e519:asia-south1:taskflow-db` |

---

## 🔧 Local Development

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/task-management-system.git
cd task-management-system

# Run backend locally
cd api
npm install
node server.js
# API runs on http://localhost:8080

# Frontend
cd ../public
npx serve .
```

---

## 📤 Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit — TaskFlow v1"
git remote add origin https://github.com/YOUR_USERNAME/task-management-system.git
git branch -M main
git push -u origin main
```

---

*TaskFlow Management v1.0 — Built with Firebase + GCP + Cloud SQL + Looker Studio*
