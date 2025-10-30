'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getRepActivitySummary, type RepActivitySummary } from '@/lib/api';

export function RepActivityChart() {
  const [data, setData] = useState<RepActivitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Get current month date range
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const startDate = firstDay.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        const activities = await getRepActivitySummary(startDate, endDate);
        setData(activities.slice(0, 10)); // Top 10 reps
        setError(null);
      } catch (err) {
        console.error('Error fetching activity data:', err);
        setError('Failed to load activity data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Rep Activity - This Month</CardTitle>
          <CardDescription>HubSpot activity tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Rep Activity - This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Rep Activity - This Month</CardTitle>
          <CardDescription>HubSpot activity tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No activity data available for this month.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Rep Activity - This Month</CardTitle>
        <CardDescription>Top 10 sales reps by total HubSpot activities</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="rep_name" type="category" width={110} />
            <Tooltip />
            <Legend />
            <Bar dataKey="total_calls" name="Calls" fill="#8b5cf6" stackId="a" />
            <Bar dataKey="total_emails" name="Emails" fill="#3b82f6" stackId="a" />
            <Bar dataKey="total_meetings" name="Meetings" fill="#10b981" stackId="a" />
            <Bar dataKey="total_notes" name="Notes" fill="#f59e0b" stackId="a" />
            <Bar dataKey="total_sms" name="SMS" fill="#ec4899" stackId="a" />
          </BarChart>
        </ResponsiveContainer>

        {/* Summary stats */}
        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-4">
          <div className="text-center">
            <p className="text-xs font-medium text-muted-foreground mb-1">Most Active</p>
            <p className="text-base font-bold text-foreground">{data[0]?.rep_name}</p>
            <p className="text-sm font-semibold text-primary">{data[0]?.total_activities} activities</p>
          </div>
          <div className="text-center border-l border-r border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Total Activities</p>
            <p className="text-base font-bold text-foreground">&nbsp;</p>
            <p className="text-sm font-semibold text-foreground">
              {data.reduce((sum, d) => sum + d.total_activities, 0).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-muted-foreground mb-1">Average/Rep</p>
            <p className="text-base font-bold text-foreground">&nbsp;</p>
            <p className="text-sm font-semibold text-foreground">
              {Math.round(data.reduce((sum, d) => sum + d.total_activities, 0) / data.length).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
