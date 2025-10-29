import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for database tables
export type Database = {
  public: {
    Tables: {
      stores: {
        Row: {
          store_id: number;
          store_name: string;
          store_type: string;
          region: string | null;
          is_active: boolean;
          opened_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['stores']['Row'], 'store_id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['stores']['Insert']>;
      };
      sales_reps: {
        Row: {
          rep_id: number;
          first_name: string | null;
          last_name: string | null;
          full_name: string;
          role: string | null;
          hire_date: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sales_reps']['Row'], 'rep_id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['sales_reps']['Insert']>;
      };
      daily_store_revenue: {
        Row: {
          revenue_id: number;
          date_id: string;
          store_id: number;
          daily_revenue: number | null;
          mtd_revenue: number | null;
          ly_revenue: number | null;
          goal_revenue: number | null;
          percent_to_ly: number | null;
          percent_to_goal: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['daily_store_revenue']['Row'], 'revenue_id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['daily_store_revenue']['Insert']>;
      };
      daily_sales_rep_revenue: {
        Row: {
          rep_revenue_id: number;
          date_id: string;
          rep_id: number;
          daily_revenue: number | null;
          mtd_revenue: number | null;
          goal_revenue: number | null;
          mtd_variance: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['daily_sales_rep_revenue']['Row'], 'rep_revenue_id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['daily_sales_rep_revenue']['Insert']>;
      };
      daily_summary_metrics: {
        Row: {
          summary_id: number;
          date_id: string;
          month_goal: number | null;
          mtd_revenue: number | null;
          daily_revenue: number | null;
          ly_mtd_revenue: number | null;
          oconee_mtd_rev: number | null;
          nga_revenue: number | null;
          per_day_to_beat_ly: number | null;
          goal_per_day: number | null;
          days_passed: number | null;
          days_remaining: number | null;
          percent_to_goal: number | null;
          standing_to_goal: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['daily_summary_metrics']['Row'], 'summary_id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['daily_summary_metrics']['Insert']>;
      };
    };
    Views: {
      v_current_mtd_store_revenue: {
        Row: {
          store_name: string;
          store_type: string;
          region: string | null;
          mtd_revenue: number | null;
          store_goal: number | null;
          ly_revenue: number | null;
          percent_to_goal: number | null;
          percent_to_ly: number | null;
        };
      };
      v_current_mtd_rep_revenue: {
        Row: {
          full_name: string;
          role: string | null;
          mtd_revenue: number | null;
          monthly_goal: number | null;
          variance_to_goal: number | null;
          percent_to_goal: number | null;
        };
      };
      v_nga_revenue: {
        Row: {
          date_id: string;
          daily_nga_revenue: number | null;
          mtd_nga_revenue: number | null;
        };
      };
    };
  };
};
