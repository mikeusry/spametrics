#!/usr/bin/env python3
"""
CORRECT Import: Read CSV files and calculate daily revenue from MTD
"""

import csv
import os
from datetime import datetime
import psycopg2
from dotenv import load_dotenv

load_dotenv('.env.local')

# Supabase connection (PostgreSQL)
conn = psycopg2.connect(
    host='db.zhfkkqrcarbqavmcilhs.supabase.co',
    database='postgres',
    user='postgres',
    password=os.getenv('SUPABASE_PASSWORD', 'your-db-password')  # Need to add this
)
conn.autocommit = True
cur = conn.cursor()

def parse_date(filename):
    """Parse date from CSV filename"""
    name = filename.replace('.csv', '')

    # 10012025 = 10/01/2025
    if len(name) == 8 and name.isdigit():
        return f"2025-{name[:2]}-{name[2:4]}"

    # 82125 = 8/21/2025
    if len(name) == 5 and name.isdigit():
        return f"2025-{name[0].zfill(2)}-{name[1:3]}"

    # 8.19.25 = 8/19/2025
    if '.' in name:
        parts = name.split('.')
        return f"2025-{parts[0].zfill(2)}-{parts[1].zfill(2)}"

    return None

def read_csv_data(filepath):
    """Read store and summary data from CSV"""
    with open(filepath, 'r') as f:
        reader = csv.reader(f)
        rows = list(reader)

    # Extract summary from row 5 (MTD Revenue)
    mtd_revenue = float(rows[4][4]) if rows[4][4] else 0  # Row 5, Column E (index 4)
    month_goal = float(rows[2][1]) if rows[2][1] else 0   # Row 3, Column B

    # Extract store data from rows 3-13 (index 2-12), column F (index 5)
    stores = {
        'Buford': float(rows[2][5]) if rows[2][5] else 0,
        'Athens': float(rows[3][5]) if rows[3][5] else 0,
        'Warehouse': float(rows[4][5]) if rows[4][5] else 0,
        'Kennesaw': float(rows[5][5]) if rows[5][5] else 0,
        'Alpharetta': float(rows[6][5]) if rows[6][5] else 0,
        'Augusta': float(rows[7][5]) if rows[7][5] else 0,
        'Newnan': float(rows[8][5]) if rows[8][5] else 0,
        'Oconee': float(rows[9][5]) if rows[9][5] else 0,
        'Blue Ridge': float(rows[10][5]) if rows[10][5] else 0,
        'Blairsville': float(rows[11][5]) if rows[11][5] else 0,
        'Costco': float(rows[12][5]) if rows[12][5] else 0,
    }

    return {
        'mtd_revenue': mtd_revenue,
        'month_goal': month_goal,
        'stores': stores
    }

# Clear existing data
print("🗑️  Clearing database...")
cur.execute("DELETE FROM daily_store_revenue")
cur.execute("DELETE FROM daily_summary_metrics")
print("✅ Cleared\n")

# Get all CSV files sorted by date
csv_dir = 'csv-exports'
csv_files = [f for f in os.listdir(csv_dir) if f.endswith('.csv')]

# Parse and sort by date
dated_files = []
for f in csv_files:
    date = parse_date(f)
    if date:
        dated_files.append((date, f))

dated_files.sort()

print(f"📊 Processing {len(dated_files)} days...\n")

# Track previous MTD for daily calculations
prev_company_mtd = 0
prev_store_mtd = {}

for date, filename in dated_files:
    filepath = os.path.join(csv_dir, filename)
    data = read_csv_data(filepath)

    # Calculate daily revenue (current MTD - previous MTD)
    daily_revenue = data['mtd_revenue'] - prev_company_mtd

    # Insert summary
    cur.execute("""
        INSERT INTO daily_summary_metrics (date_id, month_goal, mtd_revenue, daily_revenue, percent_to_goal)
        VALUES (%s, %s, %s, %s, %s)
    """, (date, data['month_goal'], data['mtd_revenue'], daily_revenue,
          (data['mtd_revenue'] / data['month_goal'] * 100) if data['month_goal'] > 0 else 0))

    # Insert stores
    for store_name, mtd in data['stores'].items():
        # Get store_id
        cur.execute("SELECT store_id FROM stores WHERE store_name = %s", (store_name,))
        result = cur.fetchone()
        if not result:
            continue

        store_id = result[0]

        # Calculate daily revenue
        prev_mtd = prev_store_mtd.get(store_name, 0)
        daily = mtd - prev_mtd

        cur.execute("""
            INSERT INTO daily_store_revenue (date_id, store_id, daily_revenue, mtd_revenue)
            VALUES (%s, %s, %s, %s)
        """, (date, store_id, daily, mtd))

        prev_store_mtd[store_name] = mtd

    prev_company_mtd = data['mtd_revenue']

    print(f"✅ {date}: Daily=${daily_revenue:,.2f}, MTD=${data['mtd_revenue']:,.2f}")

print("\n✅ Import complete!")

cur.close()
conn.close()
