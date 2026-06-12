# Deploying World Cup 2026 Predictor

Two services: **backend** (Railway) + **frontend** (Vercel). ~5 min setup.

---

## Backend → Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select this repo (`sv-data-science/masterplan`)
3. **Add a PostgreSQL** database service (click `+ New` → Database → PostgreSQL)
4. **Add a backend** service (click `+ New` → GitHub Repo → same repo)
   - In service settings → **Root Directory** → set to `worldcup/backend`
   - Railway will auto-detect the `Dockerfile` and pick up `railway.toml` automatically
5. Set environment variables on the backend service:
   ```
   DATABASE_URL        = <copy from the PostgreSQL service's DATABASE_URL variable>
   SECRET_KEY          = <random long string>
   ADMIN_SECRET        = <password you'll use to promote admins>
   CORS_ORIGINS        = ["https://your-vercel-app.vercel.app"]
   FOOTBALL_DATA_API_KEY = <your key from football-data.org — free signup>
   SYNC_INTERVAL_MINUTES = 5
   ```
6. Deploy. The `/health` endpoint confirms it's up.

---

## Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import this repo
2. In **Configure Project**:
   - **Root Directory** → `worldcup/frontend`
   - Framework: Next.js (auto-detected)
3. Set environment variable:
   ```
   NEXT_PUBLIC_API_URL = https://your-railway-backend.up.railway.app
   ```
4. Deploy.

---

## Getting a football-data.org API key (free)

1. Sign up at [football-data.org](https://www.football-data.org/client/register)
2. Check your email for the API key
3. Add it as `FOOTBALL_DATA_API_KEY` in Railway
4. The backend will auto-sync every 5 minutes during the tournament

---

## First-time setup

1. Open your Vercel URL and click **Sign up**
2. The **first registered user is automatically admin**
3. Share the URL with friends — they sign up and start predicting!
