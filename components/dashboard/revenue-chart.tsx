'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/api';

interface RevenueChartProps {
  data: Array<{
    date_id: string;
    daily_revenue: number;
  }>;
}

export function RevenueChart({ data }: RevenueChartProps) {
  // Transform data for the chart
  const chartData = data.map((item) => ({
    date: new Date(item.date_id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: item.daily_revenue,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3">
          <p className="text-sm font-semibold text-gray-900">{payload[0].payload.date}</p>
          <p className="text-sm text-gray-600">
            Revenue: <span className="font-bold text-blue-600">{formatCurrency(payload[0].value)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Daily Revenue Trend</CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              stroke="#6b7280"
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="#6b7280"
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
              name="Daily Revenue"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
