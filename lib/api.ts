import { supabase } from './supabase';

export interface DailySummary {
  date_id: string;
  month_goal: number | null;
  mtd_revenue: number | null;
  daily_revenue: number | null;
  ly_mtd_revenue: number | null;
  percent_to_goal: number | null;
  standing_to_goal: number | null;
}

export interface StorePerformance {
  store_name: string;
  store_type: string;
  region: string | null;
  mtd_revenue: number | null;
  store_goal: number | null;
  ly_revenue: number | null;
  percent_to_goal: number | null;
  percent_to_ly: number | null;
}

export interface RepPerformance {
  full_name: string;
  role: string | null;
  mtd_revenue: number | null;
  monthly_goal: number | null;
  variance_to_goal: number | null;
  percent_to_goal: number | null;
}

export interface DailyRevenueData {
  date_id: string;
  daily_revenue: number;
}

/**
 * Get current MTD summary metrics
 */
export async function getCurrentMTDSummary(): Promise<DailySummary | null> {
  const { data, error } = await supabase
    .from('daily_summary_metrics')
    .select('*')
    .order('date_id', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching MTD summary:', error);
    return null;
  }

  return data;
}

/**
 * Get all store performance for current month
 */
export async function getCurrentStorePerformance(): Promise<StorePerformance[]> {
  const { data, error } = await supabase
    .from('v_current_mtd_store_revenue')
    .select('*')
    .order('mtd_revenue', { ascending: false });

  if (error) {
    console.error('Error fetching store performance:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all sales rep performance for current month
 */
export async function getCurrentRepPerformance(): Promise<RepPerformance[]> {
  // Get the latest date in the system
  const { data: latestDate } = await supabase
    .from('daily_summary_metrics')
    .select('date_id')
    .order('date_id', { ascending: false })
    .limit(1)
    .single();

  if (!latestDate) return [];

  // Get first day of that month
  const date = new Date(latestDate.date_id);
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayStr = firstDay.toISOString().split('T')[0];

  // Query sales rep performance for that month
  const { data, error } = await supabase
    .from('daily_sales_rep_revenue')
    .select(`
      rep_id,
      sales_reps!inner(full_name, role, is_active),
      daily_revenue,
      mtd_revenue
    `)
    .gte('date_id', firstDayStr)
    .eq('sales_reps.is_active', true)
    .order('date_id', { ascending: false });

  if (error) {
    console.error('Error fetching rep performance:', error);
    return [];
  }

  // Group by rep and get latest MTD
  const repMap = new Map<number, RepPerformance>();

  data?.forEach((record: any) => {
    const repId = record.rep_id;
    if (!repMap.has(repId)) {
      repMap.set(repId, {
        full_name: record.sales_reps.full_name,
        role: record.sales_reps.role,
        mtd_revenue: record.mtd_revenue || 0,
        monthly_goal: 0,
        variance_to_goal: 0,
        percent_to_goal: 0
      });
    }
  });

  return Array.from(repMap.values()).sort((a, b) => (b.mtd_revenue || 0) - (a.mtd_revenue || 0));
}

/**
 * Get daily revenue trend for current month
 */
export async function getDailyRevenueTrend(): Promise<DailyRevenueData[]> {
  // Get first day of current month
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayStr = firstDay.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('daily_summary_metrics')
    .select('date_id, daily_revenue')
    .gte('date_id', firstDayStr)
    .order('date_id', { ascending: true });

  if (error) {
    console.error('Error fetching daily revenue trend:', error);
    return [];
  }

  return (data || []).map(d => ({
    date_id: d.date_id,
    daily_revenue: d.daily_revenue || 0
  }));
}

export interface CumulativeStoreData {
  date_id: string;
  [storeName: string]: number | string;
}

/**
 * Get cumulative store revenue for current month
 */
export async function getCumulativeStoreRevenue(): Promise<CumulativeStoreData[]> {
  // Get the latest date in the system
  const { data: latestDate } = await supabase
    .from('daily_summary_metrics')
    .select('date_id')
    .order('date_id', { ascending: false })
    .limit(1)
    .single();

  if (!latestDate) return [];

  // Get first day of that month
  const date = new Date(latestDate.date_id);
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayStr = firstDay.toISOString().split('T')[0];

  // Get all store revenue data for the month
  const { data, error } = await supabase
    .from('daily_store_revenue')
    .select(`
      date_id,
      mtd_revenue,
      stores!inner(store_name)
    `)
    .gte('date_id', firstDayStr)
    .order('date_id', { ascending: true });

  if (error) {
    console.error('Error fetching cumulative store revenue:', error);
    return [];
  }

  // Group by date and store
  const dateMap = new Map<string, CumulativeStoreData>();

  data?.forEach((record: any) => {
    const dateId = record.date_id;
    const storeName = record.stores.store_name;
    const mtdRevenue = record.mtd_revenue || 0;

    if (!dateMap.has(dateId)) {
      dateMap.set(dateId, { date_id: dateId });
    }

    const dateEntry = dateMap.get(dateId)!;
    dateEntry[storeName] = mtdRevenue;
  });

  return Array.from(dateMap.values());
}

/**
 * Get NGA (North Georgia) revenue
 */
export async function getNGARevenue(): Promise<number> {
  const { data, error } = await supabase
    .from('v_nga_revenue')
    .select('mtd_nga_revenue')
    .order('date_id', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching NGA revenue:', error);
    return 0;
  }

  return data?.mtd_nga_revenue || 0;
}

/**
 * Format currency
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0%';
  return `${value.toFixed(1)}%`;
}
