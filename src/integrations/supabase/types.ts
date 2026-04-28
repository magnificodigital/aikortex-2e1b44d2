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
      agency_clients: {
        Row: {
          agency_id: string
          asaas_customer_id: string | null
          client_document: string | null
          client_email: string | null
          client_logo_url: string | null
          client_name: string
          client_phone: string | null
          client_primary_color: string | null
          client_user_id: string | null
          created_at: string | null
          id: string
          platform_subscription_id: string | null
          platform_subscription_status: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          asaas_customer_id?: string | null
          client_document?: string | null
          client_email?: string | null
          client_logo_url?: string | null
          client_name: string
          client_phone?: string | null
          client_primary_color?: string | null
          client_user_id?: string | null
          created_at?: string | null
          id?: string
          platform_subscription_id?: string | null
          platform_subscription_status?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          asaas_customer_id?: string | null
          client_document?: string | null
          client_email?: string | null
          client_logo_url?: string | null
          client_name?: string
          client_phone?: string | null
          client_primary_color?: string | null
          client_user_id?: string | null
          created_at?: string | null
          id?: string
          platform_subscription_id?: string | null
          platform_subscription_status?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_profiles: {
        Row: {
          active_clients_count: number | null
          agency_name: string | null
          asaas_api_key: string | null
          asaas_wallet_id: string | null
          created_at: string | null
          custom_pricing: Json | null
          id: string
          logo_url: string | null
          platform_fee_monthly: number | null
          tier: string
          tier_manually_overridden: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_clients_count?: number | null
          agency_name?: string | null
          asaas_api_key?: string | null
          asaas_wallet_id?: string | null
          created_at?: string | null
          custom_pricing?: Json | null
          id?: string
          logo_url?: string | null
          platform_fee_monthly?: number | null
          tier?: string
          tier_manually_overridden?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_clients_count?: number | null
          agency_name?: string | null
          asaas_api_key?: string | null
          asaas_wallet_id?: string | null
          created_at?: string | null
          custom_pricing?: Json | null
          id?: string
          logo_url?: string | null
          platform_fee_monthly?: number | null
          tier?: string
          tier_manually_overridden?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agency_wallets: {
        Row: {
          balance: number
          created_at: string | null
          id: string
          low_balance_alert: number
          total_consumed: number
          total_purchased: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          id?: string
          low_balance_alert?: number
          total_consumed?: number
          total_purchased?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          id?: string
          low_balance_alert?: number
          total_consumed?: number
          total_purchased?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_memory_stores: {
        Row: {
          agent_id: string
          anthropic_memory_store_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          anthropic_memory_store_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          anthropic_memory_store_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_stores_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "user_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_sessions: {
        Row: {
          agent_id: string | null
          anthropic_session_id: string | null
          channel: string
          contact_identifier: string | null
          created_at: string | null
          id: string
          last_message_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          anthropic_session_id?: string | null
          channel?: string
          contact_identifier?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          anthropic_session_id?: string | null
          channel?: string
          contact_identifier?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "user_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          agency_amount: number | null
          agency_id: string | null
          amount: number | null
          asaas_payment_id: string | null
          client_id: string | null
          created_at: string | null
          description: string | null
          event_type: string
          id: string
          platform_amount: number | null
          subscription_id: string | null
        }
        Insert: {
          agency_amount?: number | null
          agency_id?: string | null
          amount?: number | null
          asaas_payment_id?: string | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          event_type: string
          id?: string
          platform_amount?: number | null
          subscription_id?: string | null
        }
        Update: {
          agency_amount?: number | null
          agency_id?: string | null
          amount?: number | null
          asaas_payment_id?: string | null
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          event_type?: string
          id?: string
          platform_amount?: number | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "agency_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "client_template_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_logs: {
        Row: {
          agent_id: string | null
          broadcast_name: string | null
          channel: string | null
          completed_at: string | null
          created_at: string | null
          failed: number | null
          id: string
          sent: number | null
          started_at: string | null
          status: string | null
          total_contacts: number | null
          use_ai: boolean | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          broadcast_name?: string | null
          channel?: string | null
          completed_at?: string | null
          created_at?: string | null
          failed?: number | null
          id?: string
          sent?: number | null
          started_at?: string | null
          status?: string | null
          total_contacts?: number | null
          use_ai?: boolean | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          broadcast_name?: string | null
          channel?: string | null
          completed_at?: string | null
          created_at?: string | null
          failed?: number | null
          id?: string
          sent?: number | null
          started_at?: string | null
          status?: string | null
          total_contacts?: number | null
          use_ai?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          agent_id: string | null
          channel: string
          created_at: string | null
          direction: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          phone_from: string | null
          phone_to: string | null
          recording_url: string | null
          started_at: string | null
          status: string | null
          telnyx_call_id: string | null
          transcript: Json | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          channel?: string
          created_at?: string | null
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          phone_from?: string | null
          phone_to?: string | null
          recording_url?: string | null
          started_at?: string | null
          status?: string | null
          telnyx_call_id?: string | null
          transcript?: Json | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          channel?: string
          created_at?: string | null
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          phone_from?: string | null
          phone_to?: string | null
          recording_url?: string | null
          started_at?: string | null
          status?: string | null
          telnyx_call_id?: string | null
          transcript?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "user_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          agent_id: string | null
          call_control_id: string
          created_at: string | null
          id: string
          messages: Json | null
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          call_control_id: string
          created_at?: string | null
          id?: string
          messages?: Json | null
          user_id: string
        }
        Update: {
          agent_id?: string | null
          call_control_id?: string
          created_at?: string | null
          id?: string
          messages?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "user_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      client_template_subscriptions: {
        Row: {
          activated_at: string | null
          activated_channel: string | null
          agency_id: string
          agency_price_monthly: number
          agency_profit_monthly: number | null
          agent_id: string | null
          asaas_subscription_id: string | null
          asaas_subscription_status: string | null
          client_id: string
          created_at: string | null
          id: string
          is_activated: boolean | null
          platform_price_monthly: number
          status: string | null
          template_id: string
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          activated_channel?: string | null
          agency_id: string
          agency_price_monthly: number
          agency_profit_monthly?: number | null
          agent_id?: string | null
          asaas_subscription_id?: string | null
          asaas_subscription_status?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          is_activated?: boolean | null
          platform_price_monthly: number
          status?: string | null
          template_id: string
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          activated_channel?: string | null
          agency_id?: string
          agency_price_monthly?: number
          agency_profit_monthly?: number | null
          agent_id?: string | null
          asaas_subscription_id?: string | null
          asaas_subscription_status?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          is_activated?: boolean | null
          platform_price_monthly?: number
          status?: string | null
          template_id?: string
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_template_subscriptions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agency_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_template_subscriptions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "user_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_template_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "agency_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_template_subscriptions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "platform_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_packages: {
        Row: {
          created_at: string | null
          credits: number
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          price_brl: number
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          credits: number
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          price_brl: number
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          credits?: number
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          price_brl?: number
          sort_order?: number | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          description: string | null
          id: string
          model: string | null
          payment_id: string | null
          provider: string | null
          session_id: string | null
          tokens_input: number | null
          tokens_output: number | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          description?: string | null
          id?: string
          model?: string | null
          payment_id?: string | null
          provider?: string | null
          session_id?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          description?: string | null
          id?: string
          model?: string | null
          payment_id?: string | null
          provider?: string | null
          session_id?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      flow_executions: {
        Row: {
          completed_at: string | null
          context: Json | null
          created_at: string | null
          current_node_id: string | null
          error_message: string | null
          flow_id: string
          flow_name: string | null
          id: string
          started_at: string | null
          status: string
          trigger_data: Json | null
          trigger_type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          context?: Json | null
          created_at?: string | null
          current_node_id?: string | null
          error_message?: string | null
          flow_id: string
          flow_name?: string | null
          id?: string
          started_at?: string | null
          status?: string
          trigger_data?: Json | null
          trigger_type?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          context?: Json | null
          created_at?: string | null
          current_node_id?: string | null
          error_message?: string | null
          flow_id?: string
          flow_name?: string | null
          id?: string
          started_at?: string | null
          status?: string
          trigger_data?: Json | null
          trigger_type?: string
          user_id?: string
        }
        Relationships: []
      }
      flow_node_logs: {
        Row: {
          agent_session_id: string | null
          completed_at: string | null
          error_message: string | null
          execution_id: string
          id: string
          input: Json | null
          node_id: string
          node_label: string | null
          node_type: string
          output: Json | null
          started_at: string | null
          status: string
        }
        Insert: {
          agent_session_id?: string | null
          completed_at?: string | null
          error_message?: string | null
          execution_id: string
          id?: string
          input?: Json | null
          node_id: string
          node_label?: string | null
          node_type: string
          output?: Json | null
          started_at?: string | null
          status?: string
        }
        Update: {
          agent_session_id?: string | null
          completed_at?: string | null
          error_message?: string | null
          execution_id?: string
          id?: string
          input?: Json | null
          node_id?: string
          node_label?: string | null
          node_type?: string
          output?: Json | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_node_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "flow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          article_type: string
          category: string
          collection: string
          content: string
          created_at: string
          created_by: string | null
          description: string
          icon_name: string
          id: string
          is_active: boolean
          read_time: string
          sort_order: number
          title: string
          updated_at: string
          updated_by: string | null
          video_url: string | null
        }
        Insert: {
          article_type?: string
          category?: string
          collection?: string
          content?: string
          created_at?: string
          created_by?: string | null
          description?: string
          icon_name?: string
          id?: string
          is_active?: boolean
          read_time?: string
          sort_order?: number
          title: string
          updated_at?: string
          updated_by?: string | null
          video_url?: string | null
        }
        Update: {
          article_type?: string
          category?: string
          collection?: string
          content?: string
          created_at?: string
          created_by?: string | null
          description?: string
          icon_name?: string
          id?: string
          is_active?: boolean
          read_time?: string
          sort_order?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          description: string | null
          due_date: string | null
          id: string
          paid_at: string | null
          payment_id: string | null
          payment_provider: string | null
          status: string | null
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          paid_at?: string | null
          payment_id?: string | null
          payment_provider?: string | null
          status?: string | null
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          paid_at?: string | null
          payment_id?: string | null
          payment_provider?: string | null
          status?: string | null
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          activities: Json
          agent_id: string | null
          assignee: string
          company: string
          created_at: string
          email: string
          id: string
          lost_reason: string | null
          name: string
          notes: string
          phone: string
          position: string
          source: string
          stage: string
          tags: string[]
          temperature: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          activities?: Json
          agent_id?: string | null
          assignee?: string
          company?: string
          created_at?: string
          email?: string
          id?: string
          lost_reason?: string | null
          name: string
          notes?: string
          phone?: string
          position?: string
          source?: string
          stage?: string
          tags?: string[]
          temperature?: string
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          activities?: Json
          agent_id?: string | null
          assignee?: string
          company?: string
          created_at?: string
          email?: string
          id?: string
          lost_reason?: string | null
          name?: string
          notes?: string
          phone?: string
          position?: string
          source?: string
          stage?: string
          tags?: string[]
          temperature?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      meeting_messages: {
        Row: {
          content: string
          created_at: string
          display_name: string
          id: string
          meeting_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          display_name: string
          id?: string
          meeting_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          display_name?: string
          id?: string
          meeting_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_messages_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          created_at: string
          display_name: string
          id: string
          joined_at: string | null
          left_at: string | null
          meeting_id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          meeting_id: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          meeting_id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_waiting_room: {
        Row: {
          created_at: string
          display_name: string
          guest_id: string
          id: string
          meeting_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          guest_id: string
          id?: string
          meeting_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          guest_id?: string
          id?: string
          meeting_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_waiting_room_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string
          ended_at: string | null
          host_user_id: string
          id: string
          room_id: string
          settings: Json
          started_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          host_user_id: string
          id?: string
          room_id?: string
          settings?: Json
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          host_user_id?: string
          id?: string
          room_id?: string
          settings?: Json
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      monthly_usage: {
        Row: {
          created_at: string | null
          id: string
          message_count: number
          updated_at: string | null
          user_id: string
          year_month: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_count?: number
          updated_at?: string | null
          user_id: string
          year_month: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_count?: number
          updated_at?: string | null
          user_id?: string
          year_month?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_tiers: {
        Row: {
          certifications_earned: number | null
          clients_served: number | null
          created_at: string | null
          id: string
          notes: string | null
          revenue: number | null
          solutions_published: number | null
          tier: string
          tier_upgraded_at: string | null
          tier_upgraded_by: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          certifications_earned?: number | null
          clients_served?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          revenue?: number | null
          solutions_published?: number | null
          tier?: string
          tier_upgraded_at?: string | null
          tier_upgraded_by?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          certifications_earned?: number | null
          clients_served?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          revenue?: number | null
          solutions_published?: number | null
          tier?: string
          tier_upgraded_at?: string | null
          tier_upgraded_by?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      plan_message_limits: {
        Row: {
          monthly_limit: number
          plan_slug: string
        }
        Insert: {
          monthly_limit?: number
          plan_slug: string
        }
        Update: {
          monthly_limit?: number
          plan_slug?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string | null
          currency: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          limits: Json | null
          name: string
          price_monthly: number
          price_yearly: number
          slug: string
          trial_days: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          limits?: Json | null
          name: string
          price_monthly?: number
          price_yearly?: number
          slug: string
          trial_days?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          limits?: Json | null
          name?: string
          price_monthly?: number
          price_yearly?: number
          slug?: string
          trial_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_config: {
        Row: {
          description: string | null
          id: string
          is_secret: boolean | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          is_secret?: boolean | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          is_secret?: boolean | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      platform_templates: {
        Row: {
          category: string
          created_at: string | null
          demo_url: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_exclusive: boolean | null
          min_tier: string
          name: string
          platform_price_monthly: number
          slug: string
          sort_order: number | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          demo_url?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_exclusive?: boolean | null
          min_tier?: string
          name: string
          platform_price_monthly: number
          slug: string
          sort_order?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          demo_url?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_exclusive?: boolean | null
          min_tier?: string
          name?: string
          platform_price_monthly?: number
          slug?: string
          sort_order?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          role: string
          tenant_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: string
          tenant_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: string
          tenant_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          payment_provider: string | null
          payment_subscription_id: string | null
          plan_id: string
          status: string
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_cycle?: string
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          payment_provider?: string | null
          payment_subscription_id?: string | null
          plan_id: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_cycle?: string
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          payment_provider?: string | null
          payment_subscription_id?: string | null
          plan_id?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_replied_at: string | null
          admin_replied_by: string | null
          admin_reply: string | null
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
          admin_replied_at?: string | null
          admin_replied_by?: string | null
          admin_reply?: string | null
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
          admin_replied_at?: string | null
          admin_replied_by?: string | null
          admin_reply?: string | null
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
      tier_module_access: {
        Row: {
          has_access: boolean
          id: string
          module_key: string
          sub_features: Json
          tier: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          has_access?: boolean
          id?: string
          module_key: string
          sub_features?: Json
          tier: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          has_access?: boolean
          id?: string
          module_key?: string
          sub_features?: Json
          tier?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      user_agents: {
        Row: {
          agent_type: string
          anthropic_agent_id: string | null
          anthropic_agent_version: number | null
          avatar_url: string | null
          call_webhook_url: string | null
          config: Json
          created_at: string
          description: string | null
          id: string
          max_call_duration_seconds: number | null
          model: string | null
          name: string
          provider: string
          status: string
          telnyx_phone_number: string | null
          updated_at: string
          use_managed_sessions: boolean
          user_id: string
          voice_id: string | null
          voice_language: string | null
          voice_provider: string | null
          voice_similarity: number | null
          voice_stability: number | null
        }
        Insert: {
          agent_type?: string
          anthropic_agent_id?: string | null
          anthropic_agent_version?: number | null
          avatar_url?: string | null
          call_webhook_url?: string | null
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          max_call_duration_seconds?: number | null
          model?: string | null
          name: string
          provider?: string
          status?: string
          telnyx_phone_number?: string | null
          updated_at?: string
          use_managed_sessions?: boolean
          user_id: string
          voice_id?: string | null
          voice_language?: string | null
          voice_provider?: string | null
          voice_similarity?: number | null
          voice_stability?: number | null
        }
        Update: {
          agent_type?: string
          anthropic_agent_id?: string | null
          anthropic_agent_version?: number | null
          avatar_url?: string | null
          call_webhook_url?: string | null
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          max_call_duration_seconds?: number | null
          model?: string | null
          name?: string
          provider?: string
          status?: string
          telnyx_phone_number?: string | null
          updated_at?: string
          use_managed_sessions?: boolean
          user_id?: string
          voice_id?: string | null
          voice_language?: string | null
          voice_provider?: string | null
          voice_similarity?: number | null
          voice_stability?: number | null
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_apps: {
        Row: {
          channel: string
          config: Json
          created_at: string
          description: string | null
          files: Json
          id: string
          name: string
          status: string
          tables_schema: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string
          config?: Json
          created_at?: string
          description?: string | null
          files?: Json
          id?: string
          name?: string
          status?: string
          tables_schema?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          config?: Json
          created_at?: string
          description?: string | null
          files?: Json
          id?: string
          name?: string
          status?: string
          tables_schema?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_flows: {
        Row: {
          created_at: string | null
          description: string | null
          edges: Json
          id: string
          is_active: boolean | null
          name: string
          nodes: Json
          trigger_config: Json | null
          trigger_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          edges?: Json
          id?: string
          is_active?: boolean | null
          name: string
          nodes?: Json
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          edges?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          nodes?: Json
          trigger_config?: Json | null
          trigger_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          app_id: string | null
          contact_name: string | null
          content: string
          created_at: string
          direction: string
          from_number: string
          id: string
          message_type: string
          phone_number_id: string | null
          raw_payload: Json | null
          status: string
          timestamp: string | null
          to_number: string | null
          user_id: string | null
          wamid: string | null
        }
        Insert: {
          app_id?: string | null
          contact_name?: string | null
          content?: string
          created_at?: string
          direction?: string
          from_number: string
          id?: string
          message_type?: string
          phone_number_id?: string | null
          raw_payload?: Json | null
          status?: string
          timestamp?: string | null
          to_number?: string | null
          user_id?: string | null
          wamid?: string | null
        }
        Update: {
          app_id?: string | null
          contact_name?: string | null
          content?: string
          created_at?: string
          direction?: string
          from_number?: string
          id?: string
          message_type?: string
          phone_number_id?: string | null
          raw_payload?: Json | null
          status?: string
          timestamp?: string | null
          to_number?: string | null
          user_id?: string | null
          wamid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "user_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string | null
          department: string | null
          id: string
          job_title: string | null
          member_user_id: string
          role: string
          status: string
          updated_at: string | null
          workspace_owner_id: string
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          id?: string
          job_title?: string | null
          member_user_id: string
          role?: string
          status?: string
          updated_at?: string | null
          workspace_owner_id: string
        }
        Update: {
          created_at?: string | null
          department?: string | null
          id?: string
          job_title?: string | null
          member_user_id?: string
          role?: string
          status?: string
          updated_at?: string | null
          workspace_owner_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_to_wallet_consumed: {
        Args: { consumed: number; user_uuid: string }
        Returns: undefined
      }
      increment_monthly_usage: {
        Args: { p_user_id: string; p_year_month: string }
        Returns: undefined
      }
      is_platform_user: { Args: { check_user_id: string }; Returns: boolean }
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
