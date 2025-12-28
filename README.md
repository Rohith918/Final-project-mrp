# [HSU Portal · Student Dashboard Overview] (https://final-project-mrp.vercel.app/)

Modern, multi-tenant academic portal inspired by the original [Figma exploration](https://www.figma.com/design/KnNgjCrnMCuvXdZgH18AgR/Student-Dashboard-Overview). The app ships role-aware dashboards for students, teachers, parents, and administrators on top of Supabase auth/data, Tailwind CSS v4 theming, and shadcn/Radix UI primitives.

---

## Tech Stack

- **Frontend**: React 18 + TypeScript, React Router DOM, React Hook Form, Lucide icons, Recharts visualizations
- **Tooling**: Vite 6 (React SWC plugin), hot reload dev server, build output in `build/` (see `vite.config.ts`)
- **Styling**: Tailwind CSS v4 (vanilla CSS version) + custom CSS variables (`src/index.css`, `src/styles/globals.css`)
- **UI Kit**: shadcn/ui components backed by Radix primitives (`src/components/ui/*`) and Sonner toasts
- **Data & Auth**: Supabase JS v2 client for authentication + CRUD helpers (`src/lib/supabaseClient.ts`, `src/lib/api.ts`)
- **State & Utilities**: Context-based auth provider, lightweight in-memory store (`src/lib/store.ts`), attendance utilities, UUID helpers

---

## Project Structure

```text
.
├── src
│   ├── App.tsx                 # Route declarations + protected routing
│   ├── main.tsx                # React entry point
│   ├── index.css               # Tailwind v4 layer + tokens
│   ├── styles/globals.css      # Additional design tokens (light/dark, sidebar)
│   ├── components
│   │   ├── DashboardLayout.tsx # Shell that mounts Sidebar + routed content
│   │   ├── Sidebar.tsx         # Role-aware navigation + profile panel
│   │   └── ui/*                # shadcn/Radix component wrappers (Button, Card, Dialog, ...)
│   ├── pages                   # Route-level experiences per persona (Student*, Teacher*, Parent*, Admin*)
│   ├── lib
│   │   ├── authContext.tsx     # Supabase-backed AuthProvider + hooks
│   │   ├── api.ts              # Typed data-access helpers + CRUD wrappers
│   │   ├── supabaseClient.ts   # Client bootstrap that validates env vars
│   │   ├── store.ts            # In-memory cache seeded from Supabase for mutations
│   │   ├── attendanceUtils.ts  # KPI helpers used across dashboards
│   │   └── mockData.ts         # Static fixtures for demos/seeding
│   ├── types/index.ts          # Role, course, attendance, finance, etc. typings
│   └── guidelines/Guidelines.md# Space for team-specific rules
├── build/                      # Latest Vite build output (safe to regenerate)
├── public/index.html           # (via Vite) root HTML shell
├── package.json / lock         # Dependencies + scripts
├── vite.config.ts              # Aliases, SWC plugin, dev server config, build outDir
└── vercel.json                 # Default deployment recipe (build → `build/`)
```

> See `src/Attributions.md` for upstream credit requirements when publishing design assets.

---

## Core Functionality

### Authentication & Access Control
- Email/password login and registration via Supabase Auth (`AuthProvider`).
- Profile provisioning via `ensureProfile` ensures every authenticated user has a row in `Users`, plus a student scaffold.
- `ProtectedRoute` gate + `DashboardRouter` automatically redirect each role to the correct home page.
- Context exposes `login`, `register`, `logout`, `user`, `loading`, enabling any screen to enforce auth.

### Student Experience
- Dashboard KPIs: GPA card, attendance %, upcoming events, finance dues, recent grades, announcements.
- Deep-link pages for Courses, Results, Finance, Attendance, Events, Announcements, and profile Settings.
- Attendance and finance widgets reuse helpers from `lib/attendanceUtils` and `lib/api`.

### Teacher Experience
- Teacher dashboard aggregates assigned courses, class rosters, upcoming lessons, grading backlog, and announcements.
- Management pages for Lessons, Exams/Assignments, Grades, Attendance, and student rosters (TeacherStudents).
- `getLessons`, `getGradesByCourseIds`, and `store.ts` helpers power lesson/assessment creation flows.

### Parent Experience
- Parent dashboard highlights household-wide attendance, GPA, finance alerts, and announcements.
- Dedicated pages for viewing Children and Performance analytics, plus shared Events/Announcements.

### Admin Experience
- Admin dashboard summarises platform-wide KPIs.
- Management views for Users, Classes, Courses, Finance, and Reports leverage the `TABLES` constant.
- Extra sidebar links (`/admin/courses`, `/admin/finance`) appear only for the admin role.

### Shared UI/UX
- `DashboardLayout` + `Sidebar` provide a responsive shell with role-specific navigation.
- Radix-based components ensure consistent theming, focus management, and keyboard support.
- Toast feedback supplied through `components/ui/sonner`.
- Tailwind tokens define both light/dark palettes and sidebar-specific colors for consistent branding.

---

## Data & Integrations

- **Supabase Tables** referenced in `src/lib/api.ts`: `Users`, `Students`, `Teachers`, `Parents`, `Courses`, `Lessons`, `Grades`, `Attendance`, `Announcements`, `Events`, `Finance`. Provision matching schemas in your project (UUID primary keys, sensible indexes on `studentId`, `teacherId`, `courseId`, etc.).
- **Environment variables** (defined at build time):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  Missing values throw immediately inside `supabaseClient.ts` to avoid silent failures.
- `lib/store.ts` bootstraps by fetching all tables once (useful for optimistic UI after mutations). `mockData.ts` offers ready-made fixtures if you need to seed Supabase or prototype without a backend.
- `attendanceUtils.ts` centralizes KPI math to keep dashboards consistent (overall rate, per-course grouping).

---

## Development Workflow

### Prerequisites
- Node.js ≥ 18 (required by Vite 6 + SWC)
- npm ≥ 9 (ships with Node 18) or pnpm/yarn if you adapt the scripts

### Installation
```bash
npm install
```

### Environment Setup
Create a `.env` (or `.env.local`) at the project root with:
```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
# Optional dev server overrides:
# HOST=0.0.0.0
# PORT=4000
# OPEN_BROWSER=false
```

### Run & Build
```bash
# Start Vite dev server (defaults to localhost:3000 and opens your browser)
npm run dev

# Production build (emits static assets to ./build)
npm run build
```

The repository already contains a `build/` folder so designers/stakeholders can review without rebuilding; feel free to regenerate or clean it as needed. `vercel.json` instructs Vercel (or any static host) to run `npm run build` and serve the `build/` directory.

---

## Extending the App

- **New routes/pages**: Add components under `src/pages`, wire them up in `src/App.tsx`, and (optionally) expose them in the `roleNavItems` map inside `Sidebar.tsx`.
- **Shared components**: Prefer the existing shadcn primitives in `src/components/ui`. Utilities like `cn` and `class-variance-authority` variants keep styling consistent.
- **Theme tweaks**: Update design tokens in `src/index.css` or `src/styles/globals.css` to propagate colors/typography everywhere.
- **Guidelines**: Use `src/guidelines/Guidelines.md` to document team conventions, and keep `src/Attributions.md` up to date when importing third-party art or data.

---

## Deployment Checklist

1. Confirm Supabase tables exist and contain seed data for each role (student, teacher, parent, admin).
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your hosting provider.
3. Run `npm run build` and deploy the contents of `build/`.
4. (Optional) Use the existing `vercel.json` for turnkey Vercel deployments.

---

