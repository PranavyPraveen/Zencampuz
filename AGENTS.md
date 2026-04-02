# AGENTS.md

## Project
ZencampuZ - Intelligent Campus OS

## Stack
- Frontend: React + Vite + Tailwind + React Router + Axios
- Backend: Django + Django REST Framework
- Database: PostgreSQL
- Auth: JWT

## Architecture
- Multi-tenant system
- Tenant → Multiple Campuses → Departments → Users
- Role-based access control (RBAC)

## Roles
- Super Admin (platform level)
- Tenant Admin (institution level)
- Campus Admin (campus level)
- Faculty / Student / Others (user level)

## Core Rules

- Always respect tenant isolation (no cross-tenant data)
- Always respect campus mapping where applicable
- Do NOT break existing functionality for other roles when modifying one role
- Changes must be scoped only to the requested module/role
- Do NOT rename or refactor unrelated files
- Do NOT regenerate entire modules unless explicitly asked
- Keep backend and frontend in sync

## Data & Filtering Rules

- Data must be correctly mapped to:
  - tenant
  - campus
  - department
- Fix issues at backend level if mapping is wrong (do NOT hack in frontend)

## UI Rules

- Do not leave broken routes (404 / 403)
- Do not leave blank pages
- Remove dead buttons if feature is removed
- If UI element exists → it must work

## Permissions

- Do NOT rely only on frontend hiding
- Always enforce permissions in backend as well

## Response Rules

When implementing changes:
- Return ONLY changed files
- Do NOT include unchanged code
- Do NOT explain unless asked
- Keep response clean and minimal
