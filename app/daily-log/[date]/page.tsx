import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/api';
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { date } = await params;
  return {
    title: `Daily Detail - ${date} | Spametrics`,
    description: `Detailed revenue breakdown for ${date}`,
  };
}

export default async function DailyDetailPage({ params }: PageProps) {
  const { date } = await params;

  // Fetch summary for this date
  const { data: summary } = await supabase
    .from('daily_summary_metrics')
    .select('*')
    .eq('date_id', date)
    .single();

  if (!summary) {
    notFound();
  }

  // Fetch store performance for this date
  const { data: stores } = await supabase
    .from('daily_store_revenue')
    .select(`
      *,
      stores (store_name, location, region)
    `)
    .eq('date_id', date)
    .order('daily_revenue', { ascending: false });

  // Calculate NGA and New Stores totals
  const blueRidge = stores?.find(s => s.stores?.store_name === 'Blue Ridge');
  const blairsville = stores?.find(s => s.stores?.store_name === 'Blairsville');
  const oconee = stores?.find(s => s.stores?.store_name === 'Oconee');

  const ngaDaily = (blueRidge?.daily_revenue || 0) + (blairsville?.daily_revenue || 0);
  const ngaMTD = (blueRidge?.mtd_revenue || 0) + (blairsville?.mtd_revenue || 0);

  const newStoresDaily = ngaDaily + (oconee?.daily_revenue || 0);
  const newStoresMTD = ngaMTD + (oconee?.mtd_revenue || 0);

  // Get adjacent dates for navigation
  const { data: prevDate } = await supabase
    .from('daily_summary_metrics')
    .select('date_id')
    .lt('date_id', date)
    .order('date_id', { ascending: false })
    .limit(1)
    .single();

  const { data: nextDate } = await supabase
    .from('daily_summary_metrics')
    .select('date_id')
    .gt('date_id', date)
    .order('date_id', { ascending: true })
    .limit(1)
    .single();

  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const dayOfMonth = dateObj.getDate();
  const percentToGoal = summary.percent_to_goal || 0;
  const isOnTrack = percentToGoal >= 100;

  return (
    <div className="min-h-screen">
      {/* Page Header with Navigation */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <Link
              href="/daily-log"
              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              Back to Daily Log
            </Link>
            <div className="flex gap-2">
              {prevDate && (
                <Link href={`/daily-log/${prevDate.date_id}`}>
                  <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    <ArrowLeftIcon className="w-4 h-4 mr-1" />
                    Previous
                  </button>
                </Link>
              )}
              {nextDate && (
                <Link href={`/daily-log/${nextDate.date_id}`}>
                  <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    Next
                    <ArrowRightIcon className="w-4 h-4 ml-1" />
                  </button>
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
              <CalendarIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{formattedDate}</h1>
              <p className="text-sm text-gray-500">Day {dayOfMonth} of the month</p>
            </div>
          </div>
        </div>
      </div>

      <main className="p-6 space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Daily Revenue */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Daily Revenue</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                summary.daily_revenue >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {summary.daily_revenue >= 0 ? '+' : ''}{((summary.daily_revenue / summary.mtd_revenue) * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.daily_revenue)}</p>
            <p className="text-xs text-gray-500 mt-2">of total MTD revenue</p>
          </div>

          {/* MTD Revenue */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">MTD Revenue</h3>
              {isOnTrack && (
                <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.mtd_revenue)}</p>
            <p className="text-xs text-gray-500 mt-2">Goal: {formatCurrency(summary.month_goal)}</p>
          </div>

          {/* % to Goal */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Progress to Goal</h3>
            </div>
            <p className={`text-2xl font-bold ${isOnTrack ? 'text-green-600' : 'text-gray-900'}`}>
              {percentToGoal.toFixed(1)}%
            </p>
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${isOnTrack ? 'bg-green-600' : 'bg-blue-600'}`}
                  style={{ width: `${Math.min(percentToGoal, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Remaining to Goal */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Standing to Goal</h3>
            </div>
            <p className={`text-2xl font-bold ${summary.standing_to_goal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.standing_to_goal)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {summary.standing_to_goal >= 0 ? 'Above' : 'Below'} target
            </p>
          </div>
        </div>

        {/* NGA & New Stores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* NGA Revenue */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">NGA Revenue</h3>
              <p className="text-sm text-gray-500">Blue Ridge + Blairsville</p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Daily</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(ngaDaily)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">MTD</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(ngaMTD)}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Blue Ridge</span>
                  <span className="font-mono font-medium">{formatCurrency(blueRidge?.daily_revenue || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Blairsville</span>
                  <span className="font-mono font-medium">{formatCurrency(blairsville?.daily_revenue || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* New Stores Revenue */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">New Store Revenue</h3>
              <p className="text-sm text-gray-500">NGA + Lake Oconee</p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Daily</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(newStoresDaily)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">MTD</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(newStoresMTD)}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">NGA Total</span>
                  <span className="font-mono font-medium">{formatCurrency(ngaDaily)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Lake Oconee</span>
                  <span className="font-mono font-medium">{formatCurrency(oconee?.daily_revenue || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Store Performance Table */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Store Performance</h3>
            <p className="text-sm text-gray-500">Breakdown by location</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-6 py-3 font-semibold">Store</th>
                  <th scope="col" className="px-6 py-3 font-semibold">Region</th>
                  <th scope="col" className="px-6 py-3 font-semibold text-right">Daily</th>
                  <th scope="col" className="px-6 py-3 font-semibold text-right">MTD</th>
                  <th scope="col" className="px-6 py-3 font-semibold text-right">% of Total</th>
                  <th scope="col" className="px-6 py-3 font-semibold text-right">% to Goal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stores?.map((store) => {
                  const percentOfTotal = summary.daily_revenue
                    ? (store.daily_revenue / summary.daily_revenue) * 100
                    : 0;
                  const storePercentToGoal = store.percent_to_goal || 0;

                  return (
                    <tr key={store.revenue_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {store.stores?.store_name}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                          store.stores?.region === 'East' ? 'bg-blue-50 text-blue-700' :
                          store.stores?.region === 'West' ? 'bg-green-50 text-green-700' :
                          store.stores?.region === 'North' ? 'bg-purple-50 text-purple-700' :
                          'bg-gray-50 text-gray-700'
                        }`}>
                          {store.stores?.region}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-900">
                        {formatCurrency(store.daily_revenue)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-900">
                        {formatCurrency(store.mtd_revenue)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{ width: `${Math.min(percentOfTotal, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700 w-10 text-right">
                            {percentOfTotal.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          storePercentToGoal >= 100 ? 'bg-green-100 text-green-800' :
                          storePercentToGoal >= 90 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {storePercentToGoal.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr className="font-semibold text-gray-900">
                  <td className="px-6 py-4" colSpan={2}>Total</td>
                  <td className="px-6 py-4 text-right font-mono">{formatCurrency(summary.daily_revenue)}</td>
                  <td className="px-6 py-4 text-right font-mono">{formatCurrency(summary.mtd_revenue)}</td>
                  <td className="px-6 py-4 text-right">100%</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      percentToGoal >= 100 ? 'bg-green-100 text-green-800' :
                      percentToGoal >= 90 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {percentToGoal.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
