# BrickVault – LEGO Collection Companion

> **Disclaimer:** BrickVault is an unofficial LEGO fan application. It is NOT affiliated with, endorsed by, or connected to the LEGO Group, BrickLink, or any official LEGO entity. LEGO® is a registered trademark of the LEGO Group. This app is not a marketplace.

A modern cross-platform app for LEGO collectors to track their collections, discover sets, earn achievements, and connect with the community.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Python FastAPI, SQLAlchemy (async) |
| Database | PostgreSQL 16 |
| Auth | JWT (python-jose) |
| State | Zustand + React Query |

## Quick Start

### With Docker Compose

```bash
docker compose up
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Manual Setup

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # edit DATABASE_URL
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.local.example .env.local  # set NEXT_PUBLIC_API_URL
npm run dev
```

## Features

- **Collection Tracker** – Mark sets as Owned / Wishlist / Previously Owned
- **Set Catalog** – Browse 10,000+ LEGO sets with search & filters
- **Gamification** – XP, levels, achievements, and leaderboards
- **Collector Archetypes** – Discover your collector identity
- **MOCs & Fan Creations** – Share original builds with the community
- **Collection Valuation** – Estimate secondary market value
- **Privacy Controls** – Full control over what you share

## Project Structure

```
brickvault/
├── frontend/          # Next.js app
│   └── src/
│       ├── app/       # App Router pages
│       ├── components/
│       ├── lib/       # API client, utilities
│       ├── store/     # Zustand state
│       └── types/     # TypeScript types
├── backend/           # FastAPI app
│   └── app/
│       ├── api/       # Route handlers
│       ├── models/    # SQLAlchemy models
│       ├── schemas/   # Pydantic schemas
│       └── auth.py    # JWT authentication
└── docker-compose.yml
```
