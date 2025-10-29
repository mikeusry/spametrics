'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/api';
import { Search, Filter, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface DailyEntry {
  date_id: string;
  daily_revenue: number;
  mtd_revenue: number;
  month_goal: number;
  percent_to_goal: number;
}

type SortColumn = 'date_id' | 'daily_revenue' | 'mtd_revenue' | 'month_goal' | 'percent_to_goal';
type SortDirection = 'asc' | 'desc';

interface SortableTableProps {
  entries: DailyEntry[];
}

export function SortableTable({ entries }: SortableTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('date_id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const itemsPerPage = 10;

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Get unique months for filter
  const months = useMemo(() => {
    const monthSet = new Set<string>();
    entries.forEach(entry => {
      const date = new Date(entry.date_id);
      const monthYear = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      monthSet.add(monthYear);
    });
    return Array.from(monthSet).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB.getTime() - dateA.getTime();
    });
  }, [entries]);

  // Filter and search entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Month filter
      if (selectedMonth !== 'all') {
        const entryMonth = new Date(entry.date_id).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        if (entryMonth !== selectedMonth) return false;
      }

      // Search filter
      if (searchQuery) {
        const dateStr = new Date(entry.date_id).toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }).toLowerCase();
        const revenueStr = formatCurrency(entry.daily_revenue).toLowerCase();
        const query = searchQuery.toLowerCase();
        return dateStr.includes(query) || revenueStr.includes(query);
      }

      return true;
    });
  }, [entries, selectedMonth, searchQuery]);

  // Sort entries
  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (sortColumn === 'date_id') {
        aVal = new Date(a.date_id).getTime();
        bVal = new Date(b.date_id).getTime();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredEntries, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedEntries.length / itemsPerPage);
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedEntries.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedEntries, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Daily Revenue', 'MTD Revenue', 'Month Goal', '% to Goal'];
    const csvData = sortedEntries.map(entry => [
      new Date(entry.date_id).toLocaleDateString('en-US'),
      entry.daily_revenue,
      entry.mtd_revenue,
      entry.month_goal,
      entry.percent_to_goal
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    const isActive = sortColumn === column;
    return (
      <svg
        className={`w-3 h-3 ml-1.5 transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400'}`}
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        {isActive && sortDirection === 'asc' ? (
          <path d="M12 4l-8 8h16l-8-8z"/>
        ) : isActive && sortDirection === 'desc' ? (
          <path d="M12 20l8-8H4l8 8z"/>
        ) : (
          <path d="M8.574 11.024h6.852a2.075 2.075 0 0 0 1.847-1.086 1.9 1.9 0 0 0-.11-1.986L13.736 2.9a2.122 2.122 0 0 0-3.472 0L6.837 7.952a1.9 1.9 0 0 0-.11 1.986 2.074 2.074 0 0 0 1.847 1.086Zm6.852 1.952H8.574a2.072 2.072 0 0 0-1.847 1.087 1.9 1.9 0 0 0 .11 1.985l3.426 5.05a2.123 2.123 0 0 0 3.472 0l3.427-5.05a1.9 1.9 0 0 0 .11-1.985 2.074 2.074 0 0 0-1.846-1.087Z"/>
        )}
      </svg>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-1 gap-4 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-5 h-5 text-gray-500" />
            </div>
            <Input
              type="search"
              placeholder="Search by date or revenue..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>

          {/* Month Filter */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setCurrentPage(1);
              }}
              className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="all">All Months</option>
              {months.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3">
              <button
                onClick={() => handleSort('date_id')}
                className="flex items-center hover:text-blue-600 transition-colors"
              >
                Date
                <SortIcon column="date_id" />
              </button>
            </th>
            <th scope="col" className="px-6 py-3">
              <button
                onClick={() => handleSort('daily_revenue')}
                className="flex items-center hover:text-blue-600 transition-colors"
              >
                Daily Revenue
                <SortIcon column="daily_revenue" />
              </button>
            </th>
            <th scope="col" className="px-6 py-3">
              <button
                onClick={() => handleSort('mtd_revenue')}
                className="flex items-center hover:text-blue-600 transition-colors"
              >
                MTD Revenue
                <SortIcon column="mtd_revenue" />
              </button>
            </th>
            <th scope="col" className="px-6 py-3">
              <button
                onClick={() => handleSort('month_goal')}
                className="flex items-center hover:text-blue-600 transition-colors"
              >
                Month Goal
                <SortIcon column="month_goal" />
              </button>
            </th>
            <th scope="col" className="px-6 py-3">
              <button
                onClick={() => handleSort('percent_to_goal')}
                className="flex items-center hover:text-blue-600 transition-colors"
              >
                % to Goal
                <SortIcon column="percent_to_goal" />
              </button>
            </th>
            <th scope="col" className="px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {paginatedEntries.map((entry) => {
            const isNegative = entry.daily_revenue < 0;
            const isLowPerformance = entry.percent_to_goal < 50;

            return (
              <tr key={entry.date_id} className="bg-white border-b hover:bg-gray-50">
                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                  {new Date(entry.date_id).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </th>
                <td className={`px-6 py-4 font-mono ${isNegative ? 'text-red-600 font-bold' : 'text-gray-900'}`}>
                  {formatCurrency(entry.daily_revenue)}
                </td>
                <td className="px-6 py-4 font-mono text-gray-900">
                  {formatCurrency(entry.mtd_revenue)}
                </td>
                <td className="px-6 py-4 font-mono text-gray-500">
                  {formatCurrency(entry.month_goal)}
                </td>
                <td className="px-6 py-4">
                  <Badge
                    variant={isLowPerformance ? "destructive" : "default"}
                    className={isLowPerformance ? "" : "bg-green-100 text-green-800 border-green-200"}
                  >
                    {entry.percent_to_goal?.toFixed(1)}%
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  <a
                    href={`/daily-log/${entry.date_id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    View Details
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="text-sm text-gray-700">
          Showing <span className="font-semibold text-gray-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
          <span className="font-semibold text-gray-900">
            {Math.min(currentPage * itemsPerPage, sortedEntries.length)}
          </span>{' '}
          of <span className="font-semibold text-gray-900">{sortedEntries.length}</span> entries
        </div>

        <nav className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;

              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  className="min-w-[2.5rem]"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </nav>
      </div>
    </div>
  );
}
