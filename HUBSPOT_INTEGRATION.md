# HubSpot Activities Integration

This document explains how to integrate HubSpot activity tracking with the Spametrics dashboard.

## Overview

Track daily sales rep activities from HubSpot:
- **Calls** - Phone calls logged
- **Emails** - Emails sent/received
- **Meetings** - Scheduled meetings
- **Notes** - Notes created
- **Tasks** - Tasks completed
- **SMS** - Text messages sent

## Setup Instructions

### 1. Configure Environment Variables

Your HubSpot credentials are already in `.env.local`:

```bash
HUBSPOT_API_KEY=a624b28c-c067-4fc5-8cd2-68461207b3b9
HUBSPOT_COMPANY_ID=2107798
```

### 2. Create Database Tables

Run the SQL script in your Supabase SQL Editor:

```bash
# Location: supabase/add-activities-table.sql
```

This creates two tables:
- `daily_rep_activities` - Stores daily activity counts per rep
- `hubspot_owner_mapping` - Maps HubSpot owner IDs to internal rep IDs

### 3. Set Up HubSpot Owner Mapping

You need to map HubSpot owner IDs to your internal sales rep IDs.

**To find HubSpot owner IDs:**

1. Go to HubSpot → Settings → Users & Teams
2. Click on each sales rep
3. The owner ID is in the URL: `...hubspot.com/settings/.../users/{OWNER_ID}`

**Add mappings to database:**

```sql
-- Example mappings (replace with actual IDs)
INSERT INTO hubspot_owner_mapping (rep_id, hubspot_owner_id, hubspot_owner_name)
VALUES
  (1, '12345678', 'John Smith'),
  (2, '87654321', 'Jane Doe'),
  (3, '11223344', 'Bob Johnson');
  -- Add more as needed
```

**Or get owner IDs from first import:**

Run the import script once - it will show you unmapped HubSpot owner IDs.

### 4. Import Activities Data

#### Install dependencies (if not already installed):

```bash
npm install dotenv
```

#### Run the import script:

```bash
# Import current month
npx tsx scripts/import-hubspot-activities.ts

# Import specific date
npx tsx scripts/import-hubspot-activities.ts --date 2025-10-30

# Import date range
npx tsx scripts/import-hubspot-activities.ts --start 2025-10-01 --end 2025-10-30
```

#### Set up daily cron job:

Add to your server's crontab or use a service like GitHub Actions:

```bash
# Run every day at 6 AM
0 6 * * * cd /path/to/project && npx tsx scripts/import-hubspot-activities.ts
```

## How It Works

### Data Flow

```
HubSpot API
    ↓
Fetch Activities
    ↓
Aggregate by Date & Owner
    ↓
Map to Internal Rep IDs
    ↓
Store in Supabase
    ↓
Display in Dashboard
```

### API Endpoints Used

The integration fetches from these HubSpot v3 endpoints:

- `/crm/v3/objects/calls` - Phone calls
- `/crm/v3/objects/emails` - Email engagements
- `/crm/v3/objects/meetings` - Calendar meetings
- `/crm/v3/objects/notes` - Notes on contacts
- `/crm/v3/objects/tasks` - Tasks created
- `/crm/v3/objects/communications` - SMS messages

### Activity Aggregation

Activities are grouped by:
- **Date** - Calendar day (YYYY-MM-DD)
- **Owner** - HubSpot owner ID (sales rep)

The system counts each activity type and stores daily totals.

## Database Schema

### `daily_rep_activities` Table

| Column | Type | Description |
|--------|------|-------------|
| activity_id | SERIAL | Primary key |
| date_id | DATE | Date of activities |
| rep_id | INT | Internal sales rep ID |
| hubspot_owner_id | VARCHAR | HubSpot owner ID |
| calls | INT | Number of calls |
| emails | INT | Number of emails |
| meetings | INT | Number of meetings |
| notes | INT | Number of notes |
| tasks | INT | Number of tasks |
| sms | INT | Number of SMS messages |
| total_activities | INT | Auto-calculated total |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

**Unique Constraint:** `(date_id, rep_id)` - One record per day per rep

**Auto-calculated:** `total_activities` is automatically summed by trigger

### `hubspot_owner_mapping` Table

| Column | Type | Description |
|--------|------|-------------|
| mapping_id | SERIAL | Primary key |
| rep_id | INT | Internal sales rep ID |
| hubspot_owner_id | VARCHAR | HubSpot owner ID (unique) |
| hubspot_owner_name | VARCHAR | HubSpot owner name |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

## Usage Examples

### Import Today's Activities

```bash
npx tsx scripts/import-hubspot-activities.ts --date $(date +%Y-%m-%d)
```

### Import Last Week

```bash
# Calculate dates and import
npx tsx scripts/import-hubspot-activities.ts \
  --start $(date -d '7 days ago' +%Y-%m-%d) \
  --end $(date +%Y-%m-%d)
```

### Query Activities in Supabase

```sql
-- Get today's activities for all reps
SELECT
  sr.full_name,
  dra.calls,
  dra.emails,
  dra.meetings,
  dra.total_activities
FROM daily_rep_activities dra
JOIN sales_reps sr ON dra.rep_id = sr.rep_id
WHERE dra.date_id = CURRENT_DATE
ORDER BY dra.total_activities DESC;

-- Get weekly activity summary
SELECT
  sr.full_name,
  SUM(dra.calls) as total_calls,
  SUM(dra.emails) as total_emails,
  SUM(dra.total_activities) as total_activities
FROM daily_rep_activities dra
JOIN sales_reps sr ON dra.rep_id = sr.rep_id
WHERE dra.date_id >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY sr.full_name
ORDER BY total_activities DESC;
```

## Troubleshooting

### Issue: "HubSpot API key not configured"

**Solution:** Ensure `.env.local` contains `HUBSPOT_API_KEY`

### Issue: Activities skipped (no owner mapping)

**Solution:** Add missing HubSpot owner IDs to `hubspot_owner_mapping` table

The import script will show unmapped owner IDs like:

```
⚠️  No mapping found for HubSpot owner ID: 12345678
```

Add this mapping:

```sql
INSERT INTO hubspot_owner_mapping (rep_id, hubspot_owner_id)
VALUES (1, '12345678');
```

### Issue: API rate limit errors

**Solution:** HubSpot has API rate limits. If importing large date ranges:
- Split into smaller date ranges
- Add delays between requests
- Use HubSpot Professional tier for higher limits

### Issue: No activities returned

**Solution:** Check:
1. API key has correct permissions
2. Date range contains activity data
3. HubSpot owner IDs are correct
4. Activities are logged in HubSpot

## Next Steps

Once data is imported, you can:

1. **Display on Sales Rep Leaderboard**
   - Show daily/weekly/monthly activity counts
   - Compare activity levels across reps

2. **Activity vs Performance Analysis**
   - Correlate activities with sales revenue
   - Identify which activities drive results

3. **Activity Trends**
   - Chart activities over time
   - Identify patterns (busiest days, seasonal trends)

4. **Rep Performance Dashboard**
   - Individual rep activity history
   - Activity goals and targets
   - Activity leaderboard

## API Module Reference

### Location: `lib/hubspot.ts`

**Key Functions:**

- `getAllHubSpotActivities(startDate, endDate)` - Fetch all activities
- `getHubSpotCalls(startDate, endDate)` - Fetch calls only
- `getHubSpotEmails(startDate, endDate)` - Fetch emails only
- `aggregateActivitiesByDateAndOwner(activities)` - Group and count
- `getCurrentMonthActivitySummary()` - Quick monthly fetch

**Types:**

- `HubSpotActivity` - Individual activity record
- `ActivitySummary` - Aggregated daily counts per owner

## Security Notes

- **API Key Security:** Never commit `.env.local` to git
- **Access Control:** API key should have minimal required permissions
- **Data Privacy:** Activity data may contain sensitive information
- **Rate Limits:** Monitor HubSpot API usage to avoid throttling

## Support

For issues or questions:
1. Check HubSpot API documentation
2. Verify database schema is created correctly
3. Ensure environment variables are set
4. Check Supabase logs for errors
