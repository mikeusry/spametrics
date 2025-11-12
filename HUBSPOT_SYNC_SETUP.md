# HubSpot Daily Sync Setup Guide

## Overview
Automated daily sync of HubSpot activity data (calls, emails, meetings, notes, SMS) into the Spametrics dashboard.

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Vercel    │         │  HubSpot API │         │   Supabase   │
│  Cron Job   │────────▶│   Endpoint   │────────▶│   Database   │
│  (Daily)    │         │  /api/sync   │         │              │
└─────────────┘         └──────────────┘         └──────────────┘
    1:00 AM UTC           Fetch & Process          Store Activities
```

## Setup Instructions

### 1. Database Migration

Run the migration to add HubSpot support:

```sql
-- Execute in Supabase SQL Editor
-- File: supabase/migrations/add-hubspot-sync.sql
```

This creates:
- `sales_rep_activities` table
- `hubspot_owner_id` column in `sales_reps`
- Indexes for performance
- Views for querying activity data

### 2. Map HubSpot Owners to Sales Reps

You need to map HubSpot owner IDs to your internal sales rep records.

#### Find HubSpot Owner IDs:

```bash
# Run the list-hubspot-owners script
npx tsx scripts/list-hubspot-owners.ts
```

This will output a list of HubSpot owners with their IDs.

#### Update Sales Reps:

```sql
-- Example: Map HubSpot owner IDs to sales reps
UPDATE sales_reps SET hubspot_owner_id = '12345678' WHERE full_name = 'Cherry Durand';
UPDATE sales_reps SET hubspot_owner_id = '87654321' WHERE full_name = 'Jodi Martin';
-- ... repeat for all active sales reps
```

### 3. Environment Variables

#### Local Development (.env.local):
```bash
HUBSPOT_API_KEY=pat-na1-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
CRON_SECRET=your-random-secret-string-here
```

#### Vercel Production:
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add:
   - `HUBSPOT_API_KEY` = Your HubSpot private app token
   - `CRON_SECRET` = Random secure string (generate with `openssl rand -hex 32`)

### 4. Vercel Cron Configuration

The `vercel.json` file is already configured:

```json
{
  "crons": [
    {
      "path": "/api/sync/hubspot",
      "schedule": "0 1 * * *"
    }
  ]
}
```

**Schedule**: Daily at 1:00 AM UTC (9:00 PM EST previous day)

**Note**: Vercel cron is only available on Pro and Enterprise plans. For Hobby plan, use an external service like:
- GitHub Actions
- Zapier
- IFTTT
- Uptime Robot (make HTTP request)

### 5. Deploy to Vercel

```bash
git add .
git commit -m "Add HubSpot daily sync with Vercel cron"
git push origin main
```

Vercel will automatically:
1. Detect the `vercel.json` cron configuration
2. Schedule the daily sync job
3. Call `/api/sync/hubspot` at 1:00 AM UTC daily

## API Endpoints

### POST /api/sync/hubspot

Triggers HubSpot sync (requires authorization).

**Headers:**
```
Authorization: Bearer {CRON_SECRET}
```

**Query Parameters:**
- `startDate` (optional): ISO date string (e.g., `2025-10-29`)
- `endDate` (optional): ISO date string (e.g., `2025-10-30`)

**Default Behavior**: Syncs yesterday's data if no date range provided.

**Example Response:**
```json
{
  "success": true,
  "message": "HubSpot sync completed successfully",
  "startDate": "2025-10-29T00:00:00.000Z",
  "endDate": "2025-10-30T23:59:59.999Z",
  "activitiesProcessed": 245,
  "summariesCreated": 18,
  "recordsUpserted": 18,
  "unmappedOwners": []
}
```

### GET /api/sync/hubspot?action=status

Health check endpoint (no auth required).

**Example Response:**
```json
{
  "status": "ready",
  "hubspotConfigured": true,
  "cronConfigured": true,
  "timestamp": "2025-10-30T12:00:00.000Z"
}
```

## Manual Sync

### Sync Yesterday's Data:
```bash
curl -X POST https://your-domain.vercel.app/api/sync/hubspot \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Sync Specific Date Range:
```bash
curl -X POST "https://your-domain.vercel.app/api/sync/hubspot?startDate=2025-10-01&endDate=2025-10-15" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Health Check:
```bash
curl https://your-domain.vercel.app/api/sync/hubspot?action=status
```

## Data Flow

1. **Cron Trigger**: Vercel cron calls `/api/sync/hubspot` at 1:00 AM UTC
2. **Fetch Activities**: API calls HubSpot API for each activity type:
   - Calls (`/crm/v3/objects/calls`)
   - Emails (`/crm/v3/objects/emails`)
   - Meetings (`/crm/v3/objects/meetings`)
   - Notes (`/crm/v3/objects/notes`)
   - SMS (`/crm/v3/objects/communications`)
3. **Aggregate**: Group activities by date and HubSpot owner ID
4. **Map Owners**: Convert HubSpot owner IDs to internal `rep_id`
5. **Upsert**: Insert or update records in `sales_rep_activities` table

## Querying Synced Data

### Latest Activities:
```sql
SELECT * FROM v_rep_activity_summary
WHERE date_id >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date_id DESC, full_name;
```

### MTD Activity Totals:
```sql
SELECT * FROM v_mtd_rep_activities
ORDER BY total_activities DESC;
```

### Individual Rep Activities:
```sql
SELECT
    date_id,
    calls,
    emails,
    meetings,
    notes,
    sms,
    total_activities
FROM sales_rep_activities
WHERE rep_id = (SELECT rep_id FROM sales_reps WHERE full_name = 'Cherry Durand')
    AND date_id >= DATE_TRUNC('month', CURRENT_DATE)
ORDER BY date_id DESC;
```

## Troubleshooting

### Sync Not Running

**Check Vercel Logs:**
1. Go to Vercel Dashboard → Project → Functions
2. Filter by `/api/sync/hubspot`
3. Look for execution logs

**Verify Cron Schedule:**
```bash
vercel cron ls
```

### HubSpot API Errors

**401 Unauthorized:**
- Check `HUBSPOT_API_KEY` is correct
- Verify private app has required scopes:
  - `crm.objects.calls.read`
  - `crm.objects.emails.read`
  - `crm.objects.meetings.read`
  - `crm.objects.notes.read`
  - `crm.objects.communications.read`

**429 Rate Limit:**
- HubSpot has rate limits (typically 100 requests/10 seconds)
- Sync fetches 6 activity types = 6 requests
- Should be fine for daily sync

### No Activities Synced

**Check Owner Mapping:**
```sql
-- Find sales reps without HubSpot mapping
SELECT rep_id, full_name, hubspot_owner_id
FROM sales_reps
WHERE is_active = true
    AND hubspot_owner_id IS NULL;
```

**Check Unmapped Owners in Response:**
The API response includes `unmappedOwners` array showing HubSpot owner IDs that don't match any sales rep.

### Database Errors

**Duplicate Key Error:**
- The `UNIQUE(date_id, rep_id)` constraint prevents duplicate entries
- Use `upsert` to update existing records

**Foreign Key Error:**
- Ensure all dates exist in `dates` table
- Ensure all reps exist in `sales_reps` table

## Monitoring

### Set Up Alerts

1. **Vercel Monitoring:**
   - Go to Vercel Dashboard → Integrations
   - Add monitoring service (e.g., Sentry, Datadog)

2. **Database Monitoring:**
   - Check `synced_at` timestamps in `sales_rep_activities`
   - Alert if no data synced in 24 hours

3. **Success/Failure Tracking:**
```sql
-- Create sync_log table to track execution
CREATE TABLE sync_log (
    log_id SERIAL PRIMARY KEY,
    sync_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    activities_processed INT,
    records_upserted INT,
    error_message TEXT,
    execution_time_ms INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Alternative: GitHub Actions (for Vercel Hobby)

If you're on Vercel Hobby plan (no cron support), use GitHub Actions:

```yaml
# .github/workflows/hubspot-sync.yml
name: HubSpot Daily Sync

on:
  schedule:
    - cron: '0 1 * * *'  # 1:00 AM UTC daily
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger HubSpot Sync
        run: |
          curl -X POST https://your-domain.vercel.app/api/sync/hubspot \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Add `CRON_SECRET` to GitHub repository secrets.

## Support

For issues or questions:
1. Check Vercel function logs
2. Review HubSpot API documentation
3. Test sync manually with curl commands
4. Verify environment variables are set correctly
