import { formatCurrency, formatPercent, getStoreDayOfWeekSales } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DayOfWeekChart } from '@/components/dashboard/day-of-week-chart';
import { createClient } from '@supabase/supabase-js';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const dynamic = 'force-dynamic';

const storeNames: { [key: string]: string } = {
  'athens': 'Athens',
  'alpharetta': 'Alpharetta',
  'augusta': 'Augusta',
  'blairsville': 'Blairsville',
  'blue-ridge': 'Blue Ridge',
  'buford': 'Buford',
  'kennesaw': 'Kennesaw',
  'lake-oconee': 'Oconee',
  'newnan': 'Newnan',
  'warehouse': 'Warehouse',
  'costco': 'Costco',
};

export async function generateMetadata({ params }: { params: Promise<{ store: string }> }): Promise<Metadata> {
  const { store } = await params;
  const storeName = storeNames[store] || store;
  return {
    title: `${storeName} | Spametrics`,
    description: `Performance metrics for ${storeName} store location`,
  };
}

export default async function StorePage({ params }: { params: Promise<{ store: string }> }) {
  const { store } = await params;
  const storeName = storeNames[store];

  if (!storeName) {
    notFound();
  }

  // Get latest date
  const { data: latestDate } = await supabase
    .from('daily_summary_metrics')
    .select('date_id')
    .order('date_id', { ascending: false })
    .limit(1)
    .single();

  if (!latestDate) {
    return <div>No data available</div>;
  }

  // Get first day of that month
  const date = new Date(latestDate.date_id);
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayStr = firstDay.toISOString().split('T')[0];

  // Get store data for current month
  const { data: storeData } = await supabase
    .from('daily_store_revenue')
    .select(`
      date_id,
      daily_revenue,
      mtd_revenue,
      goal_revenue,
      ly_revenue,
      store_id,
      stores!inner(store_name, region)
    `)
    .eq('stores.store_name', storeName)
    .gte('date_id', firstDayStr)
    .order('date_id', { ascending: false });

  const latestData = storeData?.[0];
  const percentToGoal = latestData?.goal_revenue
    ? (latestData.mtd_revenue / latestData.goal_revenue) * 100
    : 0;

  // Get day of week sales data
  const storeId = latestData?.store_id;
  const dayOfWeekData = storeId ? await getStoreDayOfWeekSales(storeId) : [];

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{storeName}</h1>
          <p className="text-sm text-gray-600 mt-1">
            Store Performance • {(latestData as any)?.stores?.region} Region
          </p>
        </div>
      </div>

      <main className="p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">MTD Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(latestData?.mtd_revenue)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Monthly Goal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(latestData?.goal_revenue)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">% to Goal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${percentToGoal >= 100 ? 'text-green-600' : 'text-gray-900'}`}>
                {formatPercent(percentToGoal)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">Latest Daily</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(latestData?.daily_revenue)}</p>
              <p className="text-xs text-gray-500 mt-1">{latestData?.date_id}</p>
            </CardContent>
          </Card>
        </div>

        {/* Day of Week Sales Chart */}
        {dayOfWeekData.length > 0 && (
          <div className="mb-8">
            <DayOfWeekChart
              data={dayOfWeekData}
              title={`${storeName} - Sales by Day of Week`}
              description="Average daily sales for each day of the week (current month)"
            />
          </div>
        )}

        {/* Daily Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Performance - Current Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">Daily Revenue</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">MTD Revenue</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-700">% to Goal</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {storeData?.map((day: any) => {
                    const dayPercent = day.goal_revenue ? (day.mtd_revenue / day.goal_revenue) * 100 : 0;
                    return (
                      <tr key={day.date_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{day.date_id}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          {formatCurrency(day.daily_revenue)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {formatCurrency(day.mtd_revenue)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={dayPercent >= 100 ? 'text-green-600 font-semibold' : ''}>
                            {formatPercent(dayPercent)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
