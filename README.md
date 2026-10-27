# Mining ERP — Backend

Node.js + Express + PostgreSQL (via Prisma) REST API. See the repository root
`README.md` and `docs/` folder for full setup instructions, architecture notes, and
the complete API reference.

## Quick start

```bash
cp .env.example .env   # edit DATABASE_URL and JWT secrets
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

API listens on `http://localhost:5000`. Health check: `GET /api/v1/health`.

## Scripts

- `npm run dev` — start with nodemon
- `npm start` — start (production)
- `npm run seed` — seed permissions, default roles, master data, Super Admin
- `npm run prisma:studio` — visual database browser
- `npm run prisma:migrate` / `prisma:deploy` — dev vs. production migrations
