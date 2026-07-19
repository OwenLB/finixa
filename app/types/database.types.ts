// Généré depuis la base de production (supabase gen types).
// Ne pas éditer à la main — régénérer après chaque migration.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      budget_envelopes: {
        Row: {
          needs_pct: number
          savings_pct: number
          updated_at: string
          user_id: string
          wants_pct: number
        }
        Insert: {
          needs_pct?: number
          savings_pct?: number
          updated_at?: string
          user_id: string
          wants_pct?: number
        }
        Update: {
          needs_pct?: number
          savings_pct?: number
          updated_at?: string
          user_id?: string
          wants_pct?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string
          excluded: boolean
          icon_key: string
          id: string
          is_variable: boolean
          name: string
          sort_order: number
          type: string
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          excluded?: boolean
          icon_key: string
          id?: string
          is_variable?: boolean
          name: string
          sort_order?: number
          type: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          excluded?: boolean
          icon_key?: string
          id?: string
          is_variable?: boolean
          name?: string
          sort_order?: number
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          id: string
          name: string
          position: number
          subcategory: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string | null
          id?: string
          name: string
          position?: number
          subcategory?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          id?: string
          name?: string
          position?: number
          subcategory?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_transactions: {
        Row: {
          accounting_offset: string
          amount: number
          categorized: boolean
          category: string
          created_at: string
          day_of_month: number | null
          end_date: string | null
          frequency: string
          id: string
          name: string
          start_date: string
          type: string
          user_id: string
        }
        Insert: {
          accounting_offset?: string
          amount: number
          categorized?: boolean
          category?: string
          created_at?: string
          day_of_month?: number | null
          end_date?: string | null
          frequency?: string
          id?: string
          name?: string
          start_date?: string
          type: string
          user_id: string
        }
        Update: {
          accounting_offset?: string
          amount?: number
          categorized?: boolean
          category?: string
          created_at?: string
          day_of_month?: number | null
          end_date?: string | null
          frequency?: string
          id?: string
          name?: string
          start_date?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          start_amount: number
          subcategory_id: string | null
          target_amount: number
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          start_amount?: number
          subcategory_id?: string | null
          target_amount?: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          start_amount?: number
          subcategory_id?: string | null
          target_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_goals_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          archived_at: string | null
          budget: number | null
          category_id: string
          created_at: string
          envelope: string | null
          excluded: boolean
          id: string
          name: string
          sort_order: number
          user_id: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          archived_at?: string | null
          budget?: number | null
          category_id: string
          created_at?: string
          envelope?: string | null
          excluded?: boolean
          id?: string
          name: string
          sort_order?: number
          user_id: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          archived_at?: string | null
          budget?: number | null
          category_id?: string
          created_at?: string
          envelope?: string | null
          excluded?: boolean
          id?: string
          name?: string
          sort_order?: number
          user_id?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategory_budgets: {
        Row: {
          budget: number | null
          effective_from: string
          subcategory_id: string
        }
        Insert: {
          budget?: number | null
          effective_from: string
          subcategory_id: string
        }
        Update: {
          budget?: number | null
          effective_from?: string
          subcategory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategory_budgets_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          accounting_date: string | null
          amount: number
          categorized: boolean
          category: string
          created_at: string
          date: string
          hors_budget: boolean
          id: string
          name: string
          note: string | null
          recurrence_occurrence: string | null
          recurring_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          accounting_date?: string | null
          amount: number
          categorized?: boolean
          category?: string
          created_at?: string
          date: string
          hors_budget?: boolean
          id?: string
          name: string
          note?: string | null
          recurrence_occurrence?: string | null
          recurring_id?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          accounting_date?: string | null
          amount?: number
          categorized?: boolean
          category?: string
          created_at?: string
          date?: string
          hors_budget?: boolean
          id?: string
          name?: string
          note?: string | null
          recurrence_occurrence?: string | null
          recurring_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_recurring_id_fkey"
            columns: ["recurring_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          accounting_period_start_day: number
          budget_repartition_enabled: boolean
          currency: string
          envelope_feature_enabled: boolean
          last_digest_sent_at: string | null
          locale: string
          notification_prefs: Json | null
          onboarding_completed: boolean
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accounting_period_start_day?: number
          budget_repartition_enabled?: boolean
          currency?: string
          envelope_feature_enabled?: boolean
          last_digest_sent_at?: string | null
          locale?: string
          notification_prefs?: Json | null
          onboarding_completed?: boolean
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accounting_period_start_day?: number
          budget_repartition_enabled?: boolean
          currency?: string
          envelope_feature_enabled?: boolean
          last_digest_sent_at?: string | null
          locale?: string
          notification_prefs?: Json | null
          onboarding_completed?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bulk_check_transactions: { Args: { p_ids: string[] }; Returns: undefined }
      create_savings_goal: {
        Args: {
          p_color: string
          p_month: string
          p_name: string
          p_sort: number
          p_start: number
          p_target: number
        }
        Returns: {
          color: string
          created_at: string
          id: string
          name: string
          start_amount: number
          subcategory_id: string | null
          target_amount: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "savings_goals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_budget_totals: {
        Args: never
        Returns: {
          total_budget: number
          type: string
        }[]
      }
      get_category_budgets: {
        Args: never
        Returns: {
          id: string
          total_budget: number
        }[]
      }
      get_category_spent: {
        Args: { p_end?: string; p_month: string; p_start?: string }
        Returns: {
          category_id: string
          direct_count: number
          direct_spent: number
          total_spent: number
        }[]
      }
      get_category_suggestions_bulk: {
        Args: { p_names: string[] }
        Returns: {
          category_name: string
          input_name: string
          subcategory_id: string
          type: string
        }[]
      }
      get_dashboard_month: {
        Args: { p_end?: string; p_month: string; p_start?: string }
        Returns: {
          budget: number
          spent: number
          type: string
        }[]
      }
      get_envelope_stats: {
        Args: { p_end?: string; p_month: string; p_start?: string }
        Returns: {
          envelope: string
          spent: number
          tx_count: number
        }[]
      }
      get_label_suggestions: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          category: string
          label: string
          type: string
        }[]
      }
      get_savings_goal_history: {
        Args: { p_goal_id: string }
        Returns: {
          cumulative: number
          tx_date: string
        }[]
      }
      get_savings_goals_progress: {
        Args: never
        Returns: {
          goal_id: string
          total_saved: number
        }[]
      }
      get_subcategory_stats: {
        Args: { p_end?: string; p_month: string; p_start?: string }
        Returns: {
          spent: number
          subcategory_id: string
          tx_count: number
        }[]
      }
      get_uncategorized_stats: {
        Args: { p_end?: string; p_month: string; p_start?: string }
        Returns: {
          spent: number
          tx_count: number
          type: string
        }[]
      }
      get_variable_daily_remaining: {
        Args: { p_end?: string; p_month: string; p_start?: string }
        Returns: {
          daily_remaining: number
          days_remaining: number
          remaining: number
          variable_budget: number
          variable_spent: number
        }[]
      }
      recurring_virtual_for_month: {
        Args: { p_end?: string; p_month: string; p_start?: string }
        Returns: {
          amount: number
          categorized: boolean
          category: string
          type: string
        }[]
      }
      reset_account_data: { Args: never; Returns: undefined }
      version_subcategory_budget: {
        Args: {
          p_budget: number
          p_id: string
          p_month: string
          p_name: string
        }
        Returns: {
          budget: number | null
          category_id: string
          created_at: string
          envelope: string | null
          excluded: boolean
          id: string
          name: string
          sort_order: number
          user_id: string
          valid_from: string
          valid_to: string | null
        }
        SetofOptions: {
          from: "*"
          to: "subcategories"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
