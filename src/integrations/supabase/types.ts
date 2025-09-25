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
          application_id: string | null
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
          application_id?: string | null
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
          application_id?: string | null
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
            foreignKeyName: "documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
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
      events: {
        Row: {
          created_at: string | null
          id: number
          name: string
          properties: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          properties?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          properties?: Json | null
          user_id?: string | null
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
      inventory_items: {
        Row: {
          condition: string
          created_at: string | null
          description: string | null
          id: string
          inventory_record_id: string
          item_name: string
          photos: string[] | null
          room_name: string
          updated_at: string | null
          voice_note_url: string | null
        }
        Insert: {
          condition: string
          created_at?: string | null
          description?: string | null
          id?: string
          inventory_record_id: string
          item_name: string
          photos?: string[] | null
          room_name: string
          updated_at?: string | null
          voice_note_url?: string | null
        }
        Update: {
          condition?: string
          created_at?: string | null
          description?: string | null
          id?: string
          inventory_record_id?: string
          item_name?: string
          photos?: string[] | null
          room_name?: string
          updated_at?: string | null
          voice_note_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_inventory_record_id_fkey"
            columns: ["inventory_record_id"]
            isOneToOne: false
            referencedRelation: "inventory_records"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_records: {
        Row: {
          approved_at: string | null
          completed_at: string | null
          country: string
          created_at: string | null
          id: string
          landlord_approved: boolean | null
          landlord_id: string
          photos_count: number | null
          property_id: string
          rooms_recorded: number | null
          status: string
          tenant_id: string
          updated_at: string | null
          voice_notes_count: number | null
        }
        Insert: {
          approved_at?: string | null
          completed_at?: string | null
          country?: string
          created_at?: string | null
          id?: string
          landlord_approved?: boolean | null
          landlord_id: string
          photos_count?: number | null
          property_id: string
          rooms_recorded?: number | null
          status?: string
          tenant_id: string
          updated_at?: string | null
          voice_notes_count?: number | null
        }
        Update: {
          approved_at?: string | null
          completed_at?: string | null
          country?: string
          created_at?: string | null
          id?: string
          landlord_approved?: boolean | null
          landlord_id?: string
          photos_count?: number | null
          property_id?: string
          rooms_recorded?: number | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
          voice_notes_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_records_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reports: {
        Row: {
          created_at: string | null
          generated_at: string | null
          id: string
          inventory_record_id: string
          pdf_url: string | null
          report_type: string
        }
        Insert: {
          created_at?: string | null
          generated_at?: string | null
          id?: string
          inventory_record_id: string
          pdf_url?: string | null
          report_type: string
        }
        Update: {
          created_at?: string | null
          generated_at?: string | null
          id?: string
          inventory_record_id?: string
          pdf_url?: string | null
          report_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reports_inventory_record_id_fkey"
            columns: ["inventory_record_id"]
            isOneToOne: false
            referencedRelation: "inventory_records"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string
          id: string
          lease_id: string
          number: string
          pdf_url: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date: string
          id?: string
          lease_id: string
          number: string
          pdf_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string
          id?: string
          lease_id?: string
          number?: string
          pdf_url?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_audit: {
        Row: {
          action: string
          actor: string | null
          created_at: string | null
          id: number
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string | null
          id?: number
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string | null
          id?: number
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      kyc_capture_sessions: {
        Row: {
          created_at: string
          desktop_user_id: string
          expires_at: string
          file_path: string | null
          id: string
          purpose: string
          status: string
        }
        Insert: {
          created_at?: string
          desktop_user_id: string
          expires_at?: string
          file_path?: string | null
          id?: string
          purpose: string
          status?: string
        }
        Update: {
          created_at?: string
          desktop_user_id?: string
          expires_at?: string
          file_path?: string | null
          id?: string
          purpose?: string
          status?: string
        }
        Relationships: []
      }
      kyc_profiles: {
        Row: {
          created_at: string | null
          id_back_path: string | null
          id_doc_path: string | null
          id_front_path: string | null
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_path: string | null
          status: Database["public"]["Enums"]["kyc_status"]
          submitted_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id_back_path?: string | null
          id_doc_path?: string | null
          id_front_path?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id_back_path?: string | null
          id_doc_path?: string | null
          id_front_path?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lease_agreements: {
        Row: {
          audit_trail: Json | null
          created_at: string | null
          html_content: string | null
          id: string
          immutable: boolean | null
          landlord_id: string
          landlord_signature_data: Json | null
          landlord_signed_at: string | null
          lease_data: Json
          pdf_path: string | null
          pdf_url: string | null
          property_id: string
          status: string
          tenant_id: string | null
          tenant_signature_data: Json | null
          tenant_signed_at: string | null
          updated_at: string | null
        }
        Insert: {
          audit_trail?: Json | null
          created_at?: string | null
          html_content?: string | null
          id?: string
          immutable?: boolean | null
          landlord_id: string
          landlord_signature_data?: Json | null
          landlord_signed_at?: string | null
          lease_data: Json
          pdf_path?: string | null
          pdf_url?: string | null
          property_id: string
          status?: string
          tenant_id?: string | null
          tenant_signature_data?: Json | null
          tenant_signed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          audit_trail?: Json | null
          created_at?: string | null
          html_content?: string | null
          id?: string
          immutable?: boolean | null
          landlord_id?: string
          landlord_signature_data?: Json | null
          landlord_signed_at?: string | null
          lease_data?: Json
          pdf_path?: string | null
          pdf_url?: string | null
          property_id?: string
          status?: string
          tenant_id?: string | null
          tenant_signature_data?: Json | null
          tenant_signed_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lease_audit_logs: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string | null
          id: string
          lease_id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string | null
          id?: string
          lease_id: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string | null
          id?: string
          lease_id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lease_audit_logs_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_contracts: {
        Row: {
          audit_trail: Json
          contract_data: Json
          created_at: string
          encryption_key_id: string | null
          expires_at: string | null
          id: string
          landlord_id: string
          landlord_signature_data: Json | null
          landlord_signed_at: string | null
          pdf_hash: string | null
          pdf_url: string | null
          property_id: string | null
          search_vector: unknown | null
          status: string
          tenant_id: string | null
          tenant_signature_data: Json | null
          tenant_signed_at: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          audit_trail?: Json
          contract_data?: Json
          created_at?: string
          encryption_key_id?: string | null
          expires_at?: string | null
          id?: string
          landlord_id: string
          landlord_signature_data?: Json | null
          landlord_signed_at?: string | null
          pdf_hash?: string | null
          pdf_url?: string | null
          property_id?: string | null
          search_vector?: unknown | null
          status?: string
          tenant_id?: string | null
          tenant_signature_data?: Json | null
          tenant_signed_at?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Update: {
          audit_trail?: Json
          contract_data?: Json
          created_at?: string
          encryption_key_id?: string | null
          expires_at?: string | null
          id?: string
          landlord_id?: string
          landlord_signature_data?: Json | null
          landlord_signed_at?: string | null
          pdf_hash?: string | null
          pdf_url?: string | null
          property_id?: string | null
          search_vector?: unknown | null
          status?: string
          tenant_id?: string | null
          tenant_signature_data?: Json | null
          tenant_signed_at?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "lease_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_signatures: {
        Row: {
          created_at: string | null
          id: string
          ip_address: unknown | null
          lease_id: string
          metadata: Json | null
          otp_verified: boolean | null
          pdf_hash: string | null
          signature_data: Json | null
          signature_image_url: string | null
          signature_type: string
          signed_at: string | null
          signer_id: string
          signer_role: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          lease_id: string
          metadata?: Json | null
          otp_verified?: boolean | null
          pdf_hash?: string | null
          signature_data?: Json | null
          signature_image_url?: string | null
          signature_type: string
          signed_at?: string | null
          signer_id: string
          signer_role: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          lease_id?: string
          metadata?: Json | null
          otp_verified?: boolean | null
          pdf_hash?: string | null
          signature_data?: Json | null
          signature_image_url?: string | null
          signature_type?: string
          signed_at?: string | null
          signer_id?: string
          signer_role?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lease_signatures_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "lease_agreements"
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
      leases: {
        Row: {
          created_at: string | null
          id: string
          landlord_user_id: string
          lease_data: Json
          pdf_draft_url: string | null
          pdf_signed_url: string | null
          property_id: string
          status: string
          tenant_user_id: string | null
          updated_at: string | null
          version: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          landlord_user_id: string
          lease_data: Json
          pdf_draft_url?: string | null
          pdf_signed_url?: string | null
          property_id: string
          status: string
          tenant_user_id?: string | null
          updated_at?: string | null
          version?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          landlord_user_id?: string
          lease_data?: Json
          pdf_draft_url?: string | null
          pdf_signed_url?: string | null
          property_id?: string
          status?: string
          tenant_user_id?: string | null
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_messages: {
        Row: {
          attachments: string[] | null
          body: string
          created_at: string
          id: string
          maintenance_request_id: string
          read_at: string | null
          recipient_user_id: string
          sender_role: string
          sender_user_id: string
          updated_at: string
        }
        Insert: {
          attachments?: string[] | null
          body: string
          created_at?: string
          id?: string
          maintenance_request_id: string
          read_at?: string | null
          recipient_user_id: string
          sender_role: string
          sender_user_id: string
          updated_at?: string
        }
        Update: {
          attachments?: string[] | null
          body?: string
          created_at?: string
          id?: string
          maintenance_request_id?: string
          read_at?: string | null
          recipient_user_id?: string
          sender_role?: string
          sender_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_messages_maintenance_request_id_fkey"
            columns: ["maintenance_request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
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
      maintenance_tickets: {
        Row: {
          actual_cost: number | null
          category: string | null
          contractor_contact: string | null
          contractor_name: string | null
          created_at: string | null
          description: string
          estimated_cost: number | null
          id: string
          landlord_id: string
          media: Json | null
          property_id: string
          sla_hours: number | null
          status: string | null
          tenant_id: string
          title: string
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          actual_cost?: number | null
          category?: string | null
          contractor_contact?: string | null
          contractor_name?: string | null
          created_at?: string | null
          description: string
          estimated_cost?: number | null
          id?: string
          landlord_id: string
          media?: Json | null
          property_id: string
          sla_hours?: number | null
          status?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          actual_cost?: number | null
          category?: string | null
          contractor_contact?: string | null
          contractor_name?: string | null
          created_at?: string | null
          description?: string
          estimated_cost?: number | null
          id?: string
          landlord_id?: string
          media?: Json | null
          property_id?: string
          sla_hours?: number | null
          status?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tickets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
          viewing_proposal_id: string | null
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
          viewing_proposal_id?: string | null
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
          viewing_proposal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_viewing_proposal_id_fkey"
            columns: ["viewing_proposal_id"]
            isOneToOne: false
            referencedRelation: "viewing_proposals"
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
      offers: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          landlord_id: string
          listing_id: string
          status: string | null
          tenant_id: string
          terms_json: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          landlord_id: string
          listing_id: string
          status?: string | null
          tenant_id: string
          terms_json: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          landlord_id?: string
          listing_id?: string
          status?: string | null
          tenant_id?: string
          terms_json?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
      signature_audit: {
        Row: {
          consent_method: string
          created_at: string
          document_hash: string
          geolocation: Json | null
          id: string
          ip_address: unknown | null
          lease_contract_id: string
          signature_hash: string
          signer_id: string
          signer_role: string
          timestamp: string
          user_agent: string | null
          verification_data: Json | null
        }
        Insert: {
          consent_method?: string
          created_at?: string
          document_hash: string
          geolocation?: Json | null
          id?: string
          ip_address?: unknown | null
          lease_contract_id: string
          signature_hash: string
          signer_id: string
          signer_role: string
          timestamp?: string
          user_agent?: string | null
          verification_data?: Json | null
        }
        Update: {
          consent_method?: string
          created_at?: string
          document_hash?: string
          geolocation?: Json | null
          id?: string
          ip_address?: unknown | null
          lease_contract_id?: string
          signature_hash?: string
          signer_id?: string
          signer_role?: string
          timestamp?: string
          user_agent?: string | null
          verification_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_audit_lease_contract_id_fkey"
            columns: ["lease_contract_id"]
            isOneToOne: false
            referencedRelation: "lease_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          message: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          status?: string
          subject?: string
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
          envelope_id: string | null
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
          signing_provider: string | null
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
          envelope_id?: string | null
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
          signing_provider?: string | null
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
          envelope_id?: string | null
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
          signing_provider?: string | null
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
      viewing_proposals: {
        Row: {
          cancelled_at: string | null
          confirmed_at: string | null
          conversation_id: string
          created_at: string
          created_by: string
          duration_minutes: number
          id: string
          landlord_id: string
          notes: string | null
          property_id: string
          start_at: string
          status: Database["public"]["Enums"]["viewing_proposal_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          confirmed_at?: string | null
          conversation_id: string
          created_at?: string
          created_by: string
          duration_minutes?: number
          id?: string
          landlord_id: string
          notes?: string | null
          property_id: string
          start_at: string
          status?: Database["public"]["Enums"]["viewing_proposal_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          confirmed_at?: string | null
          conversation_id?: string
          created_at?: string
          created_by?: string
          duration_minutes?: number
          id?: string
          landlord_id?: string
          notes?: string | null
          property_id?: string
          start_at?: string
          status?: Database["public"]["Enums"]["viewing_proposal_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewing_proposals_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewing_proposals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      viewing_reminders: {
        Row: {
          attempts: number
          created_at: string
          fire_at: string
          id: number
          kind: string
          sent_at: string | null
          viewing_proposal_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          fire_at: string
          id?: number
          kind: string
          sent_at?: string | null
          viewing_proposal_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          fire_at?: string
          id?: number
          kind?: string
          sent_at?: string | null
          viewing_proposal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewing_reminders_viewing_proposal_id_fkey"
            columns: ["viewing_proposal_id"]
            isOneToOne: false
            referencedRelation: "viewing_proposals"
            referencedColumns: ["id"]
          },
        ]
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
      workflow_runs: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          meta: Json | null
          step: string
          workflow_name: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          meta?: Json | null
          step: string
          workflow_name: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          meta?: Json | null
          step?: string
          workflow_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_lease_audit_entry: {
        Args: {
          action: string
          actor_id: string
          contract_id: string
          details?: Json
        }
        Returns: undefined
      }
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
      check_user_gate_status: {
        Args: { _user_id: string }
        Returns: {
          can_request_viewing: boolean
          email_verified: boolean
          kyc_status: string
          user_id: string
        }[]
      }
      create_admin_account: {
        Args: { display_name_param: string; email_param: string }
        Returns: Json
      }
      create_kyc_audit_log: {
        Args: {
          _action: string
          _actor?: string
          _metadata?: Json
          _user_id: string
        }
        Returns: undefined
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
      insert_lease_agreement: {
        Args: {
          p_html_content?: string
          p_landlord_id: string
          p_lease_data?: Json
          p_pdf_path?: string
          p_pdf_url?: string
          p_property_id: string
          p_tenant_id?: string
        }
        Returns: {
          created_at: string
          html_content: string
          id: string
          landlord_id: string
          lease_data: Json
          pdf_path: string
          pdf_url: string
          property_id: string
          status: string
          tenant_id: string
          updated_at: string
        }[]
      }
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      log_event: {
        Args: { _name: string; _properties?: Json; _user_id: string }
        Returns: undefined
      }
      mark_messages_as_read: {
        Args: { conversation_uuid: string; user_role: string }
        Returns: undefined
      }
      promote_to_landlord: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_lease_status: {
        Args: { p_lease_id: string; p_status: string }
        Returns: boolean
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
      kyc_status: "not_started" | "submitted" | "approved" | "declined"
      user_role: "tenant" | "landlord" | "admin"
      viewing_proposal_status:
        | "proposed"
        | "confirmed"
        | "declined"
        | "cancelled"
        | "expired"
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
      kyc_status: ["not_started", "submitted", "approved", "declined"],
      user_role: ["tenant", "landlord", "admin"],
      viewing_proposal_status: [
        "proposed",
        "confirmed",
        "declined",
        "cancelled",
        "expired",
      ],
    },
  },
} as const
