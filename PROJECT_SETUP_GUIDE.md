# Elira Event Platform - Project Setup Guide

## Project Structure

**IMPORTANT:** This is a **Single Project** setup - NOT a monorepo with separate backend and frontend folders.

```
elira-event-platform/
├── src/
│   ├── app/              # Next.js App Router (frontend pages + API routes)
│   │   ├── page.tsx      # Homepage
│   │   ├── login/        # Auth pages
│   │   ├── api/          # Backend API endpoints
│   │   ├── admin/        # Admin dashboard pages
│   │   ├── dashboard/    # Organizer dashboard pages
│   │   └── events/       # Event management pages
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and helpers
│   └── middleware.ts     # Auth middleware
├── public/               # Static assets
├── supabase/             # Supabase migrations and config
└── package.json          # Project dependencies
```

## How This Project Works

This is a **fullstack Next.js application** where:

- **Frontend:** React components in `/src/app` pages
- **Backend:** Node.js API routes in `/src/app/api/`
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth + custom JWT validation
- **One Command to Run Everything:** `npm run dev`

## Running the Project

### Single Command (Recommended)

```bash
# Start everything with one command
npm run dev
```

This automatically:
- Starts the Next.js dev server on port 3000 (or 3002 in preview)
- Watches for file changes
- Provides hot module reloading (HMR)
- Serves both frontend pages and backend API endpoints

### What You Get

```
✓ Frontend running: http://localhost:3000
✓ Backend API running: http://localhost:3000/api/*
✓ Supabase connection: Active via environment variables
✓ Hot reload: Enabled for all changes
```

## Project Architecture Diagram

```
User Browser
     ↓
Next.js Frontend (React)
     ↓
API Routes (Backend) → Supabase Database
     ↓
Authentication via Supabase
```

## Key Differences from Traditional Backend/Frontend Split

| Traditional Approach | This Project |
|--|--|
| Separate backend folder | All in `/src/app` |
| Run backend + frontend separately | Single `npm run dev` |
| Different ports (5000 backend, 3000 frontend) | Single port (3000 or 3002) |
| CORS configuration needed | No CORS needed (same origin) |
| Deploy backend and frontend separately | Deploy as single Next.js app |

## First Time Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create environment file** (already done in `.env.development.local`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

3. **Create super admin user:**
   ```bash
   node scripts/create-super-admin.mjs --email admin@example.com --password YourPassword123
   ```

4. **Start the dev server:**
   ```bash
   npm run dev
   ```

5. **Login at http://localhost:3000/login**

## Project Pages & Routes

### Frontend Pages (in `src/app/`)
- `/` - Landing page
- `/login` - Login page
- `/signup` - Sign up page
- `/admin` - Super admin dashboard
- `/dashboard` - Organizer dashboard
- `/events/[id]/register` - Registration staff pages
- `/events/[id]/scan` - Catering staff meal scanning
- `/events/[id]/payments` - Finance team payments

### Backend API Endpoints (in `src/app/api/`)
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/signup` - Create new account
- `GET /api/events` - List events
- `POST /api/events` - Create event
- And 25+ more endpoints

## Environment Variables

The project uses these environment variables (already configured):

```
NEXT_PUBLIC_SUPABASE_URL        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Supabase anonymous key
```

These are auto-loaded from `.env.development.local` when you run `npm run dev`.

## Building for Production

```bash
# Build the Next.js app
npm run build

# Start production server
npm start
```

This creates an optimized production build of both frontend and backend.

## Debugging

- **Browser DevTools:** Press F12 to see console logs and network requests
- **API Requests:** Check the Network tab to see all `/api/*` calls
- **Server Logs:** Check terminal output from `npm run dev`
- **Add Debug Logs:** Use `console.log("[v0] message")` in any file

## Technology Stack

- **Frontend Framework:** Next.js 14 (React)
- **Styling:** Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth + JWT
- **Real-time:** Service Worker for offline support

## Common Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Check code quality
```

## When You See Errors

1. **"Cannot find module"** → Run `npm install`
2. **Port already in use** → Change port with `PORT=3001 npm run dev`
3. **Database connection error** → Check Supabase credentials in `.env.development.local`
4. **Auth failing** → Make sure you've created a super admin with the setup script

## Summary

**You only need to run ONE command:**
```bash
npm run dev
```

Everything runs in one process - frontend, backend, and database connection all together. No need to open multiple terminals or worry about separate services.

