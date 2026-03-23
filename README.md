# TaskFlow Management 📋

> Full-Stack Task Management System  
> Built by **Rakesh Oza** | March 2026

---

## 🌐 Live Applications

| Version | App | Docs |
|--------|-----|------|
| V1 — Supabase | https://my-todo-app-4dc76.web.app | — |
| V2 — Cloud Run | https://task-flow-management-2e519.web.app | https://task-flow-management-2e519.web.app/docs.html |

---

## 🔗 Project Links

### 🔹 Version 1 — Supabase + Firebase

- **Live App**  
  https://my-todo-app-4dc76.web.app  

- **Supabase Database**  
  https://supabase.com/dashboard/project/bnbizwpwowtianfsftnh  

- **Firebase Console**  
  https://console.firebase.google.com/project/my-todo-app-4dc76  

- **GCP Console**  
  https://console.cloud.google.com/home/dashboard?project=my-todo-app-4dc76  

- **Looker Studio Dashboard**  
  https://lookerstudio.google.com/reporting/950862ae-7c6b-4e43-ab95-5abd7ff3efb8  

---

### 🔹 Version 2 — Cloud SQL + Cloud Run + Looker Studio

- **Live App**  
  https://task-flow-management-2e519.web.app  

- **Documentation**  
  https://task-flow-management-2e519.web.app/docs.html  

- **Backend API (Cloud Run)**  
  https://taskflow-api-280656063253.asia-south1.run.app  

- **Looker Studio Dashboard**  
  https://lookerstudio.google.com/reporting/950862ae-7c6b-4e43-ab95-5abd7ff3efb8  

- **Firebase Console**  
  https://console.firebase.google.com/project/task-flow-management-2e519/overview  

- **Firebase Hosting**  
  https://console.firebase.google.com/project/task-flow-management-2e519/hosting/sites  

- **Firebase Authentication**  
  https://console.firebase.google.com/project/task-flow-management-2e519/authentication/users  

- **GCP Project Dashboard**  
  https://console.cloud.google.com/home/dashboard?project=task-flow-management-2e519  

- **Cloud SQL Instance**  
  https://console.cloud.google.com/sql/instances/taskflow-db/overview?project=task-flow-management-2e519  

- **Cloud Run Service**  
  https://console.cloud.google.com/run/detail/asia-south1/taskflow-api/metrics?project=task-flow-management-2e519  

- **GCP Billing**  
  https://console.cloud.google.com/billing?project=task-flow-management-2e519  

---

## 📌 Overview

TaskFlow is a **scalable task management system** showcasing the transition from a simple frontend-driven app to a **production-ready cloud architecture**.

- 🔹 **V1** — Lightweight system using Supabase REST APIs  
- 🔹 **V2** — Full-stack system with secure backend and scalable infrastructure  

---

## ⚡ V1 vs V2 Comparison

| Feature | V1 — Supabase | V2 — Cloud Run |
|--------|--------------|----------------|
| Architecture | Frontend only | Full-stack |
| Database | Supabase PostgreSQL | Cloud SQL PostgreSQL |
| Backend | ❌ No backend | ✅ Node.js + Express |
| Auth | Firebase Google | Firebase + JWT |
| API | Supabase REST | Custom REST API |
| Security | Basic | Advanced (JWT) |
| Analytics | Limited | Looker Studio |
| Cost | ₹0 / month | ~₹600–800 / month |
| Status | ✅ Live | ✅ Live |

---

## 🛠 Tech Stack

| Layer | V1 | V2 |
|------|----|----|
| Hosting | Firebase | Firebase |
| Auth | Firebase Google | Firebase Google |
| Database | Supabase PostgreSQL | Cloud SQL PostgreSQL 18 |
| Backend | — | Node.js + Express |
| API | Supabase Auto REST | Custom REST (Cloud Run) |
| Analytics | — | Looker Studio |

---

## ✨ Features

- ✅ Google Sign-In authentication  
- ✅ Add / Edit / Delete tasks  
- ✅ Priority — High / Medium / Low  
- ✅ Project grouping  
- ✅ Assign tasks to team members  
- ✅ Due dates + overdue detection  
- ✅ Advanced search and filters  
- ✅ Progress tracking (completion %)  
- ✅ Dark mode UI  
- ✅ Export tasks to CSV  
- ✅ Looker Studio analytics dashboard  

---

## 🚀 Deployment

### Frontend
```bash
firebase deploy --only hosting
```

### Backend (Cloud Run)
```bash
cd api

gcloud builds submit --tag gcr.io/task-flow-management-2e519/taskflow-api

gcloud run deploy taskflow-api \
  --image gcr.io/task-flow-management-2e519/taskflow-api \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated
```

---

## 💻 GitHub Setup

```bash
git init
git add .
git commit -m "TaskFlow v1 & v2"

git remote add origin https://github.com/YOUR_USERNAME/task-management-system.git
git push -u origin main
```

---

## 📬 Contact

**Rakesh Oza**  
📧 ozarakesh533@gmail.com  
🔗 https://www.linkedin.com/in/rakeshoza/  
💻 https://github.com/Ozarakesh533  

---

⭐ *If you like this project, consider giving it a star!*
