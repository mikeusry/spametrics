import { getCurrentRepPerformance, formatCurrency, formatPercent } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sales Rep Leaderboard | Spametrics',
  description: 'Sales representative performance rankings',
};

export default async function SalesRepsPage() {
  const reps = await getCurrentRepPerformance();

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
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Sales Rep</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">MTD Revenue</TableHead>
                  <TableHead className="text-right">Goal</TableHead>
                  <TableHead className="text-right">% to Goal</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reps.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No sales rep data available
                    </TableCell>
                  </TableRow>
                ) : (
                  reps.map((rep, index) => (
                    <TableRow key={rep.full_name}>
                      <TableCell className="font-semibold text-gray-500">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{rep.full_name}</TableCell>
                      <TableCell className="text-gray-600">{rep.role}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(rep.mtd_revenue)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-gray-500">
                        {formatCurrency(rep.monthly_goal)}
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
                      <TableCell className="text-right font-mono">
                        <span
                          className={
                            rep.variance_to_goal && rep.variance_to_goal >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {formatCurrency(rep.variance_to_goal)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
