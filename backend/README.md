# Inventory MVP (Admin + Barback) — Railway + Postgres

## What this MVP does
- Shared database (works across devices)
- Login with PIN
- Roles: ADMIN and BARBACK
- Barback can submit events (REQUEST / DELIVERED / RETURNED) by barcode/sku
- Admin can view and approve/reject events
- Admin can manage items/bars/stations/users (basic)

## Environment Variables (Railway)
- DATABASE_URL=postgres connection string (Railway provides this)
- JWT_SECRET=some-long-random-string
- APP_ORIGIN=https://<your-domain> (optional; allows CORS)
- NODE_ENV=production

## Local run
1) `npm i`
2) Create `.env` with DATABASE_URL + JWT_SECRET
3) `npm run migrate`
4) `npm start`
Open http://localhost:8080

## Railway
- Create service from GitHub
- Add Postgres plugin
- Set env vars above
- Deploy
- Run `npm run migrate` once from Railway shell (or as pre-deploy command)
