"""
CritiqAI — SQLite Audit Persistence Layer
Stores every audit result so users can browse history and track trends.
"""
import sqlite3
import json
import os
import time
from typing import List, Optional

DB_PATH = os.getenv("CRITIQAI_DB_PATH", os.path.join(os.path.dirname(__file__), "critiqai.db"))


def _conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Create the audits table if it doesn't exist."""
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS audits (
                id TEXT PRIMARY KEY,
                model_name TEXT NOT NULL,
                risk_score REAL NOT NULL,
                risk_level TEXT NOT NULL,
                elapsed_seconds REAL,
                total_flags INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                result_json TEXT NOT NULL
            )
        """)
        conn.commit()


def save_audit(result: dict):
    """Persist an audit result to the database."""
    summary = result.get("summary", {})
    with _conn() as conn:
        conn.execute(
            """INSERT OR REPLACE INTO audits
               (id, model_name, risk_score, risk_level, elapsed_seconds, total_flags, created_at, result_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                result["audit_id"],
                result["model_name"],
                summary.get("composite_risk_score", 0),
                summary.get("risk_level", "Unknown"),
                result.get("elapsed_seconds", 0),
                summary.get("total_flags", 0),
                time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                json.dumps(result),
            ),
        )
        conn.commit()


def list_audits(limit: int = 50, offset: int = 0) -> List[dict]:
    """Return recent audits (metadata only, no full JSON)."""
    with _conn() as conn:
        rows = conn.execute(
            """SELECT id, model_name, risk_score, risk_level,
                      elapsed_seconds, total_flags, created_at
               FROM audits ORDER BY created_at DESC LIMIT ? OFFSET ?""",
            (limit, offset),
        ).fetchall()
    return [dict(r) for r in rows]


def get_audit(audit_id: str) -> Optional[dict]:
    """Get full audit result by ID."""
    with _conn() as conn:
        row = conn.execute(
            "SELECT result_json FROM audits WHERE id = ?", (audit_id,)
        ).fetchone()
    if row:
        return json.loads(row["result_json"])
    return None


def delete_audit(audit_id: str) -> bool:
    """Delete an audit by ID. Returns True if deleted."""
    with _conn() as conn:
        cur = conn.execute("DELETE FROM audits WHERE id = ?", (audit_id,))
        conn.commit()
        return cur.rowcount > 0


def get_audit_count() -> int:
    """Total number of stored audits."""
    with _conn() as conn:
        row = conn.execute("SELECT COUNT(*) as cnt FROM audits").fetchone()
    return row["cnt"]


def get_trend_data(limit: int = 20) -> List[dict]:
    """Return risk score trend data (most recent N audits)."""
    with _conn() as conn:
        rows = conn.execute(
            """SELECT id, model_name, risk_score, risk_level, created_at
               FROM audits ORDER BY created_at DESC LIMIT ?""",
            (limit,),
        ).fetchall()
    return [dict(r) for r in reversed(rows)]


# Initialize DB on import
init_db()
