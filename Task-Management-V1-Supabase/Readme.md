# Task Management App — Version 1 (Firebase + Supabase) 📋
> A production-grade task management system built with Firebase Hosting, Firebase Auth, Supabase PostgreSQL, and Looker Studio.

---

## 🌐 Live URLs

**Frontend App**
https://my-todo-app-4dc76.web.app

**Looker Studio Dashboard**
https://lookerstudio.google.com/reporting/950862ae-7c6b-4e43-ab95-5abd7ff3efb8

**Firebase Console**
https://console.firebase.google.com/project/my-todo-app-4dc76

**GCP Console**
https://console.cloud.google.com/home/dashboard?project=my-todo-app-4dc76

**Supabase Dashboard**
https://supabase.com/dashboard/project/bnbizwpwowtianfsftnh

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML / CSS / Vanilla JS |
| Hosting | Firebase Hosting |
| Authentication | Firebase Google Auth |
| Database | Supabase PostgreSQL (Free) |
| Analytics | Looker Studio |

---

## ✨ Features

- ✅ Google Sign-In via Firebase Auth
- ✅ Add, Delete, Mark tasks as Done
- ✅ Priority levels — High / Medium / Low
- ✅ Assign tasks to team members with due dates
- ✅ Filter by — All / Pending / Done / Overdue
- ✅ Overdue detection with red highlight
- ✅ Stats cards — Total / Done / Pending / Overdue
- ✅ Auto save to Supabase PostgreSQL
- ✅ Private tasks — each user sees only their own

---

## 📁 Project Structure

```
Task-Management-V1-Supabase/
├── public/
│   ├── index.html          ← Main app (HTML + CSS + JS)
│   └── 404.html            ← Custom error page
├── firebase.json           ← Firebase Hosting config
└── .firebaserc             ← Firebase project reference
```

---

## 🗄 Database Schema

```sql
CREATE TABLE todos (
  id          BIGSERIAL     PRIMARY KEY,
  task        TEXT          NOT NULL,
  priority    TEXT          DEFAULT 'medium',
  done        BOOLEAN       DEFAULT false,
  assigned_by TEXT,
  assign_to   TEXT,
  assign_date DATE,
  due_date    DATE,
  user_email  TEXT,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);
```

---

## 🔌 API — Supabase REST

Base URL: `https://bnbizwpwowtianfsftnh.supabase.co/rest/v1`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/todos?user_email=eq.{email}` | Get all tasks for user |
| POST | `/todos` | Create new task |
| PATCH | `/todos?id=eq.{id}` | Mark task as done |
| DELETE | `/todos?id=eq.{id}` | Delete task |

---

## 🚀 Deployment

### Frontend — Firebase Hosting
```bash
cd Task-Management-V1-Supabase
firebase login
firebase use my-todo-app-4dc76
firebase deploy
```

---

## ☁️ GCP Configuration

| Setting | Value |
|---------|-------|
| Firebase Project ID | `my-todo-app-4dc76` |
| GCP Project Number | `599715420588` |
| Region | `us-central1` |
| Supabase Host | `db.bnbizwpwowtianfsftnh.supabase.co` |
| Supabase DB Port | `5432` |
| Database | `postgres` |

---

## 🔧 Local Development

```bash
# Clone the repo
git clone https://github.com/Ozarakesh533/Task-Management-App-.git
cd Task-Management-App-/Task-Management-V1-Supabase

# Install Firebase CLI
npm install -g firebase-tools

# Login and deploy
firebase login
firebase deploy
```

---

## 🔐 Authentication

| Token | Expiry | Purpose |
|-------|--------|---------|
| ID Token | 1 hour (3600s) | Proves identity — uid, email, name |
| Refresh Token | Never expires | Silently gets new ID tokens |

> Firebase SDK automatically refreshes the ID Token in the background — users never get logged out unexpectedly.

---

## 📊 Looker Studio Dashboard

| Component | Type | Shows |
|-----------|------|-------|
| Total Tasks | Scorecard | COUNT(*) all tasks |
| Completed | Scorecard | WHERE done = true |
| Pending | Scorecard | WHERE done = false |
| Overdue | Scorecard | Past due + not done |
| Priority Split | Pie Chart | High / Medium / Low |
| Tasks by Assignee | Bar Chart | Count per person |
| All Tasks | Data Table | Full sortable list |
| Date Range | Filter | Filter by period |

---

## 📤 Push to GitHub

```bash
git init
git add .
git commit -m "feat: Task Management V1 — Firebase + Supabase"
git remote add origin https://github.com/Ozarakesh533/Task-Management-App-.git
git branch -M main
git push -u origin main
```

---

## ⚡ V1 vs V2 Comparison

| Feature | V1 — This Version | V2 — GCP Cloud Run |
|---------|------------------|-------------------|
| Database | Supabase (free) | Cloud SQL (GCP) |
| Backend | None — direct API | Node.js / Flask on Cloud Run |
| JWT Verification | Frontend only | Every API request |
| Cost | ₹0 / month | ~₹600–800 / month |
| Status | ✅ Live | ⏳ Pending billing |

---

## 📬 Contact

**Rakesh Oza**
- 📧 ozarakesh533@gmail.com
- 🔗 [LinkedIn](https://www.linkedin.com/in/rakeshoza/)
- 💻 [GitHub](https://github.com/Ozarakesh533)

---

*Task Management App v1.0 — Built with Firebase + Supabase + GCP + Looker Studio | March 2026*
