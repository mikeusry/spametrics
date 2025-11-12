import { NextRequest, NextResponse } from 'next/server';
import { getAllHubSpotActivities, aggregateActivitiesByDateAndOwner } from '@/lib/hubspot';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout for Vercel hobby plan

/**
 * API endpoint to sync HubSpot activity data
 * Called by Vercel Cron or manually
 *
 * Usage:
 * - Cron: Automatic daily at midnight
 * - Manual: POST /api/sync/hubspot with Authorization header
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization (cron secret or manual auth)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[HubSpot Sync] Starting sync process...');

    // Get date range from query params or default to yesterday
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else {
      // Default: sync yesterday's data
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      startDate = yesterday;
      endDate = new Date(yesterday);
      endDate.setHours(23, 59, 59, 999);
    }

    console.log(`[HubSpot Sync] Fetching activities from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Fetch activities from HubSpot
    const activities = await getAllHubSpotActivities(startDate, endDate);
    console.log(`[HubSpot Sync] Found ${activities.length} activities`);

    if (activities.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No activities found for the specified date range',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        activitiesProcessed: 0,
      });
    }

    // Aggregate by date and owner
    const summaries = aggregateActivitiesByDateAndOwner(activities);
    console.log(`[HubSpot Sync] Aggregated into ${summaries.length} daily summaries`);

    // Get sales rep mappings (HubSpot owner ID to internal rep ID)
    const { data: salesReps, error: repsError } = await supabase
      .from('sales_reps')
      .select('rep_id, hubspot_owner_id')
      .not('hubspot_owner_id', 'is', null);

    if (repsError) {
      console.error('[HubSpot Sync] Error fetching sales reps:', repsError);
      throw new Error('Failed to fetch sales rep mappings');
    }

    // Create owner ID to rep ID mapping
    const ownerToRepMap = new Map(
      salesReps.map(rep => [rep.hubspot_owner_id, rep.rep_id])
    );

    console.log(`[HubSpot Sync] Mapped ${ownerToRepMap.size} HubSpot owners to sales reps`);

    // Prepare activity records for database
    const activityRecords = summaries
      .filter(summary => ownerToRepMap.has(summary.ownerId))
      .map(summary => ({
        date_id: summary.date,
        rep_id: ownerToRepMap.get(summary.ownerId)!,
        calls: summary.calls,
        emails: summary.emails,
        meetings: summary.meetings,
        notes: summary.notes,
        sms: summary.sms,
        total_activities: summary.total,
      }));

    if (activityRecords.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No activities matched known sales reps',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        activitiesProcessed: 0,
        unmappedOwners: summaries.map(s => s.ownerId).filter(id => !ownerToRepMap.has(id)),
      });
    }

    console.log(`[HubSpot Sync] Upserting ${activityRecords.length} activity records to database...`);

    // Upsert activity data (insert or update if exists)
    const { data: upsertedData, error: upsertError } = await supabase
      .from('sales_rep_activities')
      .upsert(activityRecords, {
        onConflict: 'date_id,rep_id',
        ignoreDuplicates: false,
      })
      .select();

    if (upsertError) {
      console.error('[HubSpot Sync] Error upserting activities:', upsertError);
      throw new Error(`Failed to upsert activities: ${upsertError.message}`);
    }

    console.log(`[HubSpot Sync] Successfully synced ${upsertedData?.length || activityRecords.length} records`);

    return NextResponse.json({
      success: true,
      message: 'HubSpot sync completed successfully',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      activitiesProcessed: activities.length,
      summariesCreated: summaries.length,
      recordsUpserted: upsertedData?.length || activityRecords.length,
      unmappedOwners: summaries
        .filter(s => !ownerToRepMap.has(s.ownerId))
        .map(s => s.ownerId),
    });

  } catch (error) {
    console.error('[HubSpot Sync] Fatal error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for manual triggers and health checks
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'status') {
    // Health check endpoint
    const hasApiKey = !!process.env.HUBSPOT_API_KEY;
    const hasCronSecret = !!process.env.CRON_SECRET;

    return NextResponse.json({
      status: 'ready',
      hubspotConfigured: hasApiKey,
      cronConfigured: hasCronSecret,
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    message: 'HubSpot Sync API',
    usage: {
      POST: 'Trigger sync (requires authorization)',
      'GET?action=status': 'Check sync configuration status',
    },
  });
}
