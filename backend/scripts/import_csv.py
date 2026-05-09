"""
Rebrickable CSV catalog importer.

Downloads sets.csv.gz, themes.csv.gz, minifigs.csv.gz from Rebrickable's
public CDN and upserts into the database. Idempotent — safe to re-run.
Use this for both initial load and ongoing weekly refreshes to pick up
new LEGO releases and retirement status changes.

Usage:
    python -m scripts.import_csv                  # full import
    python -m scripts.import_csv --skip-minifigs  # sets only
    python -m scripts.import_csv --since 2010     # only sets from 2010+
"""
import asyncio
import argparse
import csv
import gzip
import io
import os
import sys
import datetime
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.database import engine, Base, AsyncSessionLocal
from app.models.set import LegoSet, Minifigure

CDN_BASE = "https://cdn.rebrickable.com/media/downloads"
SETS_URL = f"{CDN_BASE}/sets.csv.gz"
THEMES_URL = f"{CDN_BASE}/themes.csv.gz"
MINIFIGS_URL = f"{CDN_BASE}/minifigs.csv.gz"

CURRENT_YEAR = datetime.datetime.now().year

def availability_for(year: int) -> tuple[str, bool, bool]:
    """Heuristic: sets >2 yrs old likely retired, last year retiring soon."""
    age = CURRENT_YEAR - year
    if age >= 3:
        return "retired", True, False
    if age >= 2:
        return "retiring_soon", False, True
    return "available", False, False

async def download_csv(url: str) -> list[dict]:
    print(f"  ⬇️  {url}")
    async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    raw = gzip.decompress(resp.content).decode("utf-8")
    reader = csv.DictReader(io.StringIO(raw))
    rows = list(reader)
    print(f"     {len(rows):,} rows")
    return rows

async def import_themes() -> dict[str, str]:
    """Download themes and return {theme_id: full_name} (with parent prefix)."""
    rows = await download_csv(THEMES_URL)
    by_id = {r["id"]: r for r in rows}

    def full_name(theme_id: str) -> str:
        seen = set()
        parts = []
        cur = theme_id
        while cur and cur in by_id and cur not in seen:
            seen.add(cur)
            parts.append(by_id[cur]["name"])
            cur = by_id[cur].get("parent_id") or ""
        # Use root theme name only — keep theme labels short for UI
        return parts[-1] if parts else "Other"

    return {tid: full_name(tid) for tid in by_id}

async def import_sets(theme_lookup: dict[str, str], min_year: int = 1980) -> int:
    rows = await download_csv(SETS_URL)
    print(f"  Importing sets (min year: {min_year})...")

    inserted = 0
    updated = 0
    batch = []
    BATCH_SIZE = 500

    async with AsyncSessionLocal() as session:
        for row in rows:
            try:
                year = int(row.get("year") or 0)
            except ValueError:
                continue
            if year < min_year:
                continue

            set_num = (row.get("set_num") or "").strip()
            if not set_num:
                continue

            theme_id = (row.get("theme_id") or "").strip()
            theme = theme_lookup.get(theme_id, "Other")

            availability, is_retired, retiring_soon = availability_for(year)

            try:
                pieces = int(row.get("num_parts") or 0) or None
            except ValueError:
                pieces = None

            batch.append({
                "id": f"reb-{set_num}",
                "set_number": set_num,
                "name": (row.get("name") or "Unknown Set")[:255],
                "theme": theme[:100],
                "year": year,
                "pieces": pieces,
                "minifigs": 0,
                "currency": "USD",
                "image_url": row.get("img_url") or None,
                "availability": availability,
                "is_retired": is_retired,
                "retiring_soon": retiring_soon,
                "brickset_url": f"https://rebrickable.com/sets/{set_num}/",
            })

            if len(batch) >= BATCH_SIZE:
                ins, upd = await flush_sets(session, batch)
                inserted += ins
                updated += upd
                batch = []
                if (inserted + updated) % 5000 == 0:
                    print(f"     {inserted + updated:,} sets processed...")

        if batch:
            ins, upd = await flush_sets(session, batch)
            inserted += ins
            updated += upd

        await session.commit()

    print(f"  ✓ Sets: {inserted:,} inserted, {updated:,} updated")
    return inserted + updated

async def flush_sets(session, batch: list[dict]) -> tuple[int, int]:
    """Upsert a batch of sets, preserving msrp / estimated_value if already set."""
    stmt = pg_insert(LegoSet).values(batch)
    update_cols = {
        "name": stmt.excluded.name,
        "theme": stmt.excluded.theme,
        "year": stmt.excluded.year,
        "pieces": stmt.excluded.pieces,
        "image_url": stmt.excluded.image_url,
        "availability": stmt.excluded.availability,
        "is_retired": stmt.excluded.is_retired,
        "retiring_soon": stmt.excluded.retiring_soon,
        "brickset_url": stmt.excluded.brickset_url,
    }
    stmt = stmt.on_conflict_do_update(index_elements=["set_number"], set_=update_cols)
    result = await session.execute(stmt)
    # Postgres doesn't easily distinguish insert vs update count via ON CONFLICT,
    # so report total rowcount as "processed".
    return (result.rowcount or len(batch)), 0

async def import_minifigs() -> int:
    rows = await download_csv(MINIFIGS_URL)
    print(f"  Importing minifigures...")
    inserted = 0
    batch = []
    BATCH_SIZE = 500

    async with AsyncSessionLocal() as session:
        for row in rows:
            fig_num = (row.get("fig_num") or "").strip()
            if not fig_num:
                continue
            name = (row.get("name") or "Unknown Minifig")[:255]
            is_cmf = fig_num.lower().startswith("col")
            theme = "Collectible Minifigures" if is_cmf else "Other"

            batch.append({
                "id": f"reb-{fig_num}",
                "fig_number": fig_num,
                "name": name,
                "theme": theme,
                "year": 2000,
                "image_url": row.get("img_url") or None,
                "is_cmf": is_cmf,
                "rarity": "common",
            })

            if len(batch) >= BATCH_SIZE:
                stmt = pg_insert(Minifigure).values(batch)
                stmt = stmt.on_conflict_do_update(
                    index_elements=["fig_number"],
                    set_={"name": stmt.excluded.name, "image_url": stmt.excluded.image_url},
                )
                result = await session.execute(stmt)
                inserted += result.rowcount or len(batch)
                batch = []

        if batch:
            stmt = pg_insert(Minifigure).values(batch)
            stmt = stmt.on_conflict_do_update(
                index_elements=["fig_number"],
                set_={"name": stmt.excluded.name, "image_url": stmt.excluded.image_url},
            )
            result = await session.execute(stmt)
            inserted += result.rowcount or len(batch)

        await session.commit()

    print(f"  ✓ Minifigures: {inserted:,} processed")
    return inserted

async def main(min_year: int, skip_minifigs: bool):
    print("🧱 BrickVault catalog import (Rebrickable CSV)")
    print("=" * 50)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("\n[1/3] Themes")
    theme_lookup = await import_themes()
    print(f"  ✓ {len(theme_lookup):,} themes loaded")

    print("\n[2/3] Sets")
    await import_sets(theme_lookup, min_year=min_year)

    if not skip_minifigs:
        print("\n[3/3] Minifigures")
        await import_minifigs()
    else:
        print("\n[3/3] Minifigures (skipped)")

    print("\n✅ Catalog import complete!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import LEGO catalog from Rebrickable CSV")
    parser.add_argument("--since", type=int, default=1980, help="Minimum set year (default: 1980)")
    parser.add_argument("--skip-minifigs", action="store_true", help="Skip minifig import")
    args = parser.parse_args()
    asyncio.run(main(min_year=args.since, skip_minifigs=args.skip_minifigs))
