# Clicker + MVP Cloud Package

## Included
- `frontend/index.html` → Inventory Clicker UI connected to the cloud API
- `backend/` → Railway / Postgres backend (Node + Express + pg)

## Frontend behavior
- English-only app UI
- Login overlay for cloud sync
- `Local Only` fallback still works if API is unavailable
- `+ / -` item actions send events to the backend
- Bars, stations, and items load from the backend

## Backend behavior
- Roles: ADMIN, BARBACK
- Postgres-backed login and event storage
- CORS supports comma-separated `APP_ORIGIN`

## Deploy plan
### Backend (Railway)
1. Create a Railway service from the `backend` folder.
2. Add a Postgres plugin.
3. Set variables:
   - `DATABASE_URL` → Railway Postgres `DATABASE_URL`
   - `JWT_SECRET` → long random string
   - `APP_ORIGIN` → your frontend URL(s), comma-separated if needed
4. Run migration once:
   - Pre-deploy command: `npm run migrate`
   - Start command: `npm start`

### Frontend
Deploy `frontend/index.html` to:
- GitHub Pages, or
- Railway static hosting, or
- your existing Clicker frontend repo

## Important
Update `API_BASE` in `frontend/index.html` if your backend URL changes.
