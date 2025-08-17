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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      application_invites: {
        Row: {
          conversation_id: string | null
          created_at: string
          expires_at: string
          id: string
          landlord_id: string
          property_id: string
          status: string
          tenant_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          landlord_id: string
          property_id: string
          status?: string
          tenant_id: string
          token: string
          used_at?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          landlord_id?: string
          property_id?: string
          status?: string
          tenant_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      applications: {
        Row: {
          created_at: string
          id: string
          landlord_id: string
          property_id: string
          status: string
          tenant_id: string
          updated_at: string
          viewing_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          landlord_id: string
          property_id: string
          status?: string
          tenant_id: string
          updated_at?: string
          viewing_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          landlord_id?: string
          property_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          viewing_id?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          inquiry_id: string | null
          landlord_id: string
          last_message_at: string | null
          property_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inquiry_id?: string | null
          landlord_id: string
          last_message_at?: string | null
          property_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inquiry_id?: string | null
          landlord_id?: string
          last_message_at?: string | null
          property_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          document_type: string
          file_path: string
          file_type: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          document_type: string
          file_path: string
          file_type: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          document_type?: string
          file_path?: string
          file_type?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      email_verification_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          property_id: string
          status: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          property_id: string
          status?: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          property_id?: string
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          landlord_id: string
          name: string
          template_content: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          landlord_id: string
          name: string
          template_content: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          landlord_id?: string
          name?: string
          template_content?: Json
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_requests: {
        Row: {
          actual_cost: number | null
          category: string
          completed_date: string | null
          contractor_contact: string | null
          contractor_name: string | null
          created_at: string
          description: string
          estimated_cost: number | null
          id: string
          images: string[] | null
          landlord_id: string
          notes: string | null
          priority: string
          property_id: string
          scheduled_date: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          category: string
          completed_date?: string | null
          contractor_contact?: string | null
          contractor_name?: string | null
          created_at?: string
          description: string
          estimated_cost?: number | null
          id?: string
          images?: string[] | null
          landlord_id: string
          notes?: string | null
          priority?: string
          property_id: string
          scheduled_date?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          category?: string
          completed_date?: string | null
          contractor_contact?: string | null
          contractor_name?: string | null
          created_at?: string
          description?: string
          estimated_cost?: number | null
          id?: string
          images?: string[] | null
          landlord_id?: string
          notes?: string | null
          priority?: string
          property_id?: string
          scheduled_date?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          edited_at: string | null
          id: string
          message_type: string
          read_by_landlord: boolean | null
          read_by_tenant: boolean | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          message_type?: string
          read_by_landlord?: boolean | null
          read_by_tenant?: boolean | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          message_type?: string
          read_by_landlord?: boolean | null
          read_by_tenant?: boolean | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link_url: string | null
          message: string
          metadata: Json | null
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          message: string
          metadata?: Json | null
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          message?: string
          metadata?: Json | null
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          due_date: string | null
          id: string
          landlord_id: string
          payment_date: string | null
          payment_type: string
          paystack_reference: string | null
          paystack_transaction_id: string | null
          status: string
          tenancy_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          landlord_id: string
          payment_date?: string | null
          payment_type: string
          paystack_reference?: string | null
          paystack_transaction_id?: string | null
          status?: string
          tenancy_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          landlord_id?: string
          payment_date?: string | null
          payment_type?: string
          paystack_reference?: string | null
          paystack_transaction_id?: string | null
          status?: string
          tenancy_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          email_verified: boolean
          id: string
          id_verification_status: string | null
          id_verified: boolean
          is_tenant_screened: boolean
          paystack_subaccount_code: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          email_verified?: boolean
          id?: string
          id_verification_status?: string | null
          id_verified?: boolean
          is_tenant_screened?: boolean
          paystack_subaccount_code?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          email_verified?: boolean
          id?: string
          id_verification_status?: string | null
          id_verified?: boolean
          is_tenant_screened?: boolean
          paystack_subaccount_code?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          amenities: string[] | null
          available_from: string | null
          bathrooms: number
          bedrooms: number
          created_at: string
          description: string
          featured: boolean | null
          furnished: boolean | null
          id: string
          images: string[] | null
          landlord_id: string
          location: string
          parking_spaces: number
          pets_allowed: boolean | null
          price: number
          property_type: string
          size_sqm: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          amenities?: string[] | null
          available_from?: string | null
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          description: string
          featured?: boolean | null
          furnished?: boolean | null
          id?: string
          images?: string[] | null
          landlord_id: string
          location: string
          parking_spaces?: number
          pets_allowed?: boolean | null
          price: number
          property_type: string
          size_sqm?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          amenities?: string[] | null
          available_from?: string | null
          bathrooms?: number
          bedrooms?: number
          created_at?: string
          description?: string
          featured?: boolean | null
          furnished?: boolean | null
          id?: string
          images?: string[] | null
          landlord_id?: string
          location?: string
          parking_spaces?: number
          pets_allowed?: boolean | null
          price?: number
          property_type?: string
          size_sqm?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      rent_payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          reference_number: string | null
          status: string
          tenancy_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          status?: string
          tenancy_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          status?: string
          tenancy_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      screening_details: {
        Row: {
          company_name: string | null
          consent_given: boolean
          created_at: string
          current_address: string | null
          employment_status: string
          full_name: string
          id: string
          id_number: string
          job_title: string | null
          net_monthly_income: number | null
          phone: string
          previous_landlord_contact: string | null
          previous_landlord_name: string | null
          reason_for_moving: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          consent_given?: boolean
          created_at?: string
          current_address?: string | null
          employment_status: string
          full_name: string
          id?: string
          id_number: string
          job_title?: string | null
          net_monthly_income?: number | null
          phone: string
          previous_landlord_contact?: string | null
          previous_landlord_name?: string | null
          reason_for_moving?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          consent_given?: boolean
          created_at?: string
          current_address?: string | null
          employment_status?: string
          full_name?: string
          id?: string
          id_number?: string
          job_title?: string | null
          net_monthly_income?: number | null
          phone?: string
          previous_landlord_contact?: string | null
          previous_landlord_name?: string | null
          reason_for_moving?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      screening_profiles: {
        Row: {
          created_at: string
          documents: Json | null
          first_name: string
          has_pets: boolean | null
          id: string
          income_sources: Json | null
          is_complete: boolean
          last_name: string
          middle_name: string | null
          occupants: Json | null
          pet_details: string | null
          residences: Json | null
          screening_consent: boolean
          screening_consent_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          documents?: Json | null
          first_name: string
          has_pets?: boolean | null
          id?: string
          income_sources?: Json | null
          is_complete?: boolean
          last_name: string
          middle_name?: string | null
          occupants?: Json | null
          pet_details?: string | null
          residences?: Json | null
          screening_consent?: boolean
          screening_consent_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          documents?: Json | null
          first_name?: string
          has_pets?: boolean | null
          id?: string
          income_sources?: Json | null
          is_complete?: boolean
          last_name?: string
          middle_name?: string | null
          occupants?: Json | null
          pet_details?: string | null
          residences?: Json | null
          screening_consent?: boolean
          screening_consent_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tenancies: {
        Row: {
          created_at: string
          custom_clauses: Json
          end_date: string | null
          id: string
          landlord_id: string
          landlord_signature_url: string | null
          landlord_signed_at: string | null
          lease_document_path: string | null
          lease_status: string | null
          monthly_rent: number
          notes: string | null
          property_id: string
          security_deposit: number | null
          start_date: string
          status: string
          tenant_id: string
          tenant_signature_url: string | null
          tenant_signed_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_clauses?: Json
          end_date?: string | null
          id?: string
          landlord_id: string
          landlord_signature_url?: string | null
          landlord_signed_at?: string | null
          lease_document_path?: string | null
          lease_status?: string | null
          monthly_rent: number
          notes?: string | null
          property_id: string
          security_deposit?: number | null
          start_date: string
          status?: string
          tenant_id: string
          tenant_signature_url?: string | null
          tenant_signed_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_clauses?: Json
          end_date?: string | null
          id?: string
          landlord_id?: string
          landlord_signature_url?: string | null
          landlord_signed_at?: string | null
          lease_document_path?: string | null
          lease_status?: string | null
          monthly_rent?: number
          notes?: string | null
          property_id?: string
          security_deposit?: number | null
          start_date?: string
          status?: string
          tenant_id?: string
          tenant_signature_url?: string | null
          tenant_signed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tenancies_landlord"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_tenancies_property"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tenancies_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_presence: {
        Row: {
          is_online: boolean
          last_seen: string
          updated_at: string
          user_id: string
        }
        Insert: {
          is_online?: boolean
          last_seen?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          is_online?: boolean
          last_seen?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      viewing_slots: {
        Row: {
          booked_by_tenant_id: string | null
          created_at: string
          end_time: string
          id: string
          landlord_id: string
          property_id: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          booked_by_tenant_id?: string | null
          created_at?: string
          end_time: string
          id?: string
          landlord_id: string
          property_id: string
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          booked_by_tenant_id?: string | null
          created_at?: string
          end_time?: string
          id?: string
          landlord_id?: string
          property_id?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      viewings: {
        Row: {
          application_sent: boolean | null
          completed_at: string | null
          conversation_id: string | null
          created_at: string
          id: string
          landlord_id: string
          notes: string | null
          property_id: string
          scheduled_date: string | null
          status: string
          tenant_id: string
          updated_at: string
          viewing_confirmed: boolean | null
        }
        Insert: {
          application_sent?: boolean | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          landlord_id: string
          notes?: string | null
          property_id: string
          scheduled_date?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          viewing_confirmed?: boolean | null
        }
        Update: {
          application_sent?: boolean | null
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          landlord_id?: string
          notes?: string | null
          property_id?: string
          scheduled_date?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          viewing_confirmed?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_application: {
        Args: { property_uuid: string; tenant_uuid: string }
        Returns: boolean
      }
      can_create_application: {
        Args: {
          landlord_uuid: string
          tenant_uuid: string
          viewing_uuid: string
        }
        Returns: boolean
      }
      cancel_viewing_booking: {
        Args: { slot_uuid: string; tenant_uuid: string }
        Returns: boolean
      }
      create_admin_account: {
        Args: { display_name_param: string; email_param: string }
        Returns: Json
      }
      create_notification: {
        Args: {
          _link_url: string
          _message: string
          _metadata?: Json
          _type?: string
          _user_id: string
        }
        Returns: undefined
      }
      has_active_booking: {
        Args: { property_uuid: string; tenant_uuid: string }
        Returns: {
          end_time: string
          has_booking: boolean
          slot_id: string
          start_time: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_messages_as_read: {
        Args: { conversation_uuid: string; user_role: string }
        Returns: undefined
      }
      promote_to_landlord: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_viewing_booking: {
        Args: {
          new_slot_uuid: string
          old_slot_uuid: string
          tenant_uuid: string
        }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "tenant" | "landlord" | "admin"
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
      user_role: ["tenant", "landlord", "admin"],
    },
  },
} as const
