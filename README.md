# simplifiedstartup-ui

Invite-only admin dashboard for Simplified Startup. Pure frontend (React + Vite +
TypeScript + Bootstrap/react-bootstrap + TanStack Query) — it holds no secrets and
talks only to `simplifiedstartup-server` (cookie sessions, CORS).

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173 — expects the server on :4000
```

Sign in with the admin the server seeded (`SEED_ADMIN_*` in the server's `.env`).
`VITE_API_URL` (see `.env.example`) points elsewhere when the API isn't local.

## House UI conventions

- **Skeletons** (Bootstrap `Placeholder`) while tables/stats load
- **Circle spinners** inside any button whose action is in flight
- **Toasts** (top-right) for success/error feedback on every mutation
- **Modals** for create/edit (invite user, lead detail)
- **Confirmation modals** for anything destructive or irreversible — delete lead/
  subscriber, revoke invite, disable user, change role

## Screens

Overview (stats) · Leads (filter/search/paginate, detail modal with status +
notes) · Subscribers (search, CSV export, remove) · Team (ADMIN only: invite with
role, resend/revoke, change role, disable/enable) · Careers (placeholder until
Phase 3) — plus login, accept-invite, forgot/reset password.

Roles come from the server (`ADMIN`, `EDITOR`, `RECRUITER`, `VIEWER`); the
sidebar and route guards follow them, and the API enforces them for real.
`src/api/types.ts` is copied from the server's `src/contracts` — keep in sync.
