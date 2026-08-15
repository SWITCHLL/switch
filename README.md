# SWITCH

> The modern booking and commerce platform — events, flights, hotels, cinema, and beyond.

## Stack

| Layer     | Technology                  |
| --------- | --------------------------- |
| Framework | Next.js 16 (App Router)     |
| Language  | TypeScript 5 (strict)       |
| UI        | React 19                    |
| Styling   | Tailwind CSS v4 + shadcn/ui |
| Animation | Framer Motion               |
| State     | TanStack Query v5           |
| Forms     | React Hook Form + Zod       |
| ORM       | Prisma v7 (PostgreSQL)      |
| Auth      | Auth.js v5 (next-auth@beta) |
| Queue     | BullMQ + Redis (ioredis)    |
| Email     | Resend                      |
| Icons     | Lucide React                |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
# Edit .env.local and fill in all values
```

### 3. Set up the database

```bash
# Push schema to your PostgreSQL database
npm run db:push

# Or run migrations (recommended for production)
npm run db:migrate
```

### 4. Generate Prisma client

```bash
npm run db:generate
```

### 5. Start the dev server

```bash
npm run dev
# → http://localhost:3000
```

---

## Project Structure

```
switch/
├── app/                      # Next.js App Router
│   ├── (marketing)/          # Public pages (home, about, etc.)
│   ├── (dashboard)/          # Authenticated app pages
│   ├── api/                  # Route handlers
│   │   ├── auth/[...nextauth]/ # Auth.js handler
│   │   └── health/           # Health check endpoint
│   ├── error.tsx             # Route-level error boundary
│   ├── global-error.tsx      # Root layout error boundary
│   ├── loading.tsx           # Root loading UI
│   ├── not-found.tsx         # 404 page
│   └── layout.tsx            # Root layout (fonts, metadata, providers)
│
├── components/
│   ├── ui/                   # Base design system components (shadcn/ui)
│   ├── layout/               # Site-wide layout (header, footer, sidebar)
│   ├── sections/             # Page-level sections (hero, features, cta)
│   └── shared/               # Cross-cutting components (ThemeToggle, etc.)
│
├── features/                 # Domain feature modules (DDD)
│   ├── auth/                 # Authentication
│   ├── users/                # User profiles
│   ├── organizers/           # Event organizers
│   ├── events/               # Event listings
│   ├── tickets/              # Ticket booking
│   ├── payments/             # Payment processing
│   ├── notifications/        # Push/email notifications
│   └── admin/                # Admin dashboard
│
├── lib/                      # Shared library code
│   ├── auth.ts               # Auth.js config
│   ├── prisma.ts             # Prisma client singleton
│   ├── redis.ts              # ioredis singleton
│   └── utils.ts              # cn() and other helpers
│
├── providers/                # React context providers
│   ├── query-provider.tsx    # TanStack Query
│   ├── theme-provider.tsx    # next-themes (dark mode)
│   └── index.tsx             # Composed providers root
│
├── config/
│   ├── env.ts                # Zod environment validation
│   └── site.ts               # Site-wide config (name, nav, SEO)
│
├── types/                    # Global TypeScript types
├── constants/                # App-wide constants
├── utils/                    # Pure utility functions (format.ts, etc.)
├── hooks/                    # Custom React hooks
├── services/                 # External API service wrappers
├── emails/                   # Resend email templates
├── workers/                  # BullMQ worker processes
└── prisma/
    ├── schema.prisma         # Database schema
    └── migrations/           # Migration history
```

---

## Architecture

SWITCH follows a **Modular Monolith** with **Domain-Driven Design** principles:

- Each domain lives in `features/<domain>/` and exposes a public API via `index.ts`
- Cross-domain imports go through the public API only — never into internals
- Server Components are the default; `'use client'` is added only where interactivity is needed
- Data fetching uses React Server Components + TanStack Query for client-side cache management

### Feature module anatomy

```
features/events/
├── index.ts          # Public API (re-exports)
├── types.ts          # Domain types
├── schemas.ts        # Zod validation schemas
├── actions.ts        # Server Actions
├── queries.ts        # Data fetching (server)
├── hooks.ts          # TanStack Query hooks (client)
└── components/       # Feature-specific UI
```

---

## Available Scripts

| Script                    | Description                    |
| ------------------------- | ------------------------------ |
| `npm run dev`             | Start dev server (Turbopack)   |
| `npm run build`           | Production build               |
| `npm run start`           | Start production server        |
| `npm run lint`            | Run ESLint                     |
| `npm run lint:fix`        | Fix ESLint errors              |
| `npm run format`          | Format with Prettier           |
| `npm run type-check`      | TypeScript type check          |
| `npm run db:generate`     | Generate Prisma client         |
| `npm run db:migrate`      | Run DB migrations (dev)        |
| `npm run db:migrate:prod` | Run DB migrations (prod)       |
| `npm run db:push`         | Push schema without migrations |
| `npm run db:studio`       | Open Prisma Studio             |

---

## Environment Variables

See `.env.example` for all required variables. Key ones:

```bash
DATABASE_URL       # PostgreSQL connection string
AUTH_SECRET        # Random 32+ char string (openssl rand -base64 32)
REDIS_URL          # Redis connection string
RESEND_API_KEY     # Resend API key (re_...)
```

---

## Design System

The design system is defined in `app/globals.css` using Tailwind CSS v4's `@theme` directive.

**Theme:** Dark-first with system preference fallback  
**Primary:** Indigo (`--color-brand-*`)  
**Secondary:** Violet (`--color-secondary-*`)  
**Accent:** Cyan (`--color-accent-*`)

**Utility classes:**

- `.glass` — glassmorphism card
- `.gradient-text` — indigo → violet → cyan gradient text
- `.glow-indigo / .glow-violet / .glow-cyan` — soft glow shadows
- `.gradient-border` — animated gradient border on hover
- `.noise` — subtle noise texture overlay

---

## Git Conventions

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add event listing page
fix: correct seat count calculation
docs: update README setup steps
chore: upgrade dependencies
```

Enforced by Commitlint + Husky pre-commit hook.

---

## Roadmap

- [x] Foundation scaffold
- [ ] Event listing + detail pages
- [ ] Seat selection UI
- [ ] Checkout flow
- [ ] Auth (sign up / sign in)
- [ ] Organizer dashboard
- [ ] Admin panel
- [ ] Email notifications
- [ ] Flights module
- [ ] Hotels module
