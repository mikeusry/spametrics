'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CumulativeStoreData } from '@/lib/api';

interface CumulativeStoreChartProps {
  data: CumulativeStoreData[];
}

const STORE_COLORS: { [key: string]: string } = {
  'Buford': '#3b82f6',
  'Athens': '#10b981',
  'Warehouse': '#f59e0b',
  'Kennesaw': '#ef4444',
  'Alpharetta': '#8b5cf6',
  'Augusta': '#ec4899',
  'Newnan': '#14b8a6',
  'Oconee': '#f97316',
  'Blue Ridge': '#6366f1',
  'Blairsville': '#84cc16',
  'Costco': '#06b6d4',
};

export function CumulativeStoreChart({ data }: CumulativeStoreChartProps) {
  const [hiddenStores, setHiddenStores] = useState<Set<string>>(new Set());

  if (!data || data.length === 0) {
    return null;
  }

  // Get all store names from the first data point
  const storeNames = Object.keys(data[0]).filter(key => key !== 'date_id');

  // Format data for chart - convert date_id to readable format
  const chartData = data.map(item => ({
    ...item,
    date: new Date(item.date_id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Toggle store visibility
  const handleLegendClick = (dataKey: string) => {
    setHiddenStores((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dataKey)) {
        newSet.delete(dataKey);
      } else {
        newSet.add(dataKey);
      }
      return newSet;
    });
  };

  // Count visible stores
  const visibleCount = storeNames.length - hiddenStores.size;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cumulative Store Revenue - MTD Trend</CardTitle>
        <CardDescription>
          Click on store names in the legend to show/hide lines ({visibleCount} of {storeNames.length} visible)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
            />
            <Legend
              onClick={(e) => handleLegendClick(e.dataKey as string)}
              wrapperStyle={{ cursor: 'pointer' }}
            />
            {storeNames.map((storeName) => (
              <Line
                key={storeName}
                type="monotone"
                dataKey={storeName}
                name={storeName}
                stroke={STORE_COLORS[storeName] || '#6b7280'}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                hide={hiddenStores.has(storeName)}
                strokeOpacity={hiddenStores.has(storeName) ? 0.2 : 1}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
