# 🏛️ CampusOS AI — The Intelligence Layer for Autonomous Campuses

> **An AI-native operating system that transforms fragmented higher-education operations into real-time, predictive intelligence.**  
> *Built with React 19, TanStack Start, Three.js (WebGL), Zustand, and TailwindCSS v4.*

---

## 🌟 Executive Summary

Modern higher-education campuses manage hundreds of facilities, thousands of hours of equipment, and dense scheduling demands across competing departments. Legacy booking systems are passive databases—they don't resolve conflicts, optimize utilization, or forecast bottleneck trends.

**CampusOS AI** bridges this gap by serving as a central intelligence layer. It analyzes resource availability in real time, predicts scheduling pressure before conflicts happen, and enables natural-language facility management through an interactive **AI Copilot**.

Designed with **enterprise SaaS aesthetics**, **Microsoft-level modular architecture**, **production-grade state management**, and a **custom GPU-accelerated WebGL spatial interface**, CampusOS AI demonstrates modern full-stack web engineering best practices.

---

## ✨ Key Features & Product Modules

### 🤖 1. AI Campus Copilot (`/copilot`)
- **Natural Language Facility Search**: Resolves queries like *"Find an available 60-seat computer lab with dual displays tomorrow at 2 PM"*.
- **Staged Reasoning Trace**: Visualizes multi-step AI reasoning (Intent Analysis → Constraints Check → Capacity Matching → Conflict Assessment → Recommendation).
- **One-Click Execution**: Instantly reserves recommended slots with simulated departmental routing.

### 📊 2. Command Center (`/dashboard`)
- **Live Campus Pulse**: Real-time operational signals including capacity headroom, active bookings, pending approvals, and conflict rates.
- **Operations Timeline**: Chronological tracking of campus-wide reservations and resource status transitions.
- **Streaming Activity Feed**: Real-time log of booking approvals, early releases, and automated AI interventions.

### 🔍 3. Resource Intelligence Engine (`/resources`)
- **Multi-Factor Scoring**: Ranks facilities based on capacity fit, equipment availability, schedule pressure, and floor location.
- **Interactive Availability Timelines**: Hour-by-hour availability heatmaps across 14-day booking horizons.
- **Resource Comparison**: Side-by-side comparison matrix for equipment and space allocation.

### ⚖️ 4. AI-Assisted Approvals Queue (`/approvals`)
- **Automated Risk Scoring**: Ranks pending requests into **Low**, **Medium**, or **High** conflict risk.
- **Policy Enforcement**: Validates 5 core campus rules (booking window, capacity limits, duration caps, equipment match, overlap checks).
- **Fast-Track Operations**: Enables campus leads to approve or re-route requests in seconds.

### 📈 5. Predictive Analytics & Intelligence (`/analytics`, `/intelligence`)
- **Utilization & Peak Demand Heatmaps**: Interactive charts tracking hourly demand spikes and underutilized facilities.
- **Proactive Anomaly Alerts**: AI-generated alerts highlighting unusual cancellation patterns and unbooked seat-hours.
- **Capacity Rebalancing**: Recommends shifting low-priority sessions from oversubscribed blocks to open wings.

### 🔐 6. Production Clerk Auth & MongoDB Datastore (`/login`, `/auth`)
- **Clerk Identity Provider**: Dual OAuth (Google) and Email + Password authentication flows with unified dark SaaS theme integration.
- **Persistent MongoDB Store**: Server-side MongoDB connection pooling (`MONGO_URI`) linking Clerk identities to persistent user profiles, resources, bookings, approvals, notifications, activity, and settings.
- **Zero Dummy Data Guarantee**: All operational metrics, charts, intelligence signals, and copilot tools query live MongoDB database state.

---

## 🎨 3D Spatial Interface Architecture

CampusOS AI features a custom **Three.js / React Three Fiber spatial layer** mounted as an architectural backdrop behind the DOM layout:

- **Demand-Driven Rendering (`frameloop="demand"`)**: Minimizes GPU battery drain by rendering animation frames only when camera positions update or transitions occur.
- **Adaptive Performance Scaling**: Dynamic DPR scaling (from `1.8x` down to `1.2x`) based on hardware concurrency and real-time frame rates.
- **Procedural GLSL Shaders**: Custom vertex and fragment shaders for particle displacement, grid animation, and glassmorphism depth.
- **Graceful WebGL Fallback**: Automatically degrades to a light CSS radial atmosphere if WebGL is unsupported or context is lost (`ContextGuard` + `SceneErrorBoundary`).

---

## 🛠️ Tech Stack & Technical Decisions

| Layer | Technology | Rationale / Key Advantage |
|-------|------------|---------------------------|
| **Framework** | **TanStack Start (Vite 8)** | SSR-ready, type-safe file routing, and zero-waterfall data loading |
| **Authentication** | **Clerk (@clerk/react)** | Production identity management, Google OAuth & Email/Password session security |
| **Database** | **MongoDB + Mongoose 8** | Server-side persistent document store with connection pooling & `clerkUserId` indexing |
| **Backend API** | **Node.js + Fastify 5** | High-throughput REST API with Clerk middleware validation & RBAC authorization |
| **Language** | **TypeScript 5.8 (Strict)** | End-to-end type safety across route context, schemas, API endpoints, and components |
| **Architecture** | **Microsoft-level Feature Modules** | Clear separation of concerns, barrel exports, shared common infrastructure |
| **UI & Styling** | **TailwindCSS v4 + Radix UI** | High-density enterprise SaaS layout tokens with full dark-mode optimization |
| **3D & Visuals** | **Three.js + R3F + GSAP** | High-performance GPU particle fields and smooth camera rigs |
| **State Management** | **Zustand + `useSyncExternalStore`** | Immutable reactive state subscription with zero un-needed re-renders |
| **Data Viz** | **Recharts** | Responsive analytics charts for peak demand and utilization trends |

---

## 📂 Repository Structure

```
CAMPNOVA/
├── public/                 # Static assets & favicon
├── src/
│   ├── app/                # Application bootstrap & entry configurations (router, server, start)
│   ├── common/             # Cross-cutting infrastructure & shared design primitives
│   │   ├── components/     # UI primitives (Radix UI / Shadcn components)
│   │   ├── constants/      # App-wide constants, breakpoints, & motion tokens
│   │   ├── hooks/          # Shared custom hooks (e.g., use-mobile)
│   │   ├── lib/            # Utilities, theme bootstrap, error boundaries
│   │   └── types/          # Centralized type exports barrel
│   ├── features/           # Modular domain features (self-contained components & services)
│   │   ├── bookings/       # Smart booking forms, schedule boards, & services
│   │   ├── copilot/        # AI reasoning trace, recommendation cards, & services
│   │   ├── dashboard/      # Command center widgets, live activity feeds, & services
│   │   ├── intelligence/   # Campus intelligence signals, predictions, & services
│   │   ├── resources/      # Resource cards, reserve dialogs, & availability timelines
│   │   └── spatial/        # Digital twin controls & spatial primitives
│   ├── experience/         # 3D WebGL Spatial Layer (Three.js / React Three Fiber)
│   │   ├── components/     # Camera rigs, data pathways, particle fields
│   │   ├── shaders/        # Custom GLSL procedural shaders
│   │   ├── spatial/        # Multi-layer spatial stage architecture
│   │   └── store.ts        # Quality tier detection & spatial state
│   ├── layout/             # Top bar, brand sidebar, theme toggle, & AppShell
│   ├── marketing/          # Public landing site components, header, & footer
│   ├── routes/             # TanStack Start file-based route tree
│   ├── shared/             # CampusOS core design system primitives
│   ├── routeTree.gen.ts    # Auto-generated TanStack Router tree
│   └── styles.css          # Design tokens & core CSS variables
├── CampusOs-finalog.zip    # Preserved version archive
├── README.md               # Project documentation
├── package.json            # Dependencies & scripts
└── vite.config.ts          # Vite & TanStack Start build configuration
```

---

---

## ⚡ Local Development Setup

Follow these steps to run the complete **CampusOS AI** application (Frontend + Fastify API + MongoDB datastore) locally on your machine.

---

### 1. Prerequisites

Before starting, ensure you have the following installed on your machine:

- **Node.js**: `v18.0.0` or higher (`node -v`)
- **npm**: Package manager included with Node.js (`npm -v`)
- **MongoDB Database**: Free MongoDB Atlas cluster OR local MongoDB instance
- **Clerk Account**: Free account at [clerk.com](https://clerk.com) for authentication

> [!NOTE]
> **Redis** (optional): Used for background queue workers and rate limiting. If Redis is unreachable, CampusOS automatically falls back to safe in-memory execution without crashing.

---

### 2. Clone the Repository

```bash
git clone https://github.com/Sharan-Sanadi/CampNova.git
cd CampNova
```

---

### 3. Install Dependencies

CampusOS uses **npm workspaces** for monorepo package management. Installing dependencies at the root installs all required packages for the frontend, API backend, and shared packages in a single step:

```bash
npm install
```

---

### 4. Environment Variables Configuration

Create your local environment file by copying `.env.example`:

**macOS / Linux:**
```bash
cp .env.example .env
```

**Windows (PowerShell or Command Prompt):**
```powershell
copy .env.example .env
```

Open `.env` in your text editor and configure the environment variables:

#### Required for Core Localhost Operation
```env
# MongoDB Atlas or local MongoDB connection string
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/campusos?retryWrites=true&w=majority

# Clerk Authentication (Get from https://dashboard.clerk.com → API Keys)
CLERK_SECRET_KEY=sk_test_...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...

# Frontend API Endpoint (Points localhost frontend to local Fastify backend)
VITE_API_URL=http://localhost:4000/api/v1
```

#### Optional / Feature-Specific Defaults
```env
# Fastify API Server Port & Host
PORT=4000
HOST=0.0.0.0

# CORS Allowed Origins
CORS_ORIGINS=http://localhost:8080

# Redis Cache (Optional for background queues)
REDIS_URL=redis://localhost:6379

# AI Copilot Provider (groq | ollama | anthropic)
COPILOT_PROVIDER=groq
GROQ_API_KEY=gsk_...
```

> 💡 **Where credentials come from:**
> - **MongoDB**: MongoDB Atlas → Database → Connect → Drivers (Copy connection string with database name `/campusos`).
> - **Clerk**: Clerk Dashboard → API Keys (Copy `Publishable key` and `Secret key`).

---

### 5. Clerk Localhost Configuration

CampusOS uses **Clerk** for production-grade authentication:

1. Enable **Email + Password** or **Google OAuth** in your Clerk project dashboard.
2. Under Clerk Dashboard → **Paths**, verify sign-in URL is set to `/login`.
3. If using Google OAuth, ensure Google is activated under **User & Authentication → Social Connections**. Email & password works out-of-the-box without extra provider setup.

---

### 6. MongoDB Persistence

CampusOS relies exclusively on **MongoDB** as its authoritative operational datastore:
- User profiles, resources, bookings, approvals, notifications, activity logs, and settings are saved directly to MongoDB.
- Refreshing the browser (`Ctrl + R`), restarting the server, or logging out and logging back in will **never** erase your created data.
- Ensure `MONGO_URI` is defined in `.env` (it remains strictly server-side and is never exposed in browser bundles).

---

### 7. Start the Backend API (Terminal 1)

In your first terminal window, start the Fastify backend server in development mode:

```bash
npm run api:dev
```

- **Backend API URL**: `http://localhost:4000`
- **REST API Base Path**: `http://localhost:4000/api/v1`
- **Health Check Probe**: `http://localhost:4000/health` (Returns `{ "status": "ok" }`)

---

### 8. Start the Frontend (Terminal 2)

In a second terminal window, start the Vite / TanStack Start frontend server:

```bash
npm run dev
```

- **Frontend Application URL**: `http://localhost:8080`

---

### 9. First Local Run Checklist

Once both terminal servers are running:

1. Open **`http://localhost:8080`** in your web browser.
2. View the public CampusOS landing page and click **Sign in** in the top navigation.
3. Sign in using your Clerk credentials (Google or Email/Password).
4. Upon authentication, you will be redirected into the **CampusOS Command Center** (`/dashboard`).
5. Navigate to **Resources** (`/resources`) and create a new facility (e.g. `CS Lab 101`).
6. Navigate to **Bookings** (`/bookings`) and reserve a time slot for your new resource.
7. Refresh your browser (`Ctrl + R`) — verify that the created resource and booking remain visible.
8. Sign out from the user menu and log back in — verify that your persisted account data returns cleanly.

---

### 10. Quick Health Check

Verify your local environment with these quick endpoints:

| Component | Target URL | Expected Status |
|-----------|------------|-----------------|
| **Frontend Web App** | `http://localhost:8080` | `200 OK` (Loads CampusOS UI) |
| **Backend API Probe** | `http://localhost:4000/health` | `200 OK` (`{ "status": "ok" }`) |
| **Backend API Root** | `http://localhost:4000/` | `200 OK` (`{ "status": "ok", ... }`) |
| **Swagger API Docs** | `http://localhost:4000/docs` | `200 OK` (Interactive API Documentation) |

---

### 11. Common Localhost Troubleshooting

#### MongoDB Connection Fails
- Verify `MONGO_URI` is correctly set in `.env`.
- If using MongoDB Atlas, check that your local IP address is whitelisted in Atlas (**Network Access → Add IP Address → Current IP**).

#### Clerk Authentication Error / Redirect Loop
- Ensure both `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are present in `.env`.
- Ensure your key begins with `pk_test_` / `sk_test_` for local development.

#### Frontend Cannot Reach Backend
- Ensure the API backend is running on `http://localhost:4000`.
- Verify `VITE_API_URL=http://localhost:4000/api/v1` is defined in `.env`.

#### Port Already in Use (`EADDRINUSE`)
- If port `4000` or `8080` is in use, stop the existing process:
  - **Windows**: `stop-process -id (get-netstat -port 4000).processid` or kill from Task Manager.
  - **macOS/Linux**: `lsof -ti:4000 | xargs kill -9`

---

### 12. Security Note

- **Never commit `.env`** to Git version control. `.gitignore` is configured to exclude local environment files.
- **Server Secrets**: Keep `MONGO_URI`, `CLERK_SECRET_KEY`, and `GROQ_API_KEY` in server-side variables. Never prefix server secrets with `VITE_`.

---

### 13. Architecture Summary

```text
Browser / CampusOS Frontend (http://localhost:8080)
        ↓ (Authorization: Bearer <clerk_jwt_token>)
Fastify REST API (http://localhost:4000/api/v1)
        ↓
MongoDB Atlas Datastore (Persistent Collections)
```

---

## 🛡️ Engineering Best Practices Implemented

- ✅ **Microsoft-Grade Codebase Structure**: Domain-driven feature layout with explicit barrel exports and layer isolation.
- ✅ **Strict Memory Leak Prevention**: Event listeners and animation timers cleaned up on component unmount.
- ✅ **Zero Flash of Unstyled Theme**: Inline theme bootstrap script prevents light/dark mode flash during hydration.
- ✅ **Component Decoupling**: Business logic and rule evaluations separated into modular service functions.
- ✅ **Clean Code & Zero Lints**: Strict TypeScript compilation with zero errors.

---

## 👤 Authors & Contributors

**Sharan Sanadi**  
- **GitHub**: [@Sharan-Sanadi](https://github.com/Sharan-Sanadi)  

**Omkar Biradarpatil**  
- **GitHub**: [@OmkarBiradarpatil](https://github.com/OmkarBiradarpatil)  

- **Repository**: [CampNova Project](https://github.com/Sharan-Sanadi/CampNova)

---

*Built with precision for scalable enterprise SaaS operations.*
