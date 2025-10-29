# 🚀 Quick Start Guide

## Your 5-Minute Setup Checklist

### ☐ Step 1: Create Supabase Project
1. Go to https://supabase.com → Sign up
2. "New Project" → Name: `gaspa-sales-dashboard`
3. Wait ~2 minutes for project to initialize

### ☐ Step 2: Run Database Schema
1. Supabase Dashboard → **SQL Editor** (left sidebar)
2. "New query"
3. Copy ALL of `supabase/schema.sql` and paste
4. Click "Run" → Should see "Success. No rows returned" ✅

### ☐ Step 3: Get API Credentials
1. **Project Settings** (gear icon) → **API**
2. Copy:
   - Project URL: `https://xxxxx.supabase.co`
   - anon public key: `eyJhbG...` (long string)

### ☐ Step 4: Configure Environment
```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key-here
AUTH_PASSWORD=gaspa2024
```

### ☐ Step 5: Import Historical Data
```bash
npx tsx scripts/import-data.ts
```

Watch for: "✅ Import complete! Days imported: XX"

### ☐ Step 6: Start Development
```bash
npm run dev
```

Open http://localhost:3000 🎉

---

## What You Get

✅ Next.js 14 + TypeScript + Tailwind CSS
✅ 12-table database schema with 11 stores + 26 sales reps pre-loaded
✅ Historical data from 8/19/24 imported
✅ Professional UI components (shadcn/ui)
✅ Ready to build dashboard!

---

## Next: Build the Dashboard

After setup, we'll create:
1. **Home Dashboard** - KPIs, MTD revenue, charts
2. **Store Performance** - Revenue by location with charts
3. **Sales Rep Leaderboard** - Top performers
4. **Data Entry Form** - Daily revenue input with validation
5. **Reports** - Custom date ranges, export to Excel

---

## Need Help?

See `SETUP.md` for detailed instructions
See `PROJECT_STATUS.md` for full project overview

**Common Issues:**
- Missing env vars? → Check `.env.local` exists with Supabase keys
- Import fails? → Make sure `schema.sql` ran in Supabase first
- Can't find Excel file? → Must be in project root as `Daily Sales Report.xlsx`

---

**Ready? Let's build!** 🚀
