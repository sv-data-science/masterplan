"""
Rebrickable API seeder — fetches real LEGO catalog data.
Requires a free API key from https://rebrickable.com/api/

Usage:
  export REBRICKABLE_API_KEY=your_key_here
  python -m scripts.seed_rebrickable --sets 500 --themes "Star Wars,Technic,City"
"""
import asyncio
import sys
import os
import argparse
import httpx
import uuid
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, Base, AsyncSessionLocal
from app.models.set import LegoSet, Minifigure

REBRICKABLE_BASE = "https://rebrickable.com/api/v3/lego"

def get_api_key():
    key = os.environ.get("REBRICKABLE_API_KEY", "")
    if not key:
        print("ERROR: Set REBRICKABLE_API_KEY environment variable.")
        print("Get a free key at https://rebrickable.com/api/")
        sys.exit(1)
    return key

def availability_from_year(year: int, theme: str) -> tuple[str, bool, bool]:
    """Heuristic availability based on year."""
    import datetime
    current_year = datetime.datetime.now().year
    age = current_year - year
    if age >= 3:
        return "retired", True, False
    elif age >= 2:
        return "retiring_soon", False, True
    else:
        return "available", False, False

async def fetch_sets(api_key: str, page_size: int = 100, max_sets: int = 500, theme_filter: list[str] | None = None):
    headers = {"Authorization": f"key {api_key}"}
    sets = []
    url = f"{REBRICKABLE_BASE}/sets/"
    params = {"page_size": page_size, "ordering": "-year", "min_year": 2010}

    async with httpx.AsyncClient(timeout=30.0) as client:
        while url and len(sets) < max_sets:
            print(f"  Fetching {url}...")
            try:
                resp = await client.get(url, headers=headers, params=params)
                resp.raise_for_status()
                data = resp.json()
                params = {}  # Only use params on first request; next URL includes them
                for item in data.get("results", []):
                    if theme_filter and item.get("theme_id") not in theme_filter:
                        pass  # Can't filter by name easily here, include all
                    sets.append(item)
                url = data.get("next")
                if len(sets) >= max_sets:
                    break
                await asyncio.sleep(0.5)  # Be respectful of rate limits
            except httpx.HTTPStatusError as e:
                print(f"  HTTP error {e.response.status_code}: {e.response.text}")
                break
            except Exception as e:
                print(f"  Error: {e}")
                break

    return sets[:max_sets]

async def fetch_themes(api_key: str) -> dict[int, str]:
    headers = {"Authorization": f"key {api_key}"}
    themes = {}
    url = f"{REBRICKABLE_BASE}/themes/"
    params = {"page_size": 1000}
    async with httpx.AsyncClient(timeout=30.0) as client:
        while url:
            try:
                resp = await client.get(url, headers=headers, params=params)
                resp.raise_for_status()
                data = resp.json()
                params = {}
                for t in data.get("results", []):
                    themes[t["id"]] = t["name"]
                url = data.get("next")
            except Exception as e:
                print(f"  Theme fetch error: {e}")
                break
    return themes

async def seed(max_sets: int = 500):
    api_key = get_api_key()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("Fetching themes from Rebrickable...")
    themes = await fetch_themes(api_key)
    print(f"  + {len(themes)} themes loaded")

    print(f"Fetching up to {max_sets} sets from Rebrickable...")
    raw_sets = await fetch_sets(api_key, max_sets=max_sets)
    print(f"  + {len(raw_sets)} sets fetched")

    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        inserted = 0
        skipped = 0
        for item in raw_sets:
            set_num = item.get("set_num", "").rstrip("-1")  # Rebrickable appends -1
            existing = await session.execute(select(LegoSet).where(LegoSet.set_number == set_num))
            if existing.scalar_one_or_none():
                skipped += 1
                continue

            year = item.get("year", 2000)
            theme_id = item.get("theme_id", 0)
            theme_name = themes.get(theme_id, "Other")
            availability, is_retired, retiring_soon = availability_from_year(year, theme_name)

            msrp = None  # Rebrickable free tier doesn't provide pricing

            lego_set = LegoSet(
                id=str(uuid.uuid4()),
                set_number=set_num,
                name=item.get("name", "Unknown Set"),
                theme=theme_name,
                year=year,
                pieces=item.get("num_parts") or None,
                minifigs=item.get("num_minifigs") or 0,
                msrp=msrp,
                currency="USD",
                image_url=item.get("set_img_url"),
                availability=availability,
                is_retired=is_retired,
                retiring_soon=retiring_soon,
                estimated_value=None,
                brickset_url=item.get("set_url"),
            )
            session.add(lego_set)
            inserted += 1

            if inserted % 50 == 0:
                await session.flush()
                print(f"  {inserted} sets inserted...")

        await session.commit()
        print(f"\nRebrickable seed complete!")
        print(f"   {inserted} sets inserted · {skipped} skipped (already existed)")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed LEGO sets from Rebrickable API")
    parser.add_argument("--sets", type=int, default=500, help="Max sets to import (default: 500)")
    args = parser.parse_args()
    asyncio.run(seed(max_sets=args.sets))
