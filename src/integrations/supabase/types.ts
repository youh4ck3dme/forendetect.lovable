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
      case_entities: {
        Row: {
          address: string | null
          case_id: string
          country: string
          created_at: string
          ico: string | null
          id: string
          incorporated_at: string | null
          kind: string
          licence: string | null
          name: string
          note: string | null
          physical_inventory: boolean | null
          registered_address: string | null
          responsive: boolean | null
          role: string
          updated_at: string
          user_id: string
          x: number
          y: number
        }
        Insert: {
          address?: string | null
          case_id: string
          country?: string
          created_at?: string
          ico?: string | null
          id?: string
          incorporated_at?: string | null
          kind?: string
          licence?: string | null
          name: string
          note?: string | null
          physical_inventory?: boolean | null
          registered_address?: string | null
          responsive?: boolean | null
          role?: string
          updated_at?: string
          user_id: string
          x?: number
          y?: number
        }
        Update: {
          address?: string | null
          case_id?: string
          country?: string
          created_at?: string
          ico?: string | null
          id?: string
          incorporated_at?: string | null
          kind?: string
          licence?: string | null
          name?: string
          note?: string | null
          physical_inventory?: boolean | null
          registered_address?: string | null
          responsive?: boolean | null
          role?: string
          updated_at?: string
          user_id?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "case_entities_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_events: {
        Row: {
          case_id: string
          created_at: string
          date: string
          detail: string
          id: string
          severity: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          date: string
          detail?: string
          id?: string
          severity?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          date?: string
          detail?: string
          id?: string
          severity?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_relations: {
        Row: {
          case_id: string
          created_at: string
          from_id: string | null
          id: string
          label: string
          to_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          from_id?: string | null
          id?: string
          label?: string
          to_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          from_id?: string | null
          id?: string
          label?: string
          to_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_relations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_relations_from_id_fkey"
            columns: ["from_id"]
            isOneToOne: false
            referencedRelation: "case_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_relations_to_id_fkey"
            columns: ["to_id"]
            isOneToOne: false
            referencedRelation: "case_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      case_transactions: {
        Row: {
          amount: number
          case_id: string
          created_at: string
          date: string
          description: string
          destination_country: string
          from_id: string | null
          id: string
          method: string
          origin_country: string
          payer_id: string | null
          to_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          case_id: string
          created_at?: string
          date: string
          description?: string
          destination_country?: string
          from_id?: string | null
          id?: string
          method?: string
          origin_country?: string
          payer_id?: string | null
          to_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          case_id?: string
          created_at?: string
          date?: string
          description?: string
          destination_country?: string
          from_id?: string | null
          id?: string
          method?: string
          origin_country?: string
          payer_id?: string | null
          to_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_transactions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_transactions_from_id_fkey"
            columns: ["from_id"]
            isOneToOne: false
            referencedRelation: "case_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_transactions_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "case_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_transactions_to_id_fkey"
            columns: ["to_id"]
            isOneToOne: false
            referencedRelation: "case_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      case_weapons: {
        Row: {
          acquired_at: string | null
          brand: string
          case_id: string
          created_at: string
          holder_id: string | null
          id: string
          licence: string | null
          model: string
          serial: string
          supplier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acquired_at?: string | null
          brand?: string
          case_id: string
          created_at?: string
          holder_id?: string | null
          id?: string
          licence?: string | null
          model?: string
          serial?: string
          supplier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acquired_at?: string | null
          brand?: string
          case_id?: string
          created_at?: string
          holder_id?: string | null
          id?: string
          licence?: string | null
          model?: string
          serial?: string
          supplier_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_weapons_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_weapons_holder_id_fkey"
            columns: ["holder_id"]
            isOneToOne: false
            referencedRelation: "case_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_weapons_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "case_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          created_at: string
          europol_serials: string[]
          id: string
          name: string
          orsr_addresses: Json
          reference_date: string
          subtitle: string
          updated_at: string
          user_id: string
          valid_licences: string[]
        }
        Insert: {
          created_at?: string
          europol_serials?: string[]
          id?: string
          name: string
          orsr_addresses?: Json
          reference_date?: string
          subtitle?: string
          updated_at?: string
          user_id: string
          valid_licences?: string[]
        }
        Update: {
          created_at?: string
          europol_serials?: string[]
          id?: string
          name?: string
          orsr_addresses?: Json
          reference_date?: string
          subtitle?: string
          updated_at?: string
          user_id?: string
          valid_licences?: string[]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          onboarding_completed: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          onboarding_completed?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean
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
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
