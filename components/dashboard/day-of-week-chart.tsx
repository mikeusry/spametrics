'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { DayOfWeekSales } from '@/lib/api';

interface DayOfWeekChartProps {
  data: DayOfWeekSales[];
  title: string;
  description: string;
}

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

export function DayOfWeekChart({ data, title, description }: DayOfWeekChartProps) {
  if (!data || data.length === 0) {
    return null;
  }

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
