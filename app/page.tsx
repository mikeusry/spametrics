import { KPICard } from '@/components/dashboard/kpi-card';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { CumulativeStoreChart } from '@/components/dashboard/cumulative-store-chart';
import { DayOfWeekChartInteractive } from '@/components/dashboard/day-of-week-chart-interactive';
import { RepActivityChart } from '@/components/dashboard/rep-activity-chart';
import {
  getCurrentMTDSummary,
  getCurrentStorePerformance,
  getCurrentRepPerformance,
  getDailyRevenueTrend,
  getCumulativeStoreRevenue,
  getNGARevenue,
  getCompanyDayOfWeekSales,
  formatCurrency,
  formatPercent,
} from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Dashboard | Spametrics',
  description: 'Georgia Spa Company Sales Dashboard',
};

export default async function DashboardPage() {
  // Fetch all data in parallel
  const [summary, stores, reps, dailyTrend, cumulativeStoreData, ngaRevenue, dayOfWeekData] = await Promise.all([
    getCurrentMTDSummary(),
    getCurrentStorePerformance(),
    getCurrentRepPerformance(),
    getDailyRevenueTrend(),
    getCumulativeStoreRevenue(),
    getNGARevenue(),
    getCompanyDayOfWeekSales(),
  ]);

  // Calculate YoY change
  const yoyChange = summary?.ly_mtd_revenue
    ? ((summary.mtd_revenue! - summary.ly_mtd_revenue) / summary.ly_mtd_revenue) * 100
    : 0;

  const yoyTrend = yoyChange > 0 ? 'up' : yoyChange < 0 ? 'down' : 'neutral';

  // Calculate month completion percentage
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const totalDaysInMonth = lastDay.getDate();
  const daysPassed = today.getDate();
  const monthCompletion = (daysPassed / totalDaysInMonth) * 100;

  return (
    <div>
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">Overview of company performance</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Month {monthCompletion.toFixed(1)}% Complete • MTD Performance
            </p>
          </div>
        </div>
      </div>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-3">
          <KPICard
            title="MTD Revenue"
            value={formatCurrency(summary?.mtd_revenue)}
            subtitle={`Goal: ${formatCurrency(summary?.month_goal)}`}
          />
          <KPICard
            title="% to Goal"
            value={formatPercent(summary?.percent_to_goal)}
            change={summary?.percent_to_goal ? Math.round(summary.percent_to_goal - 100) : 0}
            trend={
              summary && summary.percent_to_goal
                ? summary.percent_to_goal >= 100
                  ? 'up'
                  : 'down'
                : 'neutral'
            }
            changeLabel="vs. 100% target"
          />
          <KPICard
            title="New Store Revenue"
            value={formatCurrency(ngaRevenue)}
            subtitle="Oconee + Blue Ridge + Blairsville"
          />
        </div>

        {/* Revenue Trend Chart */}
        {dailyTrend.length > 0 && (
          <div className="mb-8">
            <RevenueChart data={dailyTrend} />
          </div>
        )}

        {/* Cumulative Store Revenue Chart */}
        {cumulativeStoreData.length > 0 && (
          <div className="mb-8">
            <CumulativeStoreChart data={cumulativeStoreData} />
          </div>
        )}

        {/* Day of Week Sales Chart */}
        {dayOfWeekData.length > 0 && (
          <div className="mb-8">
            <DayOfWeekChartInteractive
              initialData={dayOfWeekData}
              title="Average Sales by Day of Week"
              description="Company-wide average daily sales for each day of the week"
            />
          </div>
        )}

        {/* Sales Rep Activity Chart */}
        <div className="mb-8">
          <RepActivityChart />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Store Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Store Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead className="text-right text-gray-500">Goal</TableHead>
                    <TableHead className="text-right">MTD Revenue</TableHead>
                    <TableHead className="text-right">% to Goal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.slice(0, 10).map((store) => {
                    const storeSlug = store.store_name.toLowerCase().replace(/\s+/g, '-');
                    return (
                      <TableRow key={store.store_name}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/stores/${storeSlug}`}
                            className="text-primary hover:underline"
                          >
                            {store.store_name}
                          </Link>
                          {store.region && (
                            <Badge
                              variant="outline"
                              className={`ml-2 text-xs ${
                                store.region === 'East' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                store.region === 'West' ? 'bg-green-50 text-green-700 border-green-200' :
                                store.region === 'North' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                'bg-gray-50 text-gray-700 border-gray-200'
                              }`}
                            >
                              {store.region}
                            </Badge>
                          )}
                        </TableCell>
                      <TableCell className="text-right font-mono text-gray-500">
                        {formatCurrency(store.store_goal)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(store.mtd_revenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            store.percent_to_goal && store.percent_to_goal >= 100
                              ? 'text-green-600 font-semibold'
                              : 'text-gray-900'
                          }
                        >
                          {formatPercent(store.percent_to_goal)}
                        </span>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Sales Rep Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Rep Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Rep</TableHead>
                    <TableHead className="text-right">MTD Revenue</TableHead>
                    <TableHead className="text-right">% to Goal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reps.slice(0, 10).map((rep, index) => (
                    <TableRow key={rep.full_name}>
                      <TableCell>
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-full ${
                            index === 0
                              ? 'bg-yellow-100 text-yellow-700 font-bold'
                              : index === 1
                              ? 'bg-gray-100 text-gray-700 font-bold'
                              : index === 2
                              ? 'bg-orange-100 text-orange-700 font-bold'
                              : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          {index + 1}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{rep.full_name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(rep.mtd_revenue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            rep.percent_to_goal && rep.percent_to_goal >= 100
                              ? 'text-green-600 font-semibold'
                              : 'text-gray-900'
                          }
                        >
                          {formatPercent(rep.percent_to_goal)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 text-center">
                <Link
                  href="/sales-reps"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  View Full Leaderboard →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
