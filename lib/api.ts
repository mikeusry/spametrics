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
  pacing_percent: number | null;
  days_remaining: number;
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
  // Use actual current month, not latest data in system
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstDayStr = firstDay.toISOString().split('T')[0];

  // Get latest date for the current month
  const { data: latestDate } = await supabase
    .from('daily_summary_metrics')
    .select('date_id')
    .gte('date_id', firstDayStr)
    .order('date_id', { ascending: false })
    .limit(1)
    .maybeSingle();

  // If no data for current month, return empty array
  if (!latestDate) return [];

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

  // Get goals for this month
  const { data: goalsData } = await supabase
    .from('sales_rep_goals')
    .select('rep_id, monthly_goal')
    .eq('month', firstDayStr);

  // Create a map of goals by rep_id
  const goalsMap = new Map<number, number>();
  goalsData?.forEach((goal: any) => {
    goalsMap.set(goal.rep_id, goal.monthly_goal || 0);
  });

  // Calculate pacing metrics using actual current date
  const currentDate = today;
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const totalDaysInMonth = lastDayOfMonth.getDate();
  const daysPassed = currentDate.getDate();
  const daysRemaining = totalDaysInMonth - daysPassed;
  const expectedPercentComplete = (daysPassed / totalDaysInMonth) * 100;

  // Group by rep and get latest MTD
  const repMap = new Map<number, RepPerformance>();

  data?.forEach((record: any) => {
    const repId = record.rep_id;
    if (!repMap.has(repId)) {
      const mtdRevenue = record.mtd_revenue || 0;
      const monthlyGoal = goalsMap.get(repId) || 0;
      const varianceToGoal = mtdRevenue - monthlyGoal;
      const percentToGoal = monthlyGoal > 0 ? (mtdRevenue / monthlyGoal) * 100 : 0;

      // Calculate pacing: (Actual % to Goal / Expected % Complete) × 100
      let pacingPercent = null;
      if (monthlyGoal > 0 && expectedPercentComplete > 0) {
        pacingPercent = (percentToGoal / expectedPercentComplete) * 100;
      }

      repMap.set(repId, {
        full_name: record.sales_reps.full_name,
        role: record.sales_reps.role,
        mtd_revenue: mtdRevenue,
        monthly_goal: monthlyGoal,
        variance_to_goal: varianceToGoal,
        percent_to_goal: percentToGoal,
        pacing_percent: pacingPercent,
        days_remaining: daysRemaining
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

// =============================================
// GOAL MANAGEMENT API FUNCTIONS
// =============================================

export interface Store {
  store_id: number;
  store_name: string;
  store_type: string;
  region: string | null;
  is_active: boolean;
}

export interface SalesRep {
  rep_id: number;
  full_name: string;
  role: string | null;
  is_active: boolean;
}

export interface MonthlyGoal {
  goal_id?: number;
  month: string;
  store_id: number;
  store_name?: string;
  store_goal: number;
  company_goal?: number;
  ly_revenue?: number;
  work_days?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SalesRepGoal {
  rep_goal_id?: number;
  month: string;
  rep_id: number;
  full_name?: string;
  monthly_goal: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get all active stores
 */
export async function getStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('is_active', true)
    .order('store_name');

  if (error) {
    console.error('Error fetching stores:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all active sales reps
 */
export async function getSalesReps(): Promise<SalesRep[]> {
  const { data, error } = await supabase
    .from('sales_reps')
    .select('rep_id, full_name, role, is_active')
    .eq('is_active', true)
    .order('full_name');

  if (error) {
    console.error('Error fetching sales reps:', error);
    return [];
  }

  return data || [];
}

/**
 * Get monthly goals for a specific month
 */
export async function getMonthlyGoals(month: string): Promise<MonthlyGoal[]> {
  const { data, error } = await supabase
    .from('monthly_goals')
    .select(`
      *,
      stores!inner(store_name)
    `)
    .eq('month', month)
    .order('store_id');

  if (error) {
    console.error('Error fetching monthly goals:', error);
    return [];
  }

  return (data || []).map((record: any) => ({
    ...record,
    store_name: record.stores.store_name
  }));
}

/**
 * Get sales rep goals for a specific month
 */
export async function getSalesRepGoals(month: string): Promise<SalesRepGoal[]> {
  const { data, error } = await supabase
    .from('sales_rep_goals')
    .select(`
      *,
      sales_reps!inner(full_name)
    `)
    .eq('month', month)
    .order('rep_id');

  if (error) {
    console.error('Error fetching sales rep goals:', error);
    return [];
  }

  return (data || []).map((record: any) => ({
    ...record,
    full_name: record.sales_reps.full_name
  }));
}

/**
 * Upsert monthly store goal
 */
export async function upsertMonthlyGoal(goal: MonthlyGoal): Promise<boolean> {
  const { error } = await supabase
    .from('monthly_goals')
    .upsert({
      month: goal.month,
      store_id: goal.store_id,
      store_goal: goal.store_goal,
      company_goal: goal.company_goal || null,
      ly_revenue: goal.ly_revenue || null,
      work_days: goal.work_days || null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'month,store_id'
    });

  if (error) {
    console.error('Error upserting monthly goal:', error);
    return false;
  }

  return true;
}

/**
 * Upsert sales rep goal
 */
export async function upsertSalesRepGoal(goal: SalesRepGoal): Promise<boolean> {
  const { error } = await supabase
    .from('sales_rep_goals')
    .upsert({
      month: goal.month,
      rep_id: goal.rep_id,
      monthly_goal: goal.monthly_goal,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'month,rep_id'
    });

  if (error) {
    console.error('Error upserting sales rep goal:', error);
    return false;
  }

  return true;
}

/**
 * Delete monthly store goal
 */
export async function deleteMonthlyGoal(goalId: number): Promise<boolean> {
  const { error } = await supabase
    .from('monthly_goals')
    .delete()
    .eq('goal_id', goalId);

  if (error) {
    console.error('Error deleting monthly goal:', error);
    return false;
  }

  return true;
}

/**
 * Delete sales rep goal
 */
export async function deleteSalesRepGoal(repGoalId: number): Promise<boolean> {
  const { error } = await supabase
    .from('sales_rep_goals')
    .delete()
    .eq('rep_goal_id', repGoalId);

  if (error) {
    console.error('Error deleting sales rep goal:', error);
    return false;
  }

  return true;
}

// =============================================
// DAILY REVENUE DATA ENTRY API FUNCTIONS
// =============================================

export interface DailyStoreRevenue {
  revenue_id?: number;
  date_id: string;
  store_id: number;
  store_name?: string;
  daily_revenue: number;
  mtd_revenue?: number;
  ly_revenue?: number;
  goal_revenue?: number;
  percent_to_ly?: number;
  percent_to_goal?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DailySalesRepRevenue {
  rep_revenue_id?: number;
  date_id: string;
  rep_id: number;
  full_name?: string;
  role?: string | null;
  daily_revenue: number;
  mtd_revenue?: number;
  goal_revenue?: number;
  mtd_variance?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get daily store revenue for a specific date
 */
export async function getDailyStoreRevenue(date: string): Promise<DailyStoreRevenue[]> {
  const { data, error } = await supabase
    .from('daily_store_revenue')
    .select(`
      *,
      stores!inner(store_name)
    `)
    .eq('date_id', date)
    .order('store_id');

  if (error) {
    console.error('Error fetching daily store revenue:', error);
    return [];
  }

  return (data || []).map((record: any) => ({
    ...record,
    store_name: record.stores.store_name
  }));
}

/**
 * Get daily sales rep revenue for a specific date
 */
export async function getDailySalesRepRevenue(date: string): Promise<DailySalesRepRevenue[]> {
  const { data, error } = await supabase
    .from('daily_sales_rep_revenue')
    .select(`
      *,
      sales_reps!inner(full_name, role)
    `)
    .eq('date_id', date)
    .order('rep_id');

  if (error) {
    console.error('Error fetching daily sales rep revenue:', error);
    return [];
  }

  return (data || []).map((record: any) => ({
    ...record,
    full_name: record.sales_reps.full_name,
    role: record.sales_reps.role
  }));
}

/**
 * Upsert daily store revenue
 */
export async function upsertDailyStoreRevenue(revenue: DailyStoreRevenue): Promise<boolean> {
  const { error } = await supabase
    .from('daily_store_revenue')
    .upsert({
      date_id: revenue.date_id,
      store_id: revenue.store_id,
      daily_revenue: revenue.daily_revenue,
      mtd_revenue: revenue.mtd_revenue || null,
      ly_revenue: revenue.ly_revenue || null,
      goal_revenue: revenue.goal_revenue || null,
      percent_to_ly: revenue.percent_to_ly || null,
      percent_to_goal: revenue.percent_to_goal || null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'date_id,store_id'
    });

  if (error) {
    console.error('Error upserting daily store revenue:', error);
    return false;
  }

  return true;
}

/**
 * Upsert daily sales rep revenue
 */
export async function upsertDailySalesRepRevenue(revenue: DailySalesRepRevenue): Promise<boolean> {
  const { error } = await supabase
    .from('daily_sales_rep_revenue')
    .upsert({
      date_id: revenue.date_id,
      rep_id: revenue.rep_id,
      daily_revenue: revenue.daily_revenue,
      mtd_revenue: revenue.mtd_revenue || null,
      goal_revenue: revenue.goal_revenue || null,
      mtd_variance: revenue.mtd_variance || null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'date_id,rep_id'
    });

  if (error) {
    console.error('Error upserting daily sales rep revenue:', error);
    return false;
  }

  return true;
}

/**
 * Bulk upsert daily store revenue entries
 */
export async function bulkUpsertDailyStoreRevenue(entries: DailyStoreRevenue[]): Promise<boolean> {
  const records = entries.map(revenue => ({
    date_id: revenue.date_id,
    store_id: revenue.store_id,
    daily_revenue: revenue.daily_revenue,
    mtd_revenue: revenue.mtd_revenue || null,
    ly_revenue: revenue.ly_revenue || null,
    goal_revenue: revenue.goal_revenue || null,
    percent_to_ly: revenue.percent_to_ly || null,
    percent_to_goal: revenue.percent_to_goal || null,
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('daily_store_revenue')
    .upsert(records, {
      onConflict: 'date_id,store_id'
    });

  if (error) {
    console.error('Error bulk upserting daily store revenue:', error);
    return false;
  }

  return true;
}

/**
 * Bulk upsert daily sales rep revenue entries
 */
export async function bulkUpsertDailySalesRepRevenue(entries: DailySalesRepRevenue[]): Promise<boolean> {
  const records = entries.map(revenue => ({
    date_id: revenue.date_id,
    rep_id: revenue.rep_id,
    daily_revenue: revenue.daily_revenue,
    mtd_revenue: revenue.mtd_revenue || null,
    goal_revenue: revenue.goal_revenue || null,
    mtd_variance: revenue.mtd_variance || null,
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('daily_sales_rep_revenue')
    .upsert(records, {
      onConflict: 'date_id,rep_id'
    });

  if (error) {
    console.error('Error bulk upserting daily sales rep revenue:', error);
    return false;
  }

  return true;
}

// =============================================
// DAY OF WEEK ANALYTICS API FUNCTIONS
// =============================================

export interface DayOfWeekSales {
  day_of_week: string;
  day_number: number;
  average_revenue: number;
  total_revenue: number;
  count: number;
}

/**
 * Get company-wide average sales by day of week
 * @param startDate Optional start date (YYYY-MM-DD). Defaults to current month.
 * @param endDate Optional end date (YYYY-MM-DD). Defaults to latest date.
 */
export async function getCompanyDayOfWeekSales(startDate?: string, endDate?: string): Promise<DayOfWeekSales[]> {
  let firstDayStr: string;
  let lastDayStr: string;

  if (startDate && endDate) {
    // Use provided date range
    firstDayStr = startDate;
    lastDayStr = endDate;
  } else {
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
    firstDayStr = firstDay.toISOString().split('T')[0];
    lastDayStr = latestDate.date_id;
  }

  // Query daily summary data for the date range
  const { data, error } = await supabase
    .from('daily_summary_metrics')
    .select('date_id, daily_revenue')
    .gte('date_id', firstDayStr)
    .lte('date_id', lastDayStr)
    .order('date_id');

  if (error) {
    console.error('Error fetching day of week sales:', error);
    return [];
  }

  // Group by day of week
  const dayMap = new Map<number, { total: number; count: number }>();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  data?.forEach((record: any) => {
    const dayOfWeek = new Date(record.date_id).getDay();
    const revenue = record.daily_revenue || 0;

    if (!dayMap.has(dayOfWeek)) {
      dayMap.set(dayOfWeek, { total: 0, count: 0 });
    }

    const entry = dayMap.get(dayOfWeek)!;
    entry.total += revenue;
    entry.count += 1;
  });

  // Convert to array and calculate averages
  const result: DayOfWeekSales[] = [];
  dayMap.forEach((value, dayNumber) => {
    result.push({
      day_of_week: dayNames[dayNumber],
      day_number: dayNumber,
      average_revenue: value.count > 0 ? value.total / value.count : 0,
      total_revenue: value.total,
      count: value.count,
    });
  });

  // Sort by day number (Sunday = 0, Monday = 1, etc.)
  return result.sort((a, b) => a.day_number - b.day_number);
}

/**
 * Get sales by day of week for a specific store
 * @param storeId The store ID
 * @param startDate Optional start date (YYYY-MM-DD). Defaults to current month.
 * @param endDate Optional end date (YYYY-MM-DD). Defaults to latest date.
 */
export async function getStoreDayOfWeekSales(storeId: number, startDate?: string, endDate?: string): Promise<DayOfWeekSales[]> {
  let firstDayStr: string;
  let lastDayStr: string;

  if (startDate && endDate) {
    // Use provided date range
    firstDayStr = startDate;
    lastDayStr = endDate;
  } else {
    // Get the latest date in the system
    const { data: latestDate } = await supabase
      .from('daily_store_revenue')
      .select('date_id')
      .eq('store_id', storeId)
      .order('date_id', { ascending: false })
      .limit(1)
      .single();

    if (!latestDate) return [];

    // Get first day of that month
    const date = new Date(latestDate.date_id);
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    firstDayStr = firstDay.toISOString().split('T')[0];
    lastDayStr = latestDate.date_id;
  }

  // Query store revenue data for the date range
  const { data, error } = await supabase
    .from('daily_store_revenue')
    .select('date_id, daily_revenue')
    .eq('store_id', storeId)
    .gte('date_id', firstDayStr)
    .lte('date_id', lastDayStr)
    .order('date_id');

  if (error) {
    console.error('Error fetching store day of week sales:', error);
    return [];
  }

  // Group by day of week
  const dayMap = new Map<number, { total: number; count: number }>();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  data?.forEach((record: any) => {
    const dayOfWeek = new Date(record.date_id).getDay();
    const revenue = record.daily_revenue || 0;

    if (!dayMap.has(dayOfWeek)) {
      dayMap.set(dayOfWeek, { total: 0, count: 0 });
    }

    const entry = dayMap.get(dayOfWeek)!;
    entry.total += revenue;
    entry.count += 1;
  });

  // Convert to array and calculate averages
  const result: DayOfWeekSales[] = [];
  dayMap.forEach((value, dayNumber) => {
    result.push({
      day_of_week: dayNames[dayNumber],
      day_number: dayNumber,
      average_revenue: value.count > 0 ? value.total / value.count : 0,
      total_revenue: value.total,
      count: value.count,
    });
  });

  // Sort by day number (Sunday = 0, Monday = 1, etc.)
  return result.sort((a, b) => a.day_number - b.day_number);
}

// =============================================
// SALES REP ACTIVITY API FUNCTIONS
// =============================================

export interface RepActivity {
  activity_id: number;
  date_id: string;
  rep_id: number;
  hubspot_owner_id: string | null;
  calls: number;
  emails: number;
  meetings: number;
  notes: number;
  tasks: number;
  sms: number;
  total_activities: number;
  rep_name?: string;
}

export interface RepActivitySummary {
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

/**
 * Get rep activities for a date range
 */
export async function getRepActivities(startDate: string, endDate: string): Promise<RepActivity[]> {
  const { data, error } = await supabase
    .from('daily_rep_activities')
    .select(`
      *,
      sales_reps!inner(full_name)
    `)
    .gte('date_id', startDate)
    .lte('date_id', endDate)
    .order('date_id', { ascending: false });

  if (error) {
    console.error('Error fetching rep activities:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    ...row,
    rep_name: row.sales_reps?.full_name,
  }));
}

/**
 * Get activity summary by rep for a date range
 */
export async function getRepActivitySummary(startDate: string, endDate: string): Promise<RepActivitySummary[]> {
  const { data, error } = await supabase
    .from('sales_rep_activities')
    .select(`
      rep_id,
      calls,
      emails,
      meetings,
      notes,
      sms,
      total_activities,
      sales_reps!inner(full_name)
    `)
    .gte('date_id', startDate)
    .lte('date_id', endDate);

  if (error) {
    console.error('Error fetching rep activity summary:', error);
    return [];
  }

  // Aggregate by rep
  const repMap = new Map<number, RepActivitySummary>();

  data?.forEach((row: any) => {
    if (!repMap.has(row.rep_id)) {
      repMap.set(row.rep_id, {
        rep_id: row.rep_id,
        rep_name: row.sales_reps?.full_name || 'Unknown',
        total_calls: 0,
        total_emails: 0,
        total_meetings: 0,
        total_notes: 0,
        total_tasks: 0,
        total_sms: 0,
        total_activities: 0,
      });
    }

    const summary = repMap.get(row.rep_id)!;
    summary.total_calls += row.calls || 0;
    summary.total_emails += row.emails || 0;
    summary.total_meetings += row.meetings || 0;
    summary.total_notes += row.notes || 0;
    summary.total_tasks += 0; // No tasks column in our table
    summary.total_sms += row.sms || 0;
    summary.total_activities += row.total_activities || 0;
  });

  return Array.from(repMap.values()).sort((a, b) => b.total_activities - a.total_activities);
}

/**
 * Get single rep's activity summary
 */
export async function getSingleRepActivitySummary(repId: number, startDate: string, endDate: string): Promise<RepActivitySummary | null> {
  const summaries = await getRepActivitySummary(startDate, endDate);
  return summaries.find(s => s.rep_id === repId) || null;
}

/**
 * Get latest date in the system
 */
export async function getLatestSystemDate(): Promise<string | null> {
  const { data, error } = await supabase
    .from('daily_summary_metrics')
    .select('date_id')
    .order('date_id', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching latest date:', error);
    return null;
  }

  return data?.date_id || null;
}

/**
 * Get sales rep daily revenue for date range
 */
export async function getRepDailyRevenue(repId: number, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('daily_sales_rep_revenue')
    .select('date_id, daily_revenue')
    .eq('rep_id', repId)
    .gte('date_id', startDate)
    .lte('date_id', endDate)
    .order('date_id', { ascending: false });

  if (error) {
    console.error('Error fetching rep daily revenue:', error);
    return [];
  }

  return data || [];
}
