# Georgia Spa Company Sales Dashboard - Setup Guide

## Quick Start

### 1. Supabase Setup (5 minutes)

1. **Create a Supabase Account**
   - Go to [https://supabase.com](https://supabase.com)
   - Sign up for a free account
   - Click "New Project"

2. **Create New Project**
   - Organization: Create or select your organization
   - Project Name: `gaspa-sales-dashboard`
   - Database Password: Generate a strong password (save it somewhere safe!)
   - Region: Choose closest to you (e.g., `us-east-1`)
   - Click "Create new project" (takes ~2 minutes)

3. **Run Database Schema**
   - Once project is created, go to "SQL Editor" in the left sidebar
   - Click "New query"
   - Copy the entire contents of `supabase/schema.sql`
   - Paste into the SQL editor
   - Click "Run" (bottom right)
   - You should see "Success. No rows returned" - this is correct!

4. **Get API Keys**
   - Go to "Project Settings" (gear icon in sidebar)
   - Click "API" in the left menu
   - Copy these two values:
     - **Project URL** (looks like: `https://xxxxx.supabase.co`)
     - **anon/public** key (under "Project API keys")

### 2. Configure Environment Variables

1. Copy the example env file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   AUTH_PASSWORD=gaspa2024
   ```

### 3. Install Dependencies & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

---

## Database Schema Overview

The database consists of 12 tables organized into 4 categories:

### Reference Tables
- **dates** - Date dimension for reporting
- **stores** - 11 store locations (Buford, Athens, Kennesaw, etc.)
- **sales_reps** - Sales representatives (26 people pre-loaded)

### Goals Tables
- **monthly_goals** - Revenue goals per store and company-wide
- **sales_rep_goals** - Individual sales rep monthly targets

### Daily Performance Tables
- **daily_store_revenue** - Daily revenue by store
- **daily_sales_rep_revenue** - Daily revenue by sales rep
- **daily_activities** - Daily activities (calls, emails, SMS, etc.)
- **daily_traffic** - Walk-ins and units sold by product type
- **daily_internet_leads** - Internet leads by store
- **daily_summary_metrics** - Company-wide daily metrics

### Audit Table
- **audit_log** - Track data imports and changes

---

## Data Import Process

### Historical Data Import (8/19/24 onwards)

We'll create an ETL script to:
1. Parse the Excel file (`Daily Sales Report.xlsx`)
2. Extract data from all 73 sheets
3. Calculate daily revenue from cumulative MTD data
4. Import into Supabase

This script will be created in Phase 2 of development.

### Daily Data Entry

Once the dashboard is built, you'll:
1. Log in to the dashboard
2. Enter daily store revenue and sales rep revenue
3. The system will:
   - Validate totals (warn if store total ≠ rep total)
   - Auto-calculate MTD, YTD, and cumulative metrics
   - Update dashboards in real-time

---

## Features Roadmap

### Phase 1: Foundation ✅
- [x] Next.js project setup
- [x] Supabase database schema
- [x] shadcn/ui components installed
- [ ] Basic authentication

### Phase 2: Data Import
- [ ] Excel parser script
- [ ] Historical data transformation
- [ ] Data validation and quality checks
- [ ] Import into Supabase

### Phase 3: Dashboard UI
- [ ] Home dashboard with KPIs
- [ ] Store performance view
- [ ] Sales rep leaderboard
- [ ] Revenue trending charts
- [ ] Activity tracking

### Phase 4: Data Entry Form
- [ ] Daily entry form
- [ ] Revenue validation
- [ ] Auto-save functionality
- [ ] Edit historical entries

### Phase 5: Advanced Features
- [ ] Custom date range reports
- [ ] Export to Excel/PDF
- [ ] HubSpot integration
- [ ] Meta Ads & Google Ads integration
- [ ] Forecasting and alerts

---

## Technology Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **Hosting**: Vercel (zero-config deployment)
- **Data Processing**: xlsx (Excel parsing), date-fns (date utilities)

---

## Project Structure

```
gaspa-dashboard/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication routes
│   ├── dashboard/         # Dashboard pages
│   ├── data-entry/        # Daily data entry form
│   ├── reports/           # Reporting pages
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── dashboard/         # Dashboard-specific components
│   └── charts/            # Chart components
├── lib/
│   ├── supabase.ts        # Supabase client
│   ├── utils.ts           # Utility functions
│   └── types.ts           # TypeScript types
├── scripts/
│   └── import-data.ts     # Data import ETL script
├── supabase/
│   └── schema.sql         # Database schema
└── public/                # Static assets
```

---

## Support & Documentation

- **Next.js**: https://nextjs.org/docs
- **Supabase**: https://supabase.com/docs
- **shadcn/ui**: https://ui.shadcn.com
- **Tailwind CSS**: https://tailwindcss.com/docs

---

## Next Steps

1. ✅ Complete Supabase setup above
2. ✅ Configure environment variables
3. ⏭️ Run the development server
4. ⏭️ Build the data import script
5. ⏭️ Create the dashboard UI

Let's build something amazing! 🚀
