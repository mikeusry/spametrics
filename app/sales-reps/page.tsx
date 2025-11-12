import { getCurrentRepPerformance, getRepActivitySummary } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SortableLeaderboard } from '@/components/sales-reps/sortable-leaderboard';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sales Rep Leaderboard | Spametrics',
  description: 'Sales representative performance rankings',
};

export default async function SalesRepsPage() {
  // Get current month date range
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const startDate = firstDay.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  // Fetch performance and activity data in parallel
  const [reps, activities] = await Promise.all([
    getCurrentRepPerformance(),
    getRepActivitySummary(startDate, endDate)
  ]);

  // If no revenue data, create rep records from activities with zero revenue
  let displayReps = reps;
  if (reps.length === 0 && activities.length > 0) {
    displayReps = activities.map(activity => ({
      full_name: activity.rep_name,
      role: 'Sales Pro',
      mtd_revenue: 0,
      monthly_goal: 0,
      variance_to_goal: 0,
      percent_to_goal: 0,
      pacing_percent: 0,
      days_remaining: new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate()
    }));
  }

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Rep Leaderboard</h1>
          <p className="text-sm text-gray-600 mt-1">Current month performance rankings</p>
        </div>
      </div>

      <main className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>MTD Performance</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Click column headers to sort • Click rep name to view details
            </p>
          </CardHeader>
          <CardContent>
            <SortableLeaderboard reps={displayReps} activities={activities} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
