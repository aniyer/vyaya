"""
Simple migration script to add status column to receipts table.
Run this from the backend directory or container.
"""
import sqlite3
import os
from pathlib import Path

DB_PATH = Path("/app/data/vyaya.db")

def migrate():
    if not DB_PATH.exists():
        print(f"Database not found at {DB_PATH}. Skipping migration.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column exists
        cursor.execute("PRAGMA table_info(receipts)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "status" not in columns:
            print("Adding 'status' column to 'receipts' table...")
            # Add column with default 'completed' for existing records
            cursor.execute("ALTER TABLE receipts ADD COLUMN status VARCHAR(20) DEFAULT 'review'")
            conn.commit()
            print("Migration successful.")
        else:
            print("'status' column already exists.")
            
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
