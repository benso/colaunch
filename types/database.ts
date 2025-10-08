export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      invitations: {
        Row: {
          id: string;
          inviter_id: string;
          invitee_email: string;
          match_id: string | null;
          status: string | null;
          sent_at: string | null;
          opened_at: string | null;
          joined_at: string | null;
          joined_user_id: string | null;
        };
        Insert: {
          id?: string;
          inviter_id: string;
          invitee_email: string;
          match_id?: string | null;
          status?: string | null;
          sent_at?: string | null;
          opened_at?: string | null;
          joined_at?: string | null;
          joined_user_id?: string | null;
        };
        Update: {
          id?: string;
          inviter_id?: string;
          invitee_email?: string;
          match_id?: string | null;
          status?: string | null;
          sent_at?: string | null;
          opened_at?: string | null;
          joined_at?: string | null;
          joined_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_inviter_id_fkey";
            columns: ["inviter_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_joined_user_id_fkey";
            columns: ["joined_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          }
        ];
      };
      matches: {
        Row: {
          id: string;
          user_id: string | null;
          partner_id: string | null;
          match_score: number | null;
          match_reasons: Json | null;
          status: string | null;
          created_at: string | null;
          last_interaction: string | null;
          contacted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          partner_id?: string | null;
          match_score?: number | null;
          match_reasons?: Json | null;
          status?: string | null;
          created_at?: string | null;
          last_interaction?: string | null;
          contacted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          partner_id?: string | null;
          match_score?: number | null;
          match_reasons?: Json | null;
          status?: string | null;
          created_at?: string | null;
          last_interaction?: string | null;
          contacted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "matches_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      messages: {
        Row: {
          id: string;
          match_id: string | null;
          sender_id: string | null;
          recipient_id: string | null;
          content: string;
          is_ai_generated: boolean | null;
          sent_at: string | null;
          read_at: string | null;
          edited_at: string | null;
        };
        Insert: {
          id?: string;
          match_id?: string | null;
          sender_id?: string | null;
          recipient_id?: string | null;
          content: string;
          is_ai_generated?: boolean | null;
          sent_at?: string | null;
          read_at?: string | null;
          edited_at?: string | null;
        };
        Update: {
          id?: string;
          match_id?: string | null;
          sender_id?: string | null;
          recipient_id?: string | null;
          content?: string;
          is_ai_generated?: boolean | null;
          sent_at?: string | null;
          read_at?: string | null;
          edited_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      partnerships: {
        Row: {
          id: string;
          match_id: string | null;
          user_a: string | null;
          user_b: string | null;
          partnership_type: string | null;
          status: string | null;
          start_date: string | null;
          end_date: string | null;
          terms: Json | null;
          metrics: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          match_id?: string | null;
          user_a?: string | null;
          user_b?: string | null;
          partnership_type?: string | null;
          status?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          terms?: Json | null;
          metrics?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          match_id?: string | null;
          user_a?: string | null;
          user_b?: string | null;
          partnership_type?: string | null;
          status?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          terms?: Json | null;
          metrics?: Json | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "partnerships_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partnerships_user_a_fkey";
            columns: ["user_a"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partnerships_user_b_fkey";
            columns: ["user_b"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          id: string;
          user_id: string | null;
          product_type: string;
          product_name: string;
          product_description: string;
          website_url: string | null;
          audience_size: string;
      partner_types: string[];
          industry_tags: string[];
          what_i_offer: string[];
          what_i_want: string[];
          bio: string | null;
          social_links: Json | null;
          embedding_id: string | null;
          ai_analysis: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          product_type: string;
          product_name: string;
          product_description: string;
          website_url?: string | null;
          audience_size: string;
      partner_types?: string[];
          industry_tags?: string[];
          what_i_offer?: string[];
          what_i_want?: string[];
          bio?: string | null;
          social_links?: Json | null;
          embedding_id?: string | null;
          ai_analysis?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          product_type?: string;
          product_name?: string;
          product_description?: string;
          website_url?: string | null;
          audience_size?: string;
      partner_types?: string[];
          industry_tags?: string[];
          what_i_offer?: string[];
          what_i_want?: string[];
          bio?: string | null;
          social_links?: Json | null;
          embedding_id?: string | null;
          ai_analysis?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          created_at: string | null;
          onboarding_completed: boolean | null;
          referral_code: string | null;
          referred_by: string | null;
          subscription_tier: string | null;
          is_verified: boolean | null;
          referral_count: number | null;
          last_active_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          onboarding_completed?: boolean | null;
          referral_code?: string | null;
          referred_by?: string | null;
          subscription_tier?: string | null;
          is_verified?: boolean | null;
          referral_count?: number | null;
          last_active_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          onboarding_completed?: boolean | null;
          referral_code?: string | null;
          referred_by?: string | null;
          subscription_tier?: string | null;
          is_verified?: boolean | null;
          referral_count?: number | null;
          last_active_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "users_referred_by_fkey";
            columns: ["referred_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
