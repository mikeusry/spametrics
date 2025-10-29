import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SortableTable } from '@/components/daily-log/sortable-table';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Daily Log | Spametrics',
  description: 'Daily revenue entries and performance log',
};

interface DailyEntry {
  date_id: string;
  daily_revenue: number;
  mtd_revenue: number;
  month_goal: number;
  percent_to_goal: number;
}

export default async function DailyLogPage() {
  // Fetch all daily entries
  const { data: entries } = await supabase
    .from('daily_summary_metrics')
    .select('date_id, daily_revenue, mtd_revenue, month_goal, percent_to_goal')
    .order('date_id', { ascending: false });

  const dailyEntries = (entries || []) as DailyEntry[];

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Daily Log</h1>
            <p className="text-sm text-gray-600 mt-1">Complete history of daily revenue entries</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{dailyEntries.length} Days</p>
            <p className="text-xs text-gray-500">Total Entries</p>
          </div>
        </div>
      </div>

      <main className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>All Daily Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <SortableTable entries={dailyEntries} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
