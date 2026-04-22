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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      gear: {
        Row: {
          created_at: string
          current_location: string
          icon_kind: string | null
          id: number
          last_note: string | null
          last_updated: string
          moved_by: string | null
          name: string
          requestable: boolean
          status: Database["public"]["Enums"]["gear_status"]
          sub_location: string | null
        }
        Insert: {
          created_at?: string
          current_location?: string
          icon_kind?: string | null
          id: number
          last_note?: string | null
          last_updated?: string
          moved_by?: string | null
          name: string
          requestable?: boolean
          status?: Database["public"]["Enums"]["gear_status"]
          sub_location?: string | null
        }
        Update: {
          created_at?: string
          current_location?: string
          icon_kind?: string | null
          id?: number
          last_note?: string | null
          last_updated?: string
          moved_by?: string | null
          name?: string
          requestable?: boolean
          status?: Database["public"]["Enums"]["gear_status"]
          sub_location?: string | null
        }
        Relationships: []
      }
      gear_history: {
        Row: {
          gear_id: number
          id: string
          location: string
          moved_by: string | null
          note: string | null
          sub_location: string | null
          timestamp: string
        }
        Insert: {
          gear_id: number
          id?: string
          location: string
          moved_by?: string | null
          note?: string | null
          sub_location?: string | null
          timestamp?: string
        }
        Update: {
          gear_id?: number
          id?: string
          location?: string
          moved_by?: string | null
          note?: string | null
          sub_location?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "gear_history_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "gear"
            referencedColumns: ["id"]
          },
        ]
      }
      gear_request_items: {
        Row: {
          created_at: string
          gear_id: number
          id: string
          request_id: string
        }
        Insert: {
          created_at?: string
          gear_id: number
          id?: string
          request_id: string
        }
        Update: {
          created_at?: string
          gear_id?: number
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gear_request_items_gear_id_fkey"
            columns: ["gear_id"]
            isOneToOne: false
            referencedRelation: "gear"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gear_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "gear_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      gear_requests: {
        Row: {
          created_at: string
          id: string
          location: string
          needed_date: string
          notes: string | null
          requestor_name: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["gear_request_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          location: string
          needed_date: string
          notes?: string | null
          requestor_name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["gear_request_status"]
        }
        Update: {
          created_at?: string
          id?: string
          location?: string
          needed_date?: string
          notes?: string | null
          requestor_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["gear_request_status"]
        }
        Relationships: []
      }
      photo_requests: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          budget: string | null
          company: string
          concur_budget_approver: string | null
          concur_class: string | null
          concur_company: string | null
          concur_department: string | null
          concur_expense_category: string | null
          concur_people_resource_type: string | null
          concur_project: string | null
          coverage_other: string | null
          coverage_types: Database["public"]["Enums"]["photo_coverage_type"][]
          created_at: string
          email: string
          end_time: string | null
          event_date: string | null
          event_end_date: string | null
          event_location: string | null
          event_name: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          on_site_contact_name: string | null
          on_site_contact_phone: string | null
          request_types: Database["public"]["Enums"]["photo_request_type"][]
          reviewed_at: string | null
          reviewed_by: string | null
          spans_multiple_days: boolean
          start_time: string | null
          status: Database["public"]["Enums"]["photo_request_status"]
          team: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          budget?: string | null
          company: string
          concur_budget_approver?: string | null
          concur_class?: string | null
          concur_company?: string | null
          concur_department?: string | null
          concur_expense_category?: string | null
          concur_people_resource_type?: string | null
          concur_project?: string | null
          coverage_other?: string | null
          coverage_types?: Database["public"]["Enums"]["photo_coverage_type"][]
          created_at?: string
          email: string
          end_time?: string | null
          event_date?: string | null
          event_end_date?: string | null
          event_location?: string | null
          event_name?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          on_site_contact_name?: string | null
          on_site_contact_phone?: string | null
          request_types?: Database["public"]["Enums"]["photo_request_type"][]
          reviewed_at?: string | null
          reviewed_by?: string | null
          spans_multiple_days?: boolean
          start_time?: string | null
          status?: Database["public"]["Enums"]["photo_request_status"]
          team?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          budget?: string | null
          company?: string
          concur_budget_approver?: string | null
          concur_class?: string | null
          concur_company?: string | null
          concur_department?: string | null
          concur_expense_category?: string | null
          concur_people_resource_type?: string | null
          concur_project?: string | null
          coverage_other?: string | null
          coverage_types?: Database["public"]["Enums"]["photo_coverage_type"][]
          created_at?: string
          email?: string
          end_time?: string | null
          event_date?: string | null
          event_end_date?: string | null
          event_location?: string | null
          event_name?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          on_site_contact_name?: string | null
          on_site_contact_phone?: string | null
          request_types?: Database["public"]["Enums"]["photo_request_type"][]
          reviewed_at?: string | null
          reviewed_by?: string | null
          spans_multiple_days?: boolean
          start_time?: string | null
          status?: Database["public"]["Enums"]["photo_request_status"]
          team?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
      gear_request_status: "pending" | "approved" | "denied"
      gear_status: "active" | "out_of_service" | "out_for_repair"
      photo_coverage_type: "live_event" | "photo_booth" | "other"
      photo_request_status:
        | "new"
        | "in_review"
        | "scheduled"
        | "completed"
        | "declined"
        | "archived"
      photo_request_type:
        | "photography_team"
        | "shot_list_addition"
        | "photoshoot"
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
    Enums: {
      app_role: ["admin"],
      gear_request_status: ["pending", "approved", "denied"],
      gear_status: ["active", "out_of_service", "out_for_repair"],
      photo_coverage_type: ["live_event", "photo_booth", "other"],
      photo_request_status: [
        "new",
        "in_review",
        "scheduled",
        "completed",
        "declined",
        "archived",
      ],
      photo_request_type: [
        "photography_team",
        "shot_list_addition",
        "photoshoot",
      ],
    },
  },
} as const
