import { notFound } from 'next/navigation';
import {
  getCurrentRepPerformance,
  getRepActivities,
  getSingleRepActivitySummary,
  getSalesReps,
  getLatestSystemDate,
  getRepDailyRevenue,
  formatCurrency,
  formatPercent
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { InlineActivityChart } from '@/components/activity/inline-activity-chart';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const repName = slug.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  return {
    title: `${repName} | Sales Rep Detail`,
    description: `Detailed performance and activity metrics for ${repName}`,
  };
}

export default async function RepDetailPage({ params }: PageProps) {
  const { slug } = await params;

  // Convert slug to rep name (e.g., "cherry-durand" -> "Cherry Durand")
  const repName = slug.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  // Get current month date range using system's latest date
  const latestDate = await getLatestSystemDate();
  if (!latestDate) {
    notFound();
  }

  // Parse the date string directly to avoid timezone issues
  const [year, month] = latestDate.split('-').map(Number);
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = latestDate;

  // Fetch all data in parallel
  const [allReps, activities, allSalesReps] = await Promise.all([
    getCurrentRepPerformance(),
    getRepActivities(startDate, endDate),
    getSalesReps()
  ]);

  // Find this rep's performance data
  const repPerformance = allReps.find(r => r.full_name === repName);

  if (!repPerformance) {
    notFound();
  }

  // Get rep_id from sales_reps table
  const salesRep = allSalesReps.find(r => r.full_name === repName);
  const repId = salesRep?.rep_id;

  // Filter activities for this rep
  const repActivities = activities.filter(a => a.rep_name === repName);

  // Get activity summary and daily revenue in parallel
  const [activitySummary, dailyRevenue] = await Promise.all([
    repId ? getSingleRepActivitySummary(repId, startDate, endDate) : null,
    repId ? getRepDailyRevenue(repId, startDate, endDate) : []
  ]);

  // Create revenue lookup map
  const revenueMap = new Map(dailyRevenue.map(r => [r.date_id, r.daily_revenue]));

  // Get all unique dates from both activities and revenue
  const allDates = new Set<string>();
  repActivities.forEach(a => allDates.add(a.date_id));
  dailyRevenue.forEach(r => allDates.add(r.date_id));

  // Build daily data with all dates that have either activities or revenue
  const dailyDataMap = new Map<string, {
    date_id: string;
    calls: number;
    emails: number;
    meetings: number;
    notes: number;
    sms: number;
    total: number;
    sales: number;
  }>();

  // Initialize all dates
  allDates.forEach(date => {
    dailyDataMap.set(date, {
      date_id: date,
      calls: 0,
      emails: 0,
      meetings: 0,
      notes: 0,
      sms: 0,
      total: 0,
      sales: revenueMap.get(date) || 0
    });
  });

  // Add activity data
  repActivities.forEach(activity => {
    const existing = dailyDataMap.get(activity.date_id);
    if (existing) {
      existing.calls += activity.calls;
      existing.emails += activity.emails;
      existing.meetings += activity.meetings;
      existing.notes += activity.notes;
      existing.sms += activity.sms;
      existing.total += activity.total_activities;
    }
  });

  // Convert to array and sort
  const dailyData = Array.from(dailyDataMap.values()).sort((a, b) => b.date_id.localeCompare(a.date_id));

  // Calculate column totals
  const totals = dailyData.reduce((acc, day) => ({
    calls: acc.calls + day.calls,
    emails: acc.emails + day.emails,
    meetings: acc.meetings + day.meetings,
    notes: acc.notes + day.notes,
    sms: acc.sms + day.sms,
    total: acc.total + day.total,
    sales: acc.sales + day.sales
  }), {
    calls: 0,
    emails: 0,
    meetings: 0,
    notes: 0,
    sms: 0,
    total: 0,
    sales: 0
  });

  // Calculate average activities per day
  const avgActivitiesPerDay = dailyData.length > 0
    ? dailyData.reduce((sum, d) => sum + d.total, 0) / dailyData.length
    : 0;

  // Find most active day
  const mostActiveDay = dailyData.length > 0
    ? dailyData.reduce((max, d) => d.total > max.total ? d : max, dailyData[0])
    : null;

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/sales-reps"
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors min-h-[44px]"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-xs sm:text-sm font-medium">Back</span>
          </Link>
        </div>
        <div className="mt-3 sm:mt-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{repPerformance.full_name}</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {repPerformance.role} • MTD Performance
          </p>
        </div>
      </div>

      <main className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardDescription className="text-xs">MTD Revenue</CardDescription>
              <CardTitle className="text-lg sm:text-xl lg:text-2xl">{formatCurrency(repPerformance.mtd_revenue)}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xs text-muted-foreground">
                Goal: {formatCurrency(repPerformance.monthly_goal)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardDescription className="text-xs">% to Goal</CardDescription>
              <CardTitle className={`text-lg sm:text-xl lg:text-2xl ${
                repPerformance.percent_to_goal && repPerformance.percent_to_goal >= 100
                  ? 'text-green-600'
                  : 'text-gray-900'
              }`}>
                {formatPercent(repPerformance.percent_to_goal)}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xs text-muted-foreground truncate">
                {formatCurrency(repPerformance.variance_to_goal)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardDescription className="text-xs">Activities</CardDescription>
              <CardTitle className="text-lg sm:text-xl lg:text-2xl text-purple-600">
                {activitySummary?.total_activities || 0}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xs text-muted-foreground">
                {avgActivitiesPerDay.toFixed(1)}/day
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardDescription className="text-xs">Pacing</CardDescription>
              <CardTitle className={`text-lg sm:text-xl lg:text-2xl ${
                repPerformance.pacing_percent && repPerformance.pacing_percent >= 100
                  ? 'text-green-600'
                  : repPerformance.pacing_percent && repPerformance.pacing_percent >= 80
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}>
                {repPerformance.pacing_percent !== null
                  ? `${repPerformance.pacing_percent.toFixed(1)}%`
                  : 'N/A'}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xs text-muted-foreground">
                {repPerformance.days_remaining}d left
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Summary Card */}
        {activitySummary && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">MTD Activity Breakdown</CardTitle>
              <CardDescription className="text-xs sm:text-sm">All activities from HubSpot this month</CardDescription>
            </CardHeader>
            <CardContent>
              <InlineActivityChart
                calls={activitySummary.total_calls}
                emails={activitySummary.total_emails}
                meetings={activitySummary.total_meetings}
                notes={activitySummary.total_notes}
                sms={activitySummary.total_sms}
              />
            </CardContent>
          </Card>
        )}

        {/* Daily Activity Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Daily Activity Log</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Day-by-day activity breakdown</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {dailyData.length === 0 ? (
              <div className="text-center text-gray-500 py-8 px-6">
                No activity data available for this month
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full align-middle">
                  <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-white z-10 text-xs sm:text-sm">Date</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap">Calls</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap">Emails</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap">Meetings</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap">Notes</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap">SMS</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm font-semibold whitespace-nowrap">Total</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm font-semibold bg-green-50 whitespace-nowrap">Sales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyData.map((day) => (
                    <TableRow key={day.date_id}>
                      <TableCell className="font-medium sticky left-0 bg-white z-10 text-xs sm:text-sm whitespace-nowrap">
                        {new Date(day.date_id).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                        {day.date_id === mostActiveDay?.date_id && (
                          <span className="ml-1 sm:ml-2 text-xs bg-purple-100 text-purple-700 px-1 sm:px-2 py-0.5 sm:py-1 rounded-full hidden sm:inline">
                            Most Active
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-purple-700 text-xs sm:text-sm whitespace-nowrap">
                        {day.calls}
                      </TableCell>
                      <TableCell className="text-right font-mono text-blue-700 text-xs sm:text-sm whitespace-nowrap">
                        {day.emails}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-700 text-xs sm:text-sm whitespace-nowrap">
                        {day.meetings}
                      </TableCell>
                      <TableCell className="text-right font-mono text-orange-700 text-xs sm:text-sm whitespace-nowrap">
                        {day.notes}
                      </TableCell>
                      <TableCell className="text-right font-mono text-pink-700 text-xs sm:text-sm whitespace-nowrap">
                        {day.sms}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-xs sm:text-sm whitespace-nowrap">
                        {day.total}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold bg-green-50 text-xs sm:text-sm whitespace-nowrap">
                        {formatCurrency(day.sales)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-gray-100 font-bold border-t-2">
                    <TableCell className="font-bold sticky left-0 bg-gray-100 z-10 text-xs sm:text-sm">TOTALS</TableCell>
                    <TableCell className="text-right font-mono text-purple-700 text-xs sm:text-sm">
                      {totals.calls}
                    </TableCell>
                    <TableCell className="text-right font-mono text-blue-700 text-xs sm:text-sm">
                      {totals.emails}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-700 text-xs sm:text-sm">
                      {totals.meetings}
                    </TableCell>
                    <TableCell className="text-right font-mono text-orange-700 text-xs sm:text-sm">
                      {totals.notes}
                    </TableCell>
                    <TableCell className="text-right font-mono text-pink-700 text-xs sm:text-sm">
                      {totals.sms}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-xs sm:text-sm">
                      {totals.total}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold bg-green-50 text-xs sm:text-sm">
                      {formatCurrency(totals.sales)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Insights Card */}
        {dailyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Activity Insights</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Key metrics and patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Most Active Day
                  </div>
                  <div className="text-lg font-bold">
                    {mostActiveDay && new Date(mostActiveDay.date_id).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {mostActiveDay?.total} activities
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Days with Activity
                  </div>
                  <div className="text-lg font-bold">
                    {dailyData.filter(d => d.total > 0).length} days
                  </div>
                  <div className="text-sm text-muted-foreground">
                    out of {dailyData.length} total
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Primary Activity
                  </div>
                  <div className="text-lg font-bold">
                    {(activitySummary?.total_calls || 0) >= (activitySummary?.total_emails || 0) &&
                     (activitySummary?.total_calls || 0) >= (activitySummary?.total_meetings || 0)
                      ? `Calls (${activitySummary?.total_calls || 0})`
                      : (activitySummary?.total_emails || 0) >= (activitySummary?.total_meetings || 0)
                      ? `Emails (${activitySummary?.total_emails || 0})`
                      : `Meetings (${activitySummary?.total_meetings || 0})`}
                  </div>                  <div className="text-sm text-muted-foreground">
                    Most frequent type
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
