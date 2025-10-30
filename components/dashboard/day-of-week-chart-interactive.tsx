'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { getCompanyDayOfWeekSales, type DayOfWeekSales } from '@/lib/api';
import { Calendar } from 'lucide-react';

// Colors for each day of the week (brand palette)
const DAY_COLORS: { [key: number]: string } = {
  0: '#ef4444', // Sunday - Red
  1: '#3b82f6', // Monday - Blue (primary)
  2: '#10b981', // Tuesday - Green
  3: '#f59e0b', // Wednesday - Amber
  4: '#8b5cf6', // Thursday - Purple
  5: '#06b6d4', // Friday - Cyan
  6: '#ec4899', // Saturday - Pink
};

type DateRange = 'month' | 'quarter' | 'year' | 'ytd';

interface Props {
  initialData: DayOfWeekSales[];
  title: string;
  description: string;
}

export function DayOfWeekChartInteractive({ initialData, title, description }: Props) {
  const [data, setData] = useState<DayOfWeekSales[]>(initialData);
  const [selectedRange, setSelectedRange] = useState<DateRange>('month');
  const [loading, setLoading] = useState(false);

  // Calculate date ranges
  const getDateRange = (range: DateRange): { startDate: string; endDate: string; label: string } => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    switch (range) {
      case 'month':
        // Current month
        const firstDayOfMonth = new Date(year, month, 1);
        return {
          startDate: firstDayOfMonth.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
          label: 'This Month'
        };

      case 'quarter':
        // Current quarter
        const quarterStartMonth = Math.floor(month / 3) * 3;
        const firstDayOfQuarter = new Date(year, quarterStartMonth, 1);
        return {
          startDate: firstDayOfQuarter.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
          label: `Q${Math.floor(month / 3) + 1} ${year}`
        };

      case 'year':
        // Last 12 months
        const twelveMonthsAgo = new Date(year - 1, month, 1);
        return {
          startDate: twelveMonthsAgo.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
          label: 'Last 12 Months'
        };

      case 'ytd':
        // Year to date
        const firstDayOfYear = new Date(year, 0, 1);
        return {
          startDate: firstDayOfYear.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
          label: 'Year to Date'
        };

      default:
        return {
          startDate: new Date(year, month, 1).toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
          label: 'This Month'
        };
    }
  };

  // Fetch data for selected range
  const fetchData = async (range: DateRange) => {
    setLoading(true);
    const { startDate, endDate } = getDateRange(range);

    try {
      const newData = await getCompanyDayOfWeekSales(startDate, endDate);
      setData(newData);
    } catch (error) {
      console.error('Error fetching day of week data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle range change
  const handleRangeChange = (range: DateRange) => {
    setSelectedRange(range);
    fetchData(range);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format data for chart - abbreviate day names
  const chartData = data.map(item => ({
    ...item,
    day_abbr: item.day_of_week.substring(0, 3), // Mon, Tue, Wed, etc.
  }));

  const currentLabel = getDateRange(selectedRange).label;

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>No data available for the selected period</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              {description} • {currentLabel}
            </CardDescription>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1">
              <Button
                variant={selectedRange === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRangeChange('month')}
                disabled={loading}
              >
                Month
              </Button>
              <Button
                variant={selectedRange === 'quarter' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRangeChange('quarter')}
                disabled={loading}
              >
                Quarter
              </Button>
              <Button
                variant={selectedRange === 'ytd' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRangeChange('ytd')}
                disabled={loading}
              >
                YTD
              </Button>
              <Button
                variant={selectedRange === 'year' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRangeChange('year')}
                disabled={loading}
              >
                12 Mo
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[350px]">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="day_abbr"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatCurrency}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => {
                    const item = chartData.find(d => d.day_abbr === label);
                    return item ? item.day_of_week : label;
                  }}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                />
                <Bar dataKey="average_revenue" name="Average Revenue" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={DAY_COLORS[entry.day_number]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Summary stats */}
            <div className="mt-6 grid grid-cols-3 gap-6 text-center border-t border-border pt-4">
              <div className="flex flex-col items-center justify-center">
                <p className="text-xs font-medium text-muted-foreground mb-2">Highest Day</p>
                <p className="text-base font-bold text-foreground mb-1">
                  {data.reduce((max, item) => item.average_revenue > max.average_revenue ? item : max).day_of_week}
                </p>
                <p className="text-sm font-semibold text-primary">
                  {formatCurrency(Math.max(...data.map(d => d.average_revenue)))}
                </p>
              </div>
              <div className="flex flex-col items-center justify-center border-l border-r border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">Average</p>
                <p className="text-base font-bold text-foreground mb-1">&nbsp;</p>
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(data.reduce((sum, d) => sum + d.average_revenue, 0) / data.length)}
                </p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-xs font-medium text-muted-foreground mb-2">Lowest Day</p>
                <p className="text-base font-bold text-foreground mb-1">
                  {data.reduce((min, item) => item.average_revenue < min.average_revenue ? item : min).day_of_week}
                </p>
                <p className="text-sm font-semibold text-destructive">
                  {formatCurrency(Math.min(...data.map(d => d.average_revenue)))}
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
