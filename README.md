# 🏛️ CivicTrack — Civic Issue Reporting & GIS Transparency Platform

> A clean, modular **MERN Stack** student project designed for academic evaluation, viva presentation, and real-world civic impact.

---

## 📌 1. Project Overview & Problem Statement
Citizens frequently struggle with lack of transparency when reporting civic issues such as:
- 🚗 Damaged roads & deep potholes
- 🚰 Water pipeline leakages
- 🗑️ Garbage bin overflow & uncollected municipal waste
- 💡 Dark streetlights and electrical hazards

**CivicTrack** bridges the gap between citizens and municipal authorities by providing:
1. **Interactive GIS Mapping:** OpenStreetMap + Leaflet for pin-drop location reporting (100% free, zero Google API keys or billing required).
2. **CivicBot AI & Voice Assistant:** 24/7 intelligent conversational assistant with voice input (Web Speech API) and text-to-speech (TTS), automated department grievance categorization, and 1-click pre-filled complaint submission.
3. **Transparent Audit Timeline:** Every complaint features an immutable status history log showing when triage occurred and department action was taken.
4. **Department Workflow Routing:** Automated classification and department assignment (`Roads`, `Water Supply`, `Waste Management`, `Electricity`).
5. **Community Upvoting:** Citizens can upvote nearby complaints to prioritize critical issues without duplicate tickets.

---

## 🛠️ 2. Tech Stack

- **Frontend:** React (Vite), React Router v6, Axios, Leaflet (OpenStreetMap tiles), Lucide Icons, Web Speech API (STT & TTS), Modern CSS.
- **Backend:** Node.js, Express.js (ES Modules, RESTful APIs, MVC architecture).
- **Database:** MongoDB & Mongoose ODM.
- **Authentication:** JSON Web Tokens (JWT) & Bcrypt password hashing.

---

## 📂 3. Clean Architecture & Project Structure

```
fsd/
├── backend/
│   ├── config/
│   │   └── db.js                 # Database connection & error handling
│   ├── controllers/
│   │   ├── authController.js     # User registration, login, JWT issuance
│   │   ├── issueController.js    # Grievance CRUD, upvotes, GIS queries
│   │   └── adminController.js    # Department triage, analytics, status transitions
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT verification & role authorization
│   │   └── errorMiddleware.js    # Global error & 404 handler
│   ├── models/
│   │   ├── User.js               # Citizen & Official user schema
│   │   └── Issue.js              # Issue schema with coordinates & status timeline
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth/*
│   │   ├── issueRoutes.js        # /api/issues/*
│   │   └── adminRoutes.js        # /api/admin/*
│   ├── utils/
│   │   └── seeder.js             # Realistic dummy data generator for demos
│   ├── .env                      # Environment config (PORT, MONGO_URI, JWT_SECRET)
│   ├── package.json
│   └── server.js                 # Express application entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx        # Navigation with role-based links
│   │   │   ├── CivicChatbot.jsx  # Floating AI & Voice municipal chatbot
│   │   │   ├── StatusBadge.jsx   # Status indicator badge
│   │   │   ├── IssueCard.jsx     # Reusable preview card with upvotes
│   │   │   ├── MapPicker.jsx     # Leaflet map to click & pin coordinates
│   │   │   ├── MapView.jsx       # City-wide GIS map with color-coded pins
│   │   │   └── ProtectedRoute.jsx# Auth & role route guard
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # Global user auth state
│   │   ├── utils/
│   │   │   └── civicKnowledge.js # Municipal NLP intent engine, SLAs & helplines
│   │   ├── pages/
│   │   │   ├── Home.jsx          # City GIS map & filterable issue feed
│   │   │   ├── Login.jsx         # Sign in with 1-click viva demo credentials
│   │   │   ├── Register.jsx      # Citizen & Official registration
│   │   │   ├── ReportIssue.jsx   # Form with map picker & image upload
│   │   │   ├── IssueDetails.jsx  # Audit timeline & resolution notes
│   │   │   ├── MyReports.jsx     # Personal grievance tracking
│   │   │   └── AdminDashboard.jsx# Department officer triage & analytics
│   │   ├── services/
│   │   │   └── api.js            # Axios client with JWT interceptor
│   │   ├── App.jsx               # Routes setup & global CivicBot mounting
│   │   ├── index.css             # Cohesive modern styling & CivicBot UI
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
└── package.json                  # Root scripts runner
```

---

## 🚀 4. How to Run Locally

### Step 1: Open Directory
```bash
cd d:\fsd
```

### Step 2: Configure Environment Variables
Verify or edit `backend/.env`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/civictrack
JWT_SECRET=civictrack_secret_key_student_project_2026
JWT_EXPIRE=30d
CLIENT_URL=http://localhost:5173
```
*(You can use local MongoDB or paste your free MongoDB Atlas URI).*

### Step 3: Seed Realistic Demo Data (Recommended for Viva)
```bash
npm run seed --prefix backend
```

### Step 4: Run the Backend Server
```bash
npm run dev --prefix backend
# Server runs on: http://localhost:5000
# Health check: http://localhost:5000/api/health
```

### Step 5: Run the Frontend Client
In a new terminal:
```bash
npm run dev --prefix frontend
# Client runs on: http://localhost:5173
```

---

## 🔑 5. Pre-Configured Demo Credentials (1-Click in Login UI)

| Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Citizen** | `citizen@civictrack.org` | `password123` | Report issues, upvote, track *My Reports* |
| **Roads Officer** | `roads@civictrack.org` | `password123` | Roads department triage & status updates |
| **Water Officer** | `water@civictrack.org` | `password123` | Water supply complaint management |
| **Waste Officer** | `waste@civictrack.org` | `password123` | Sanitation and garbage route triage |
| **Super Admin** | `admin@civictrack.org` | `password123` | System-wide analytics & department reassignment |

---

## 🎓 6. Academic Viva / Defense Talking Points
1. **Why Leaflet instead of Google Maps API?**
   - Leaflet with OpenStreetMap tiles is open-source, requires zero API keys or credit card registration, and works reliably in educational environments.
2. **How does the Status Audit Timeline ensure transparency?**
   - Each state transition (`Pending` -> `In Progress` -> `Resolved`) is saved as an embedded sub-document array with the official's user ID, timestamp, and action note, creating an audit trail.
3. **Clean Code Separation:**
   - Routes define endpoints and apply auth middleware.
   - Controllers handle business logic and database queries.
   - Models encapsulate Mongoose schemas and pre-save hooks.
4. **CivicBot Voice & Municipal Triage Engine:**
   - Employs browser-native Web Speech API (`SpeechRecognition` + `SpeechSynthesis`), requiring zero external cloud subscription costs or API keys.
   - Deterministic keyword and intent classification reliably categorizes complaints and pre-fills the grievance submission form with suggested priorities and department routing.
