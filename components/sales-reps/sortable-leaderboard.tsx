'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatPercent } from '@/lib/api';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface RepPerformance {
  full_name: string;
  role: string | null;
  mtd_revenue: number | null;
  monthly_goal: number | null;
  variance_to_goal: number | null;
  percent_to_goal: number | null;
  pacing_percent: number | null;
  days_remaining: number;
}

interface RepActivitySummary {
  rep_id: number;
  rep_name: string;
  total_calls: number;
  total_emails: number;
  total_meetings: number;
  total_notes: number;
  total_tasks: number;
  total_sms: number;
  total_activities: number;
}

interface SortableLeaderboardProps {
  reps: RepPerformance[];
  activities: RepActivitySummary[];
}

type SortKey = 'rank' | 'name' | 'revenue' | 'goal' | 'percent' | 'pacing' | 'variance' | 'activities';
type SortDirection = 'asc' | 'desc';

function getPacingColor(pacing: number | null, daysRemaining: number): string {
  if (pacing === null) return 'text-gray-400';

  if (daysRemaining > 10) {
    if (pacing >= 80) return 'text-green-600 font-semibold';
    if (pacing >= 60) return 'text-yellow-600 font-semibold';
    return 'text-red-600 font-semibold';
  } else {
    if (pacing >= 95) return 'text-green-600 font-semibold';
    if (pacing >= 85) return 'text-yellow-600 font-semibold';
    return 'text-red-600 font-semibold';
  }
}

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

export function SortableLeaderboard({ reps, activities }: SortableLeaderboardProps) {
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const activityMap = useMemo(
    () => new Map(activities.map(a => [a.rep_name, a])),
    [activities]
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection(key === 'name' ? 'asc' : 'desc');
    }
  };

  const sortedReps = useMemo(() => {
    const sorted = [...reps].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortKey) {
        case 'name':
          aVal = a.full_name;
          bVal = b.full_name;
          break;
        case 'revenue':
          aVal = a.mtd_revenue || 0;
          bVal = b.mtd_revenue || 0;
          break;
        case 'goal':
          aVal = a.monthly_goal || 0;
          bVal = b.monthly_goal || 0;
          break;
        case 'percent':
          aVal = a.percent_to_goal || 0;
          bVal = b.percent_to_goal || 0;
          break;
        case 'pacing':
          aVal = a.pacing_percent || 0;
          bVal = b.pacing_percent || 0;
          break;
        case 'variance':
          aVal = a.variance_to_goal || 0;
          bVal = b.variance_to_goal || 0;
          break;
        case 'activities':
          const aActivity = activityMap.get(a.full_name);
          const bActivity = activityMap.get(b.full_name);
          aVal = aActivity?.total_activities || 0;
          bVal = bActivity?.total_activities || 0;
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [reps, sortKey, sortDirection, activityMap]);

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4 text-primary" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4 text-primary" />
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>
            <button
              onClick={() => handleSort('name')}
              className="flex items-center hover:text-primary transition-colors"
            >
              Sales Rep
              <SortIcon columnKey="name" />
            </button>
          </TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="text-right">
            <button
              onClick={() => handleSort('revenue')}
              className="flex items-center ml-auto hover:text-primary transition-colors"
            >
              MTD Revenue
              <SortIcon columnKey="revenue" />
            </button>
          </TableHead>
          <TableHead className="text-right">
            <button
              onClick={() => handleSort('goal')}
              className="flex items-center ml-auto hover:text-primary transition-colors"
            >
              Goal
              <SortIcon columnKey="goal" />
            </button>
          </TableHead>
          <TableHead className="text-right">
            <button
              onClick={() => handleSort('percent')}
              className="flex items-center ml-auto hover:text-primary transition-colors"
            >
              % to Goal
              <SortIcon columnKey="percent" />
            </button>
          </TableHead>
          <TableHead className="text-right">
            <button
              onClick={() => handleSort('pacing')}
              className="flex items-center ml-auto hover:text-primary transition-colors"
            >
              Pacing
              <SortIcon columnKey="pacing" />
            </button>
          </TableHead>
          <TableHead className="text-right">
            <button
              onClick={() => handleSort('variance')}
              className="flex items-center ml-auto hover:text-primary transition-colors"
            >
              Variance
              <SortIcon columnKey="variance" />
            </button>
          </TableHead>
          <TableHead className="text-right bg-purple-50">
            <button
              onClick={() => handleSort('activities')}
              className="flex items-center ml-auto hover:text-primary transition-colors"
            >
              Total Activities
              <SortIcon columnKey="activities" />
            </button>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedReps.length === 0 ? (
          <TableRow>
            <TableCell colSpan={10} className="text-center text-gray-500 py-8">
              No sales rep data available
            </TableCell>
          </TableRow>
        ) : (
          sortedReps.map((rep, index) => {
            const activity = activityMap.get(rep.full_name);
            const slug = nameToSlug(rep.full_name);

            return (
              <TableRow key={rep.full_name} className="hover:bg-gray-50">
                <TableCell className="font-semibold text-gray-500">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/sales-reps/${slug}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {rep.full_name}
                  </Link>
                </TableCell>
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
                <TableCell className="text-right">
                  <span className={getPacingColor(rep.pacing_percent, rep.days_remaining)}>
                    {rep.pacing_percent !== null ? `${rep.pacing_percent.toFixed(1)}%` : 'N/A'}
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
                <TableCell className="text-right bg-purple-50">
                  <span className="text-lg font-bold text-purple-900">
                    {activity?.total_activities || 0}
                  </span>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
