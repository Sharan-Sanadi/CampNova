# 🏛️ CampusOS AI — The Intelligence Layer for Autonomous Campuses

> **An AI-native operating system that transforms fragmented higher-education operations into real-time, predictive intelligence.**  
> *Built with React 19, TanStack Start, Three.js (WebGL), Zustand, and TailwindCSS v4.*

---

## 🌟 Executive Summary

Modern higher-education campuses manage hundreds of facilities, thousands of hours of equipment, and dense scheduling demands across competing departments. Legacy booking systems are passive databases—they don't resolve conflicts, optimize utilization, or forecast bottleneck trends.

**CampusOS AI** bridges this gap by serving as a central intelligence layer. It analyzes resource availability in real time, predicts scheduling pressure before conflicts happen, and enables natural-language facility management through an interactive **AI Copilot**.

Designed with **enterprise SaaS aesthetics**, **production-grade state management**, and a **custom GPU-accelerated WebGL spatial interface**, CampusOS AI demonstrates modern full-stack web engineering best practices.

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
| **Language** | **TypeScript 5.8 (Strict)** | End-to-end type safety across route context, mock schemas, and components |
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
│   ├── components/         # Modular UI & Feature Components
│   │   ├── campusos/
│   │   │   ├── bookings/   # Smart booking forms & schedule boards
│   │   │   ├── copilot/    # AI reasoning trace & candidate cards
│   │   │   ├── dashboard/  # Command center widgets & live feeds
│   │   │   ├── intelligence/# Signal feeds & prediction cards
│   │   │   ├── layout/     # AppShell, brand sidebar, theme toggle
│   │   │   ├── resources/  # Resource cards & reserve dialogs
│   │   │   └── spatial/    # 3D spatial layer primitives
│   │   └── ui/             # Radix UI primitives & Shadcn design tokens
│   ├── data/               # Business Logic, Rules & Intelligence Engines
│   │   ├── bookingEngine.ts# Conflict detection & 5-rule validation logic
│   │   ├── campus.ts       # Central campus state & reactive store
│   │   ├── copilot.ts      # Natural language query parsing engine
│   │   ├── intelligence.ts # Anomaly detection & prediction models
│   │   └── resources.ts    # Resource fleet matching & scoring
│   ├── experience/         # 3D WebGL Spatial Layer (Three.js / R3F)
│   │   ├── components/     # Camera rigs, data pathways, particle fields
│   │   ├── shaders/        # Custom GLSL procedural shaders
│   │   ├── spatial/        # Multi-layer spatial stage architecture
│   │   └── store.ts        # Quality tier detection & spatial state
│   ├── lib/                # Shared utilities, theme bootstrap & store hooks
│   ├── routes/             # TanStack Start File-Based Route Tree
│   └── styles.css          # Core CSS variables & design tokens
├── README.md               # Project documentation
├── package.json            # Dependencies & scripts
└── vite.config.ts          # Vite & TanStack Start build configuration
```

---

## ⚡ Quick Start & Local Setup

### Prerequisites
- **Node.js** (v18.0.0 or higher recommended)
- **npm** or **bun**

### 1. Clone & Install
```bash
git clone https://github.com/Sharan-Sanadi/CampNova.git
cd CampNova
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open **`http://localhost:5173`** (or the output port, e.g. `http://localhost:8082`) in your browser.

### 3. Build & Type Check
```bash
# Type check TypeScript without emitting files
npx tsc --noEmit

# Production build bundle
npm run build
```

---

## 🛡️ Engineering Best Practices Implemented

- ✅ **Strict Memory Leak Prevention**: Event listeners and animation timers cleaned up on component unmount.
- ✅ **Zero Flash of Unstyled Theme**: Inline theme bootstrap script prevents light/dark mode flash during hydration.
- ✅ **Component Decoupling**: Business logic and rule evaluations separated into modular service functions.
- ✅ **Clean Code & Zero Lints**: Strict TypeScript compilation with clean AST output.

---

## 👤 Author & Contact

**Sharan Sanadi**  
- **GitHub**: [@Sharan-Sanadi](https://github.com/Sharan-Sanadi)  
- **Repository**: [CampNova Project](https://github.com/Sharan-Sanadi/CampNova)

---
*Built with precision for scalable enterprise SaaS operations.*
